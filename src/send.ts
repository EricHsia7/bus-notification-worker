import { discardExpiredSchedules, discardExpiredTOTPToken, listSchedules } from './database';
import { sendTextMessageViaTelegram } from './telegram';
import { formatTime } from './tools';

export async function send(event, env, ctx) {
  const now = new Date().getTime();
  // Retrieve scheduled tasks
  const schedules = await listSchedules(now, env);
  for (const schedule of schedules) {
    const message = `公車將在${formatTime(schedule.TimeOffset * -60, schedule.TimeFormattingMode)}內抵達${schedule.LocationName} | 路線：${schedule.RouteName} - 往${schedule.Direction}`;
    const url = new URL('https://erichsia7.github.io/bus/');
    url.searchParams.set('permalink', `0@${parseInt(schedule.RouteID).toString(16)}~${schedule.RouteName}`);
    await sendTextMessageViaTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, message, url.toString());
  }
  await discardExpiredSchedules(now, env);
  await discardExpiredTOTPToken(now, env);
}
