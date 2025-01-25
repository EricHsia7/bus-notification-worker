import { NScheduleBackend } from './database';
import { sendMessageViaTelegram } from './telegram';

export async function send(event, env, ctx) {
  const now = new Date();

  // Retrieve scheduled tasks
  const schedules = await env.bus_notification_kv.list({ prefix: 'schedule_' });

  for (const schedule of schedules.keys) {
    const scheduleJSON = await env.bus_notification_kv.get(schedule.name);
    if (scheduleJSON) {
      const scheduleObject = JSON.parse(scheduleJSON) as NScheduleBackend;
      const scheduledTime = new Date(scheduleObject.scheduled_time);
      if (now.getTime() >= scheduledTime.getTime()) {
        const clientJSON = await env.bus_notification_kv.get(scheduleObject.client_id);
        if (clientJSON) {
          await sendMessageViaTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, scheduleObject.message);
          await env.bus_notification_kv.delete(schedule.name);
        }
      }
    }
  }
}
