import { addClient, initializeDB } from './database';
import { Env, getHeaders, NResponseRegister, SecretSize } from './index';
import { generateIdentifier, generateSecret, sha512 } from './tools';

export async function register(request, requestBody, env: Env, ctx): Promise<Response> {
  const origin = request.headers.get('origin');

  const reqHash = requestBody.hash;

  const clientID = generateIdentifier('client');
  const secret = generateSecret(SecretSize);

  const currentDate = new Date();
  currentDate.setMilliseconds(0);
  currentDate.setSeconds(0);

  const envHash_previous = sha512(`${sha512(env.REGISTRATION_KEY)}${currentDate.getTime() - 60 * 1000}`);
  const envHash_current = sha512(`${sha512(env.REGISTRATION_KEY)}${currentDate.getTime()}`);
  const envHash_next = sha512(`${sha512(env.REGISTRATION_KEY)}${currentDate.getTime() + 60 * 1000}`);

  if (String(env.ALLOW_REGISTRATION).toLowerCase() !== 'true') {
    return new Response(JSON.stringify({ result: 'The registration is not allowed at this moment.', code: 403, method: 'register', client_id: 'null', secret: 'null' }), {
      status: 200,
      headers: getHeaders(origin)
    });
  }

  if (reqHash === envHash_previous || reqHash === envHash_current || reqHash === envHash_next) {
    await initializeDB(env);
    await addClient(clientID, secret, env);
    return new Response(
      JSON.stringify({
        result: 'Client was registered.',
        code: 0,
        method: 'register',
        client_id: clientID,
        secret: secret
      } as NResponseRegister),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  return new Response(
    JSON.stringify({
      result: 'The hash is not valid.',
      code: 1,
      method: 'register',
      client_id: 'null',
      secret: 'null'
    } as NResponseRegister),
    {
      status: 200,
      headers: getHeaders(origin)
    }
  );
}
