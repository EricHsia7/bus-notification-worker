import { checkTelegramBotToken } from './telegram';
import { generateIdentifier, OTPAuthSecret } from './tools';

export interface Client {
  token: string;
  chat_id: number;
  secret: string;
  client_id: string;
  type: 'client';
}

export async function register(request, env, ctx) {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramTelegramToken = urlParams.get('token');
  const paramTelegramChatID = urlParams.get('chat_id');

  const clientID = generateIdentifier('client');
  const TOTPSecret = OTPAuthSecret(24);

  let status = 500;
  let responseText = JSON.stringify({ result: 'bad request' });

  const telegramBotTokenValidation = await checkTelegramBotToken(paramTelegramToken);
  if (telegramBotTokenValidation) {
    const client: Client = {
      token: paramTelegramToken,
      chat_id: parseInt(paramTelegramChatID),
      secret: TOTPSecret,
      client_id: clientID,
      type: 'client'
    };
    await env.bus_notification_kv.put(clientID, JSON.stringify(client));
    responseText = JSON.stringify({
      result: 'successful',
      client_id: clientID,
      secret: TOTPSecret
    });
    status = 200;
  } else {
    responseText = JSON.stringify({ result: 'error' });
    status = 400;
  }
  return new Response(responseText, {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
