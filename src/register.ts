import { headers, NResponseRegister, TOTPSecretSize } from '.';
import { checkTelegramBotToken } from './telegram';
import { generateIdentifier, OTPAuthSecret } from './tools';

export interface NClientBackend {
  token: string;
  chat_id: number;
  secret: string;
  client_id: string;
  type: 'client';
}

export async function register(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramTelegramToken = urlParams.get('token');
  const paramTelegramChatID = urlParams.get('chat_id');

  const clientID = generateIdentifier('client');
  const TOTPSecret = OTPAuthSecret(TOTPSecretSize);

  let responseObject: NResponseRegister = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'register',
    client_id: 'null',
    secret: 'null'
  };

  const telegramBotTokenValidation = await checkTelegramBotToken(paramTelegramToken);
  if (telegramBotTokenValidation) {
    const clientObject: NClientBackend = {
      token: paramTelegramToken,
      chat_id: parseInt(paramTelegramChatID),
      secret: TOTPSecret,
      client_id: clientID,
      type: 'client'
    };
    await env.bus_notification_kv.put(clientID, JSON.stringify(clientObject));
    responseObject = {
      result: 'Client was registered.',
      code: 200,
      method: 'register',
      client_id: clientID,
      secret: TOTPSecret
    };
  } else {
    responseObject = {
      result: 'The token is not valid.',
      code: 400,
      method: 'register',
      client_id: 'null',
      secret: 'null'
    };
  }
  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
