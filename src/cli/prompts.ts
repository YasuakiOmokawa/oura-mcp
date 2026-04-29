import prompts from 'prompts';
import { DEFAULT_CALLBACK_PORT } from '../constants.js';

export type Credentials = {
  clientId: string;
  clientSecret: string;
  callbackPort: number;
};

export async function collectCredentials(): Promise<Credentials> {
  const res = await prompts(
    [
      {
        type: 'text',
        name: 'clientId',
        message: 'Oura Client ID:',
        validate: (v: string) => v.length > 0 || 'required',
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: 'Oura Client Secret:',
        validate: (v: string) => v.length > 0 || 'required',
      },
      {
        type: 'number',
        name: 'callbackPort',
        message: 'Callback port:',
        initial: DEFAULT_CALLBACK_PORT,
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
  return res as Credentials;
}
