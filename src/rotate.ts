import { checkToken, ClientIDRegularExpression, getClient, NClientBackend, NTokenBackend, recordToken, setClientSecret } from './database';
import { getHeaders, NResponseRotate, SecretSize } from './index';
import { generateSecret, validateToken } from './tools';

export async function rotate(request, requestBody, env, ctx): Promise<Response> {
  const origin = request.headers.get('origin');

  const reqClientID = requestBody.client_id as NClientBackend['ClientID'];
  const reqToken = requestBody.token as NTokenBackend['Token'];

  const now = new Date();

  const clientIDTest = ClientIDRegularExpression.test(reqClientID);
  if (!clientIDTest) {
    return new Response(
      JSON.stringify({
        result: 'The client id is invalid.',
        code: 1,
        method: 'rotate',
        secret: 'null'
      } as NResponseRotate),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const thisClient = await getClient(reqClientID, env);
  if (typeof thisClient === 'boolean' && thisClient === false) {
    return new Response(
      JSON.stringify({
        result: 'The client was not found.',
        code: 3,
        method: 'rotate',
        secret: 'null'
      } as NResponseRotate),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const validation = validateToken(thisClient.ClientID, thisClient.Secret, reqToken, {}, origin, now.getTime());
  if (!validation) {
    return new Response(
      JSON.stringify({
        result: 'The request was unauthorized.',
        code: 5,
        method: 'rotate',
        secret: 'null'
      } as NResponseRotate),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  await recordToken(reqClientID, reqToken, env);
  const check = await checkToken(reqClientID, reqToken, env);
  if (!check) {
    return new Response(
      JSON.stringify({
        result: 'The token was used too many times.',
        code: 5,
        method: 'rotate',
        secret: 'null'
      } as NResponseRotate),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const secret = generateSecret(SecretSize);
  await setClientSecret(thisClient.ClientID, secret, env);
  return new Response(
    JSON.stringify({
      result: 'The secret was rotated.',
      code: 0,
      method: 'rotate',
      secret: secret
    } as NResponseRotate),
    {
      status: 200,
      headers: getHeaders(origin)
    }
  );
}
