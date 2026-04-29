export type Integration = {
  name: string;
  configPath: () => string | null;
  buildEntry: () => Record<string, unknown>;
};
