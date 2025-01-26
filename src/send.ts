import { discardExpiredSchedules, listSchedules } from './database';
import { generateImage } from './image';
import { sendPhotoMesaageViaTelegram, sendTextMessageViaTelegram } from './telegram';
import { formatTime } from './tools';

export async function send(event, env, ctx) {
  const now = new Date().getTime();
  // Retrieve scheduled tasks
  const schedules = await listSchedules(now, env);
  for (const schedule of schedules) {
    const time = (schedule.TimeStamp + schedule.EstimateTime * 1000 - now) / 1000;
    const message = `公車將在${formatTime(time, schedule.TimeFormattingMode)}內抵達${schedule.LocationName} | 路線：${schedule.RouteName} - 往${schedule.Direction}`;
    if (schedule.Photo === 1) {
      const buffer = await generateImage(schedule.LocationName, schedule.RouteName, schedule.Direction, time, schedule.TimeFormattingMode);
      await sendPhotoMesaageViaTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, buffer);
    } else {
      await sendTextMessageViaTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, message);
    }
  }
  await discardExpiredSchedules(now, env);
}
