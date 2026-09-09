export async function sendLineJobAlert({
  customerName,
  customerPhone,
  plateNumber,
  driverName,
  driver2Name,
  volumePumped,
  price,
  paymentMethod,
  latitude,
  longitude,
  slipPhotoUrl,
}: {
  customerName: string;
  customerPhone: string;
  plateNumber: string;
  driverName: string;
  driver2Name?: string | null;
  volumePumped: number;
  price: number;
  paymentMethod: "CASH" | "TRANSFER";
  latitude?: number | null;
  longitude?: number | null;
  slipPhotoUrl?: string | null;
}) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_ADMIN_USER_ID;

  if (!token || !targetId) {
    console.warn("LINE alert skipped: Missing credentials in .env");
    return;
  }

  const paymentText = paymentMethod === "CASH" ? "💵 เงินสด" : "📱 เงินโอน";
  let messageText =
    `🚛 มีการส่งงานใหม่!\n` +
    `----------------------------\n` +
    `📍 ลูกค้า/หน้างาน: ${customerName}\n` +
    `📱 โทรศัพท์: ${customerPhone}\n` +
    `🚚 คันรถ: ${plateNumber}\n` +
    `👷‍♂️ คนขับหลัก: ${driverName}\n` +
    (driver2Name ? `👷‍♂️ ผู้ช่วย: ${driver2Name}\n` : "") +
    `💧 ปริมาณสูบ: ${volumePumped.toLocaleString()} ลิตร\n` +
    `💰 ยอดเงิน: ฿${price.toLocaleString()} (${paymentText})\n`;

  if (latitude && longitude) {
    messageText += `🗺️ แผนที่: https://maps.google.com/?q=${latitude},${longitude}\n`;
  }

  const messages: any[] = [
    {
      type: "text",
      text: messageText.trim(),
    },
  ];

  // ถ้าเป็นเงินโอนและมีรูปสลิป ให้ส่งรูปสลิปตามเข้าไปด้วย
  if (paymentMethod === "TRANSFER" && slipPhotoUrl) {
    messages.push({
      type: "image",
      originalContentUrl: slipPhotoUrl,
      previewImageUrl: slipPhotoUrl,
    });
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("LINE Messaging API error response:", err);
    }
  } catch (error) {
    console.error("Failed to send LINE push alert:", error);
  }
}