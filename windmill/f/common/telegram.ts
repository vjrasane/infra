export type TelegramBot = {
  token: string;
  chat_id: string;
};

export async function sendTelegramMessage(
  telegram: TelegramBot,
  message: string,
  parse_mode?: "MarkdownV2" | "HTML",
) {
  const url = `https://api.telegram.org/bot${telegram.token}/sendMessage`;

  const body: Record<string, string> = {
    chat_id: telegram.chat_id,
    text: message,
  };
  if (parse_mode) {
    body.parse_mode = parse_mode;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Telegram API error: ${response.status} ${await response.text()}`,
    );
  }

  return await response.json();
}
