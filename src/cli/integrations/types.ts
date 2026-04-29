export type Integration = {
  name: string;
  configPath: () => string | null;
  buildEntry: () => Record<string, unknown>;
};

export const defaultMcpEntry = (): Record<string, unknown> => ({
  command: 'npx',
  args: ['-y', '@yasuakiomokawa/oura-mcp'],
});
