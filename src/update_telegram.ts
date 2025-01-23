import { Client } from './register';
import { checkTelegramBotToken } from './telegram';
import { OTPAuthValidate } from './tools';

export async function updateTelegram(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramClientID = urlParams.get('client_id') as Client['client_id'];
  const paramTOTPToken = urlParams.get('totp_token') as string;
  const paramTelegramToken = urlParams.get('token') as string;
  const paramTelegramChatID = urlParams.get('chat_id') as string;

  let status = 500;
  let responseObject = { result: 'There was an unknown error.' };

  const clientIDTest = /^(client_)([A-Za-z0-9_-]{32,32})$/gm.test(paramClientID);
  const clientJSON = await env.bus_notification_kv.get(paramClientID);
  if (clientIDTest && clientJSON) {
    const clientObject = JSON.parse(clientJSON) as Client;
    const validation = OTPAuthValidate(paramClientID, clientObject.secret, paramTOTPToken);
    if (validation) {
      const telegramBotTokenValidation = await checkTelegramBotToken(paramTelegramToken);
      if (telegramBotTokenValidation) {
        const newClientObject: Client = {
          token: paramTelegramToken,
          chat_id: parseInt(paramTelegramChatID),
          secret: clientObject.secret,
          client_id: clientObject.client_id,
          type: 'client'
        };
        await env.bus_notification_kv.put(paramClientID, JSON.stringify(newClientObject));
        status = 200;
        responseObject = { result: `The telegram token and chat id were updated.` };
      } else {
        status = 400;
        responseObject = { result: 'The token is not valid.' };
      }
    } else {
      status = 401;
      responseObject = { result: `The request was unauthorized.` };
    }
  } else {
    status = 404;
    responseObject = { result: 'The client was not found.' };
  }
  return new Response(JSON.stringify(responseObject), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
