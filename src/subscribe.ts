function generateIdentifier(prefix = 'bus') {
  const characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = `${prefix}_`;
  const length = 32;
  for (let i = 0; i < length; i++) {
    const randomNumber = Math.round(Math.random() * characterSet.length);
    result += characterSet.substring(randomNumber, randomNumber + 1);
  }
  return result;
}

export async function subscribe(request, env, ctx) {
  const url = new URL(request.url);
  const url_params = url.searchParams;
  const param_telegram_token = url_params.get('token');
  const param_telegram_chat_id = url_params.get('chat_id');
  const param_telegram_text = url_params.get('text');
  const param_scheduled_time = url_params.get('scheduled_time');
  const param_secret = url_params.get('secret');

  const subscription_id = generateIdentifier();

  let status = 'unknown';
  let message = 'Unknown errors';

  // const keys = await env.BUS_NOTIFICATION_KV.list({ prefix: 'bus_' });
  // if (keys.indexOf(subscription_id) < 0) {
  const now = new Date();
  const scheduled_time = new Date(param_scheduled_time);
  console.log(scheduled_time);
  if (scheduled_time.getTime() >= now.getTime() + 60 * 5 * 1000) {
    const object = {
      token: param_telegram_token,
      chat_id: parseInt(param_telegram_chat_id),
      text: param_telegram_text,
      scheduled_time: scheduled_time,
      secret: param_secret
    };
    await env.bus_notification_kv.put(subscription_id, JSON.stringify(object));
    status = 'successful';
    message = 'The notification has been subscribed.';
  } else {
    status = 'error';
    message = 'Scheduled time shall be at least 5 minutes after inclusively.';
  }
  // }

  return new Response(
    JSON.stringify({
      status: status,
      message: message
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
