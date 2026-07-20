import { checkToken, ClientIDRegularExpression, getClient, getSchedule, modifySchedule, NClientBackend, NScheduleBackend, NTokenBackend, recordToken, ScheduleIDRegularExpression } from './database';
import { getHeaders, NResponseReschedule } from './index';
import { validateToken } from './tools';

export async function reschedule(request, requestBody, env, ctx): Promise<Response> {
  const origin = request.headers.get('origin');

  const reqClientID = requestBody.client_id as NClientBackend['ClientID'];
  const reqToken = requestBody.token as NTokenBackend['Token'];
  const reqScheduleID = requestBody.schedule_id as NScheduleBackend['ScheduleID'];
  const reqEstimateTime = requestBody.estimate_time as NScheduleBackend['EstimateTime'];
  const reqScheduledTime = new Date(requestBody.scheduled_time).getTime() as NScheduleBackend['ScheduledTime'];

  const now = new Date();

  const clientIDTest = ClientIDRegularExpression.test(reqClientID);
  if (!clientIDTest) {
    return new Response(
      JSON.stringify({
        result: 'The client id is invalid.',
        code: 1,
        method: 'reschedule'
      } as NResponseReschedule),
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
        method: 'reschedule'
      } as NResponseReschedule),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  if (thisClient.Origin !== origin) {
    return new Response(
      JSON.stringify({
        result: 'The origin is invalid.',
        code: 5,
        method: 'reschedule'
      } as NResponseReschedule),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const validation = validateToken(
    thisClient.ClientID,
    thisClient.Secret,
    reqToken,
    {
      schedule_id: reqScheduleID,
      estimate_time: reqEstimateTime,
      scheduled_time: requestBody.scheduled_time
    },
    origin,
    now.getTime()
  );
  if (!validation) {
    return new Response(
      JSON.stringify({
        result: 'The request was unauthorized.',
        code: 5,
        method: 'reschedule'
      } as NResponseReschedule),
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
        method: 'reschedule'
      } as NResponseReschedule),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const scheduleIDTest = ScheduleIDRegularExpression.test(reqScheduleID);
  if (!scheduleIDTest) {
    return new Response(
      JSON.stringify({
        result: 'The schedule id is invalid.',
        code: 2,
        method: 'reschedule'
      } as NResponseReschedule),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const thisSchedule = await getSchedule(reqScheduleID, thisClient.ClientID, env);
  if (typeof thisSchedule === 'boolean' && thisSchedule === false) {
    return new Response(
      JSON.stringify({
        result: 'The schedule was not found.',
        code: 4,
        method: 'reschedule'
      } as NResponseReschedule),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  if (thisSchedule.ScheduledTime <= now.getTime()) {
    return new Response(
      JSON.stringify({
        result: 'A notification can only be rescheduled before it was due.',
        code: 6,
        method: 'reschedule'
      } as NResponseReschedule),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  await modifySchedule(thisSchedule.ScheduleID, reqEstimateTime, reqScheduledTime, env);
  return new Response(
    JSON.stringify({
      result: 'The notification was rescheduled.',
      code: 0,
      method: 'reschedule'
    } as NResponseReschedule),
    {
      status: 200,
      headers: getHeaders(origin)
    }
  );
}
