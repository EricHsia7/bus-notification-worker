import { headers, NResponseReschedule } from './index';
import { OTPAuthValidate } from './tools';
import { checkTOTPToken, ClientIDRegularExpression, getClient, getSchedule, modifySchedule, NClientBackend, NScheduleBackend, NTOTPTokenBackend, recordTOTPToken, ScheduleIDRegularExpression } from './database';

export async function reschedule(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramClientID = urlParams.get('client_id') as NClientBackend['ClientID'];
  const paramTOTPToken = urlParams.get('totp_token') as NTOTPTokenBackend['Token'];
  const paramScheduleID = urlParams.get('schedule_id') as NScheduleBackend['ScheduleID'];
  const paramEstimateTime = parseInt(urlParams.get('estimate_time')) as NScheduleBackend['EstimateTime'];
  const paramScheduledTime = new Date(urlParams.get('scheduled_time')).getTime() as NScheduleBackend['ScheduledTime'];

  const now = new Date();

  let responseObject: NResponseReschedule = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'reschedule'
  };

  const clientIDTest = ClientIDRegularExpression.test(paramClientID);
  if (clientIDTest) {
    const thisClient = await getClient(paramClientID, env);
    if (typeof thisClient === 'boolean' && thisClient === false) {
      responseObject = {
        result: 'The client was not found.',
        code: 404,
        method: 'reschedule'
      };
    } else {
      const validation = OTPAuthValidate(thisClient.ClientID, thisClient.Secret, paramTOTPToken);
      if (validation) {
        await recordTOTPToken(paramClientID, paramTOTPToken, env);
        const check = await checkTOTPToken(paramClientID, paramTOTPToken, env);
        if (check) {
          const scheduleIDTest = ScheduleIDRegularExpression.test(paramScheduleID);
          if (scheduleIDTest) {
            const thisSchedule = await getSchedule(paramScheduleID, thisClient.ClientID, env);
            if (typeof thisSchedule === 'boolean' && thisSchedule === false) {
              responseObject = {
                result: 'The schedule was not found.',
                code: 404,
                method: 'reschedule'
              };
            } else {
              if (thisSchedule.ScheduledTime > now.getTime()) {
                await modifySchedule(thisSchedule.ScheduleID, paramEstimateTime, paramScheduledTime, env);
                responseObject = {
                  result: 'The notification was rescheduled.',
                  code: 200,
                  method: 'reschedule'
                };
              } else {
                responseObject = {
                  result: 'A notification can only be rescheduled before it was due.',
                  code: 400,
                  method: 'reschedule'
                };
              }
            }
          } else {
            responseObject = {
              result: 'The schedule id is invalid.',
              code: 400,
              method: 'reschedule'
            };
          }
        } else {
          responseObject = {
            result: 'The token was used too many times.',
            code: 403,
            method: 'reschedule'
          };
        }
      } else {
        responseObject = {
          result: 'The request was unauthorized.',
          code: 403,
          method: 'reschedule'
        };
      }
    }
  } else {
    responseObject = {
      result: 'The client id is invalid.',
      code: 400,
      method: 'reschedule'
    };
  }

  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
