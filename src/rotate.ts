import { headers, NResponseRotate, TOTPSecretSize } from '.';
import { OTPAuthSecret, OTPAuthValidate } from './tools';

export async function rotate(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramClientID = urlParams.get('client_id') as NClientBackend['client_id'];
  const paramTOTPToken = urlParams.get('totp_token') as string;

  const TOTPSecret = OTPAuthSecret(TOTPSecretSize);

  let responseObject: NResponseRotate = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'rotate',
    secret: 'null'
  };

  const clientIDTest = /^(client_)([A-Za-z0-9_-]{32,32})$/gm.test(paramClientID);
  const clientJSON = await env.bus_notification_kv.get(paramClientID);
  if (clientIDTest && clientJSON) {
    let client = JSON.parse(clientJSON) as NClientBackend;
    const validation = OTPAuthValidate(paramClientID, client.secret, paramTOTPToken);
    if (validation) {
      client.secret = TOTPSecret;
      await env.bus_notification_kv.put(paramClientID, JSON.stringify(client));
      responseObject = {
        result: 'The secret was rotated.',
        code: 200,
        method: 'rotate',
        secret: TOTPSecret
      };
    } else {
      responseObject = {
        result: 'The request was unauthorized.',
        code: 401,
        method: 'rotate',
        secret: 'null'
      };
    }
  } else {
    responseObject = {
      result: 'The client was not found.',
      code: 404,
      method: 'rotate',
      secret: 'null'
    };
  }
  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
