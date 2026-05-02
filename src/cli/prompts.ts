import { input, number, password } from '@inquirer/prompts';
import { DEFAULT_CALLBACK_PORT } from '../constants.js';

export type Credentials = {
  clientId: string;
  clientSecret: string;
  callbackPort: number;
};

export async function collectCredentials(
  existing: Credentials | null = null,
): Promise<Credentials> {
  const hasExisting = existing !== null;

  if (hasExisting) {
    console.error('Existing config found.');
    console.error('  Press Enter to keep, or type a new value to change.\n');
  }

  const clientId = await input({
    message: 'Oura Client ID:',
    default: existing?.clientId,
    validate: (v) => v.length > 0 || 'required',
  });

  const secretInput = await password({
    message: hasExisting ? 'Oura Client Secret (Enter to keep current):' : 'Oura Client Secret:',
    // Allow empty input only when an existing value is present (keep-current mode)
    validate: (v) => (hasExisting && v.length === 0) || v.length > 0 || 'required',
  });

  const port = await number({
    message: 'Callback port:',
    default: existing?.callbackPort ?? DEFAULT_CALLBACK_PORT,
    min: 1024,
    max: 65535,
    required: true,
  });

  return {
    clientId,
    clientSecret: secretInput || (existing?.clientSecret ?? ''),
    callbackPort: port ?? DEFAULT_CALLBACK_PORT,
  };
}
