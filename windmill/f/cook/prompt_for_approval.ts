import * as wmill from "windmill-client";
import { TelegramBot } from "../common/resources";

export async function main(telegram: TelegramBot, message: string) {
  const urls = await wmill.getResumeUrls("telegram");

  const makeUrl = (action: string) => {
    const payload = btoa(JSON.stringify({ action }));
    return `${urls.resume}&payload=${encodeURIComponent(payload)}`;
  };

  const response = await fetch(
    `https://api.telegram.org/bot${telegram.token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegram.chat_id,
        text: message,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Approve", url: makeUrl("approve") },
              { text: "✏️ Revise", url: makeUrl("revise") },
              { text: "❌ Reject", url: makeUrl("reject") },
            ],
          ],
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Telegram API error: ${response.status} ${await response.text()}`,
    );
  }

  return {
    resume: urls.resume,
    cancel: urls.cancel,
  };
}
