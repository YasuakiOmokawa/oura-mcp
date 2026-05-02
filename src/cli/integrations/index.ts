import { existsSync, constants as fsConstants } from 'node:fs';
import { access, copyFile, readFile } from 'node:fs/promises';
import prompts from 'prompts';
import { atomicWriteFile } from '../../utils/atomic-write.js';
import { log } from '../../utils/log.js';
import { claudeCodeProject, claudeCodeUser } from './claude-code.js';
import { claudeDesktop } from './claude-desktop.js';
import { cursorProject, cursorUser } from './cursor.js';
import type { Integration } from './types.js';

const ALL: Integration[] = [
  claudeDesktop,
  claudeCodeUser,
  claudeCodeProject,
  cursorUser,
  cursorProject,
];

export async function configureClients(): Promise<void> {
  const detected = ALL.map((i) => ({ integ: i, p: i.configPath() })).filter(
    (x): x is { integ: Integration; p: string } => x.p !== null && existsSync(x.p),
  );

  if (detected.length === 0) {
    console.error('\nNo supported MCP clients detected. Manual setup:');
    printManualInstructions();
    return;
  }

  console.error(`\nDetected ${detected.length} MCP client(s):`);
  for (const { integ, p } of detected) {
    const ans = await prompts({
      type: 'confirm',
      name: 'ok',
      initial: true,
      message: `Add oura-mcp to ${integ.name} (${p})?`,
    });
    if (!ans.ok) continue;
    await updateConfig(integ, p);
  }
}

async function updateConfig(integ: Integration, file: string): Promise<void> {
  // Pre-check write permission to avoid an EACCES crash mid-run
  const writable = await access(file, fsConstants.W_OK)
    .then(() => true)
    .catch(() => false);
  if (!writable) {
    console.error(`Skipping ${integ.name}: permission denied for ${file}. Update manually.`);
    return;
  }

  const raw = await readFile(file, 'utf-8');
  const parsed = await Promise.resolve()
    .then(() => JSON.parse(raw) as Record<string, unknown>)
    .catch(() => null);
  if (!parsed) {
    console.error(`Skipping ${integ.name}: invalid JSON or contains comments.`);
    return;
  }

  const mcpServers = (parsed.mcpServers as Record<string, unknown> | undefined) ?? {};
  if (mcpServers.oura) {
    const overwrite = await prompts({
      type: 'confirm',
      name: 'ok',
      message: '"oura" entry already exists. Overwrite?',
      initial: false,
    });
    if (!overwrite.ok) return;
  }
  const next = { ...parsed, mcpServers: { ...mcpServers, oura: integ.buildEntry() } };

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  await copyFile(file, `${file}.bak.${ts}`);

  return atomicWriteFile(file, JSON.stringify(next, null, 2))
    .then(() => log.info('integration.updated', { client: integ.name, file }))
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to update ${integ.name}: ${msg}`);
    });
}

function printManualInstructions(): void {
  console.error(`
Add the following to your MCP client config:

  mcpServers:
    oura:
      command: npx
      args: ["-y", "@yasuakiomokawa/oura-mcp"]

Skill (optional):
  npx skills add YasuakiOmokawa/oura-mcp
`);
}
