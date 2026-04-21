interface SendMessageParams {
  bot_token: string;
  chat_id: string;
  text: string;
}

export async function sendMessage(params: SendMessageParams): Promise<Response> {
  const url = `https://api.telegram.org/bot${params.bot_token}/sendMessage`;
  const body = JSON.stringify({
    chat_id: params.chat_id,
    text: params.text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${errorBody}`);
  }

  return response;
}

export async function sendAlert(
  adminConfig: { bot_token: string; chat_id: string },
  message: string,
): Promise<void> {
  try {
    await sendMessage({
      bot_token: adminConfig.bot_token,
      chat_id: adminConfig.chat_id,
      text: `<b>[Alert]</b> ${escapeHtml(message)}`,
    });
  } catch {
    // Cannot alert about alert failures — silently drop
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
