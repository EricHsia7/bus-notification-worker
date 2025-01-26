import { headers, NResponseRotate, TOTPSecretSize } from './index';
import { OTPAuthSecret, OTPAuthValidate } from './tools';
import { checkTOTPToken, ClientIDRegularExpression, getClient, NClientBackend, NTOTPTokenBackend, recordTOTPToken, setClientSecret } from './database';

export async function rotate(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramClientID = urlParams.get('client_id') as NClientBackend['ClientID'];
  const paramTOTPToken = urlParams.get('totp_token') as NTOTPTokenBackend['Token'];

  const TOTPSecret = OTPAuthSecret(TOTPSecretSize);

  let responseObject: NResponseRotate = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'rotate',
    secret: 'null'
  };

  const clientIDTest = ClientIDRegularExpression.test(paramClientID);
  if (clientIDTest) {
    const thisClient = await getClient(paramClientID, env);
    if (typeof thisClient === 'boolean' && thisClient === false) {
      responseObject = {
        result: 'The client was not found.',
        code: 404,
        method: 'rotate',
        secret: 'null'
      };
    } else {
      const validation = OTPAuthValidate(thisClient.ClientID, thisClient.Secret, paramTOTPToken);
      if (validation) {
        await recordTOTPToken(paramClientID, paramTOTPToken, env);
        const check = await checkTOTPToken(paramClientID, paramTOTPToken, env);
        if (check) {
          await setClientSecret(thisClient.ClientID, TOTPSecret, env);
          responseObject = {
            result: 'The secret was rotated.',
            code: 200,
            method: 'rotate',
            secret: TOTPSecret
          };
        } else {
          responseObject = {
            result: 'The token was used too many times.',
            code: 403,
            method: 'rotate',
            secret: 'null'
          };
        }
      } else {
        responseObject = {
          result: 'The request was unauthorized.',
          code: 403,
          method: 'rotate',
          secret: 'null'
        };
      }
    }
  } else {
    responseObject = {
      result: 'The client id is invalid.',
      code: 400,
      method: 'rotate',
      secret: 'null'
    };
  }

  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
