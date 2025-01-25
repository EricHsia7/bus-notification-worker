import { discardExpiredSchedules, listSchedules } from './database';
import { sendMessageViaTelegram } from './telegram';

export async function send(event, env, ctx) {
  const now = new Date();
  // Retrieve scheduled tasks
  const schedules = await listSchedules(now, env);
  for (const schedule of schedules) {
    await sendMessageViaTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, schedule.Message);
  }
  await discardExpiredSchedules(now, env);
}
