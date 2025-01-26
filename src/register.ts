import { headers, NResponseRegister, TOTPSecretSize, Env } from './index';
import { addClient, initializeDB } from './database';
import { generateIdentifier, OTPAuthSecret, sha256 } from './tools';

export async function register(request, requestBody, env: Env, ctx): Promise<Response> {
  const reqHash = requestBody.hash;

  const clientID = generateIdentifier('client');
  const TOTPSecret = OTPAuthSecret(TOTPSecretSize);

  const currentDate = new Date();
  currentDate.setMilliseconds(0);
  currentDate.setSeconds(0);

  const envHash_previous = sha256(`${env.REGISTRATION_KEY}${currentDate.getTime() - 60 * 1000}`);
  const envHash_current = sha256(`${env.REGISTRATION_KEY}${currentDate.getTime()}`);
  const envHash_next = sha256(`${env.REGISTRATION_KEY}${currentDate.getTime() + 60 * 1000}`);

  let responseObject: NResponseRegister = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'register',
    client_id: 'null',
    secret: 'null'
  };

  if (String(env.ALLOW_REGISTRATION).toLowerCase() === 'true') {
    if (reqHash === envHash_previous || reqHash === envHash_current || reqHash === envHash_next) {
      await initializeDB(env);
      await addClient(clientID, TOTPSecret, env);
      responseObject = {
        result: 'Client was registered.',
        code: 200,
        method: 'register',
        client_id: clientID,
        secret: TOTPSecret
      };
    } else {
      responseObject = {
        result: 'The hash is not valid.',
        code: 400,
        method: 'register',
        client_id: 'null',
        secret: 'null'
      };
    }
  } else {
    responseObject = {
      result: 'The registration is not allowed at this moment.',
      code: 403,
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
