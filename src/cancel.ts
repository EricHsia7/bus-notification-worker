import { headers, NResponseCancel } from './index';
import { generateIdentifier, OTPAuthValidate } from './tools';
import { addSchedule, ClientIDRegularExpression, discardSchedule, getClient, getSchedule, NClientBackend, NScheduleBackend, NTOTPTokenBackend, ScheduleIDRegularExpression } from './database';

export async function cancel(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramClientID = urlParams.get('client_id') as NClientBackend['ClientID'];
  const paramTOTPToken = urlParams.get('totp_token') as NTOTPTokenBackend['Token'];
  const paramScheduleID = urlParams.get('message') as NScheduleBackend['ScheduleID'];

  const now = new Date();

  let responseObject: NResponseCancel = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'cancel'
  };

  const clientIDTest = ClientIDRegularExpression.test(paramClientID);
  if (clientIDTest) {
    const thisClient = await getClient(paramClientID, env);
    if (typeof thisClient === 'boolean' && thisClient === false) {
      responseObject = {
        result: 'The client was not found.',
        code: 404,
        method: 'cancel'
      };
    } else {
      const validation = OTPAuthValidate(thisClient.ClientID, thisClient.Secret, paramTOTPToken);
      if (validation) {
        const scheduleIDTest = ScheduleIDRegularExpression.test(paramScheduleID);
        if (scheduleIDTest) {
          const thisSchedule = await getSchedule(paramScheduleID, thisClient.ClientID, env);
          if (typeof thisSchedule === 'boolean' && thisSchedule === false) {
            responseObject = {
              result: 'The schedule was not found.',
              code: 404,
              method: 'cancel'
            };
          } else {
            if (thisSchedule.ScheduledTime > now.getTime()) {
              await discardSchedule(thisSchedule.ScheduleID, env);
              responseObject = {
                result: 'The notification was canceled.',
                code: 200,
                method: 'cancel'
              };
            } else {
              responseObject = {
                result: 'A notification can only be canceled before it was due.',
                code: 400,
                method: 'cancel'
              };
            }
          }
        } else {
          responseObject = {
            result: 'The schedule id is invalid.',
            code: 400,
            method: 'cancel'
          };
        }
      } else {
        responseObject = {
          result: 'The request was unauthorized.',
          code: 403,
          method: 'cancel'
        };
      }
    }
  } else {
    responseObject = {
      result: 'The client id is invalid.',
      code: 400,
      method: 'cancel'
    };
  }

  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
