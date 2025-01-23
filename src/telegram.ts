export async function checkTelegramBotToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}
