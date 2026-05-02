import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// From dist/constants.js, package.json is one level up
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as {
  version: string;
};

export const PACKAGE_VERSION = pkg.version;
export const PACKAGE_NAME = 'oura-mcp';

export const OURA_AUTHORIZATION_ENDPOINT = 'https://cloud.ouraring.com/oauth/authorize';
export const OURA_TOKEN_ENDPOINT = 'https://api.ouraring.com/oauth/token';
export const OURA_API_BASE = 'https://api.ouraring.com/v2';

// Phase 0 verification (2026-04-29):
//   - The new portal exposes 11 scopes (the old 9 + stress + heart_health)
//   - Order matches Oura's canonical order (tag → workout)
export const OURA_OAUTH_SCOPE =
  'email personal daily heartrate tag workout session spo2 ring_configuration stress heart_health';

export const DEFAULT_CALLBACK_PORT = 54321;
export const OURA_CALLBACK_PATH = '/callback';

// Oura allows HTTP redirect URIs only with `localhost`; `127.0.0.1` is rejected.
// We still bind to `127.0.0.1` as defense against DNS rebinding.
export const OURA_REDIRECT_HOST = 'localhost';
export const OURA_BIND_HOST = '127.0.0.1';

export const AUTH_TIMEOUT_MS = 5 * 60 * 1000;
export const HTTP_TIMEOUT_MS = 30_000;
export const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
export const CONFIG_FILE_PERMISSION = 0o600;

export const REPO_URL = 'https://github.com/YasuakiOmokawa/oura-mcp';
export const USER_AGENT = `${PACKAGE_NAME}/${PACKAGE_VERSION} (MCP Server; stdio; +${REPO_URL})`;
