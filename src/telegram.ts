import { FormData } from 'formdata-node';

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
/*
export async function sendPhotoMesaageViaTelegram(token: string, chat_id: string, buffer: ArrayBuffer): Promise<object> {
  const telegramAPI = `https://api.telegram.org/bot${token}/sendPhoto`;
  try {
    // Create a FormData instance
    const formData = new FormData();
    formData.set('chat_id', chat_id);
    formData.set('photo', buffer);

    // Send the POST request to Telegram API
    const response = fetch(telegramAPI, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      body: formData
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
*/