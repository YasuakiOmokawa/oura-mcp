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

  it('buildEntry returns { command: "oura-mcp" }', () => {
    expect(claudeDesktop.buildEntry()).toEqual({ command: 'oura-mcp' });
  });
});

describe('claudeCode integration', () => {
  it('user path resolves under HOME', () => {
    const p = claudeCodeUser.configPath();
    expect(p).toMatch(/\.claude[\\/]settings\.json$/);
  });

  it('project path resolves under cwd', () => {
    const p = claudeCodeProject.configPath();
    expect(p).toMatch(/\.claude[\\/]settings\.local\.json$/);
  });

  it('buildEntry returns oura-mcp command', () => {
    expect(claudeCodeUser.buildEntry()).toEqual({ command: 'oura-mcp' });
    expect(claudeCodeProject.buildEntry()).toEqual({ command: 'oura-mcp' });
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
