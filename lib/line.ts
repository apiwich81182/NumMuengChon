const CATEGORY_NAMES_TH: Record<string, string> = {
  FUEL: "ค่าน้ำมัน ⛽",
  DISPOSAL_FEE: "ค่าจุดทิ้งของเสีย 🚽",
  MAINTENANCE: "ค่าซ่อมบำรุง 🔧",
  SALARY: "ค่าแรง / เงินเดือน 💼",
  OTHER: "อื่นๆ 📦",
};

// -------------------------------------------------------------
// 1. ฟังก์ชันแจ้งเตือนงานใหม่ (คงโค้ดเดิมของคุณไว้ 100%)
// -------------------------------------------------------------
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
  const targetId = process.env.LINE_ADMIN_USER_ID || process.env.LINE_ADMIN_GROUP_ID;

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

// -------------------------------------------------------------
// 2. ฟังก์ชันแจ้งเตือนบันทึกรายจ่ายใหม่ (เพิ่มใหม่)
// -------------------------------------------------------------
export async function sendLineExpenseAlert({
  category,
  amount,
  userName,
  plateNumber,
  note,
  slipUrl,
  createdAt,
}: {
  category: string;
  amount: number;
  userName: string;
  plateNumber?: string | null;
  note?: string | null;
  slipUrl?: string | null;
  createdAt?: Date;
}) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_ADMIN_USER_ID || process.env.LINE_ADMIN_GROUP_ID;

  if (!token || !targetId) {
    console.warn("LINE alert skipped: Missing credentials in .env");
    return;
  }

  const now = createdAt ? new Date(createdAt) : new Date();
  const dateStr = now.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
  const timeStr = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const catLabel = CATEGORY_NAMES_TH[category] || category;

  let messageText =
    `📕 มีการบันทึกรายจ่ายใหม่!\n` +
    `----------------------------\n` +
    `💰 ยอดเงิน: ฿${amount.toLocaleString()}\n` +
    `🏷️ หมวดหมู่: ${catLabel}\n` +
    `🚚 คันรถ: ${plateNumber || "-"}\n` +
    `👤 ผู้บันทึก: ${userName}\n` +
    `📝 รายละเอียด: ${note || "-"}\n` +
    `🕒 เวลา: ${dateStr} ${timeStr} น.`;

  const messages: any[] = [
    {
      type: "text",
      text: messageText.trim(),
    },
  ];

  // ถ้ามีแนบรูปสลิป/บิลรายจ่าย ส่งรูปตามไปด้วย
  if (slipUrl && typeof slipUrl === "string" && slipUrl.startsWith("http")) {
    messages.push({
      type: "image",
      originalContentUrl: slipUrl,
      previewImageUrl: slipUrl,
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
      console.error("LINE Messaging API error response (Expense):", err);
    }
  } catch (error) {
    console.error("Failed to send LINE expense alert:", error);
  }
}