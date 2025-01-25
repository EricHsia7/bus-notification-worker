import { headers, NResponseSchedule } from '.';
import { generateIdentifier, OTPAuthValidate } from './tools';
import { addSchedule, ClientIDRegularExpression, getClient, NClientBackend, NScheduleBackend, NTOTPTokenBackend } from './database';

export async function schedule(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramClientID = urlParams.get('client_id') as NClientBackend['ClientID'];
  const paramTOTPToken = urlParams.get('totp_token') as NTOTPTokenBackend['Token'];
  const paramMessage = urlParams.get('message') as NScheduleBackend['Message'];
  const paramScheduledTime = new Date(urlParams.get('scheduled_time')).getTime() as NScheduleBackend['ScheduledTime'];

  const now = new Date();
  const scheduleID = generateIdentifier('schedule') as NScheduleBackend['ScheduleID'];

  let responseObject: NResponseSchedule = {
    result: 'There was an unknown error.',
    code: 500,
    method: 'schedule',
    schedule_id: 'null'
  };

  const clientIDTest = ClientIDRegularExpression.test(paramClientID);
  if (clientIDTest) {
    const thisClient = await getClient(paramClientID, env);
    if (typeof thisClient === 'boolean' && thisClient === false) {
      responseObject = {
        result: 'The client was not found.',
        code: 404,
        method: 'schedule',
        schedule_id: 'null'
      };
    } else {
      const validation = OTPAuthValidate(thisClient.ClientID, thisClient.Secret, paramTOTPToken);
      if (validation) {
        if (paramScheduledTime > now.getTime() + 60 * 3 * 1000) {
          await addSchedule(scheduleID, paramClientID, paramMessage, paramScheduledTime, env);
          responseObject = {
            result: 'The notification was scheduled.',
            code: 200,
            method: 'schedule',
            schedule_id: scheduleID
          };
        } else {
          responseObject = {
            result: 'The scheduled time shall be at least 3 minutes after.',
            code: 400,
            method: 'schedule',
            schedule_id: 'null'
          };
        }
      } else {
        responseObject = {
          result: 'The request was unauthorized.',
          code: 401,
          method: 'schedule',
          schedule_id: 'null'
        };
      }
    }
  } else {
    responseObject = {
      result: 'The client id is invalid.',
      code: 400,
      method: 'schedule',
      schedule_id: 'null'
    };
  }

  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
