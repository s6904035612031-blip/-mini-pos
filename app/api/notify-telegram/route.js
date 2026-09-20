// API Route ฝั่ง Server สำหรับส่งข้อความแจ้งเตือนเข้า Telegram
// เก็บ Bot Token ไว้ฝั่ง server เท่านั้น (ไม่ใช้ NEXT_PUBLIC_ prefix) เพื่อไม่ให้ token รั่วไปฝั่ง client

export async function POST(request) {
  try {
    const { text } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return Response.json(
        { ok: false, error: "ไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID" },
        { status: 500 }
      );
    }
    if (!text) {
      return Response.json({ ok: false, error: "ไม่มีข้อความที่จะส่ง" }, { status: 400 });
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML",
        }),
      }
    );

    const data = await telegramRes.json();

    if (!telegramRes.ok) {
      return Response.json({ ok: false, error: data }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
