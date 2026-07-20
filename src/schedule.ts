import { addSchedule, checkToken, ClientIDRegularExpression, getClient, NClientBackend, NScheduleBackend, NTokenBackend, recordToken } from './database';
import { getHeaders, NResponseSchedule } from './index';
import { generateIdentifier, validateToken } from './tools';

export async function schedule(request, requestBody, env, ctx): Promise<Response> {
  const origin = request.headers.get('origin');

  const reqClientID = requestBody.client_id as NClientBackend['ClientID'];
  const reqToken = requestBody.token as NTokenBackend['Token'];
  const reqStopID = requestBody.stop_id as NScheduleBackend['StopID'];
  const reqLocationName = requestBody.location_name as NScheduleBackend['LocationName'];
  const reqRouteID = requestBody.route_id as NScheduleBackend['RouteID'];
  const reqRouteName = requestBody.route_name as NScheduleBackend['RouteName'];
  const reqDirection = requestBody.direction as NScheduleBackend['Direction'];
  const reqEstimateTime = requestBody.estimate_time as NScheduleBackend['EstimateTime'];
  const reqTimeFormattingMode = requestBody.time_formatting_mode as NScheduleBackend['TimeFormattingMode'];
  const reqTimeOffset = requestBody.time_offset as NScheduleBackend['TimeOffset'];
  const reqScheduledTime = new Date(requestBody.scheduled_time).getTime() as NScheduleBackend['ScheduledTime'];

  const now = new Date();

  const clientIDTest = ClientIDRegularExpression().test(reqClientID);
  if (!clientIDTest) {
    return new Response(
      JSON.stringify({
        result: 'The client id is invalid.',
        code: 1,
        method: 'schedule',
        schedule_id: 'null'
      } as NResponseSchedule),
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
        method: 'schedule',
        schedule_id: 'null'
      } as NResponseSchedule),
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
        method: 'schedule',
        schedule_id: 'null'
      } as NResponseSchedule),
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
      stop_id: reqStopID,
      location_name: reqLocationName,
      route_id: reqRouteID,
      route_name: reqRouteName,
      direction: reqDirection,
      estimate_time: reqEstimateTime,
      time_formatting_mode: reqTimeFormattingMode,
      time_offset: reqTimeOffset,
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
        method: 'schedule',
        schedule_id: 'null'
      } as NResponseSchedule),
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
        method: 'schedule',
        schedule_id: 'null'
      } as NResponseSchedule),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  if (reqScheduledTime <= now.getTime() + 60 * 1 * 1000) {
    return new Response(
      JSON.stringify({
        result: 'The scheduled time shall be at least 1 minute after.',
        code: 6,
        method: 'schedule',
        schedule_id: 'null'
      } as NResponseSchedule),
      {
        status: 200,
        headers: getHeaders(origin)
      }
    );
  }

  const scheduleID = generateIdentifier('schedule') as NScheduleBackend['ScheduleID'];
  await addSchedule(scheduleID, reqClientID, reqStopID, reqLocationName, reqRouteID, reqRouteName, reqDirection, reqEstimateTime, reqTimeFormattingMode, reqTimeOffset, reqScheduledTime, env);
  return new Response(
    JSON.stringify({
      result: 'The notification was scheduled.',
      code: 0,
      method: 'schedule',
      schedule_id: scheduleID
    } as NResponseSchedule),
    {
      status: 200,
      headers: getHeaders(origin)
    }
  );
}
