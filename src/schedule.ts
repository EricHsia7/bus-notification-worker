import { headers, NResponseSchedule } from '.';
import { generateIdentifier, OTPAuthValidate } from './tools';
import { NClientBackend, NScheduleBackend, NTOTPTokenBackend } from './database';

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

  const clientIDTest = /^(client_)([A-Za-z0-9_-]{32,32})$/gm.test(paramClientID);
  const clientJSON = await env.bus_notification_kv.get(paramClientID);
  if (clientIDTest && clientJSON) {
    const client = JSON.parse(clientJSON) as NClientBackend;
    const validation = OTPAuthValidate(paramClientID, client.secret, paramTOTPToken);
    if (validation) {
      const scheduledTime = new Date(paramScheduledTime);
      if (scheduledTime.getTime() > now.getTime() + 60 * 3 * 1000) {
        const scheduleObject: NScheduleBackend = {
          client_id: paramClientID,
          message: paramMessage,
          scheduled_time: paramScheduledTime
        };
        await env.bus_notification_kv.put(scheduleID, JSON.stringify(scheduleObject));
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
  } else {
    responseObject = {
      result: 'The client was not found.',
      code: 404,
      method: 'schedule',
      schedule_id: 'null'
    };
  }
  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
