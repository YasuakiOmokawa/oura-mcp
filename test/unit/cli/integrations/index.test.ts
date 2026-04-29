import { describe, expect, it } from 'vitest';
import { claudeCodeProject, claudeCodeUser } from '../../../../src/cli/integrations/claude-code.js';
import { claudeDesktop } from '../../../../src/cli/integrations/claude-desktop.js';
import { cursorProject, cursorUser } from '../../../../src/cli/integrations/cursor.js';

describe('claudeDesktop integration', () => {
  it('returns null on Linux', () => {
    if (process.platform === 'linux') {
      expect(claudeDesktop.configPath()).toBeNull();
    }
  });

  it('buildEntry returns npx invocation for the scoped package', () => {
    expect(claudeDesktop.buildEntry()).toEqual({
      command: 'npx',
      args: ['-y', '@yasuakiomokawa/oura-mcp'],
    });
  });
});

describe('claudeCode integration', () => {
  it('user path is ~/.claude.json (not ~/.claude/settings.json)', () => {
    const p = claudeCodeUser.configPath();
    // Claude Code reads MCP servers from ~/.claude.json. settings.json is ignored for mcpServers.
    expect(p).toMatch(/[\\/]\.claude\.json$/);
    expect(p).not.toMatch(/\.claude[\\/]settings\.json$/);
  });

  it('project path is <cwd>/.mcp.json (the standard Claude Code project MCP file)', () => {
    const p = claudeCodeProject.configPath();
    expect(p).toMatch(/[\\/]\.mcp\.json$/);
    expect(p).not.toMatch(/\.claude[\\/]settings\.local\.json$/);
  });

  it('buildEntry returns npx invocation', () => {
    const expected = { command: 'npx', args: ['-y', '@yasuakiomokawa/oura-mcp'] };
    expect(claudeCodeUser.buildEntry()).toEqual(expected);
    expect(claudeCodeProject.buildEntry()).toEqual(expected);
  });
});

describe('cursor integration', () => {
  it('user path resolves under HOME', () => {
    const p = cursorUser.configPath();
    expect(p).toMatch(/\.cursor[\\/]mcp\.json$/);
  });

  it('project path resolves under cwd', () => {
    const p = cursorProject.configPath();
    expect(p).toMatch(/\.cursor[\\/]mcp\.json$/);
  });
});
