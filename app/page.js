// ส่งข้อความแจ้งเตือนผ่าน API route ของเราเอง (ไม่ยิง Telegram ตรงจาก client)
// ทำงานแบบไม่บล็อกระบบขาย: ถ้า error ให้ log ไว้เฉยๆ ไม่ throw ต่อ
async function sendTelegramNotification(text) {
  try {
    const res = await fetch("/api/notify-telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error("ส่ง Telegram แจ้งเตือนไม่สำเร็จ:", await res.text());
    }
  } catch (err) {
    // ไม่ให้กระทบการขาย แค่ log error ไว้
    console.error("เกิดข้อผิดพลาดตอนส่ง Telegram แจ้งเตือน:", err);
  }
}

const LOW_STOCK_THRESHOLD = 5;
