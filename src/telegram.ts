export async function checkTelegramBotToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function sendTextMessageViaTelegram(token: string, chat_id: string, message: string): Promise<object> {
  const telegramAPI = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(telegramAPI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chat_id,
        text: message
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
