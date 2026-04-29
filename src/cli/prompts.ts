import prompts from 'prompts';
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

  const res = await prompts(
    [
      {
        type: 'text',
        name: 'clientId',
        message: 'Oura Client ID:',
        initial: existing?.clientId ?? undefined,
        validate: (v: string) => v.length > 0 || 'required',
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: hasExisting
          ? 'Oura Client Secret (Enter to keep current):'
          : 'Oura Client Secret:',
        // hasExisting 時は空入力許容 (既存値を維持)。空かつ existing なし は required エラー
        validate: (v: string) => (hasExisting && v.length === 0) || v.length > 0 || 'required',
      },
      {
        type: 'number',
        name: 'callbackPort',
        message: 'Callback port:',
        initial: existing?.callbackPort ?? DEFAULT_CALLBACK_PORT,
        // prompts v2 の NumberPrompt は submit 時に validate→initial 反映の順なので、
        // empty 入力を許容しないと Enter で初期値が確定できない
        validate: (v: number | string) =>
          v === '' || (typeof v === 'number' && v >= 1024 && v <= 65535) || 'must be 1024-65535',
      },
    ],
    {
      onCancel: () => {
        throw new Error('Cancelled');
      },
    },
  );

  return {
    clientId: res.clientId as string,
    // existing 時に password を空 Enter したら既存値を流用
    clientSecret: (res.clientSecret as string) || (existing?.clientSecret ?? ''),
    callbackPort: res.callbackPort as number,
  };
}
