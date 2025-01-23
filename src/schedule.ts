import { headers } from '.';
import { Client } from './register';
import { generateIdentifier, OTPAuthValidate } from './tools';

export interface Schedule {
  client_id: Client['client_id'];
  message: string;
  scheduled_time: string;
}

export async function schedule(request, env, ctx): Promise<Response> {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const paramClientID = urlParams.get('client_id') as Client['client_id'];
  const paramTOTPToken = urlParams.get('totp_token') as string;
  const paramMessage = urlParams.get('message') as string;
  const paramScheduledTime = urlParams.get('scheduled_time') as string;

  const now = new Date();
  const scheduleID = generateIdentifier('schedule');

  let responseObject = { result: 'There was an unknown error.', code: 500 };

  const clientIDTest = /^(client_)([A-Za-z0-9_-]{32,32})$/gm.test(paramClientID);
  const clientJSON = await env.bus_notification_kv.get(paramClientID);
  if (clientIDTest && clientJSON) {
    const client = JSON.parse(clientJSON) as Client;
    const validation = OTPAuthValidate(paramClientID, client.secret, paramTOTPToken);
    if (validation) {
      const scheduledTime = new Date(paramScheduledTime);
      if (scheduledTime.getTime() > now.getTime() + 60 * 5 * 1000) {
        const scheduleObject: Schedule = {
          client_id: paramClientID,
          message: paramMessage,
          scheduled_time: paramScheduledTime
        };
        await env.bus_notification_kv.put(scheduleID, JSON.stringify(scheduleObject));
        responseObject = {
          result: 'The message was scheduled.',
          schedule_id: scheduleID,
          code: 200
        };
      } else {
        responseObject = { result: 'The scheduled time shall be at least 5 minutes after.', code: 400 };
      }
    } else {
      responseObject = { result: 'The request was unauthorized.', code: 401 };
    }
  } else {
    responseObject = { result: 'The client was not found.', code: 404 };
  }
  return new Response(JSON.stringify(responseObject), {
    status: 200,
    headers: headers
  });
}
