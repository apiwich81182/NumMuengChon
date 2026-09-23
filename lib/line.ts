import { getExpenseCategoryLabel } from "@/lib/labels";

type LineMessage =
  | { type: "text"; text: string }
  | { type: "image"; originalContentUrl: string; previewImageUrl: string };

async function pushLineMessages(messages: LineMessage[], errorLabel: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_ADMIN_USER_ID || process.env.LINE_ADMIN_GROUP_ID;

  if (!token || !targetId) {
    console.warn("LINE alert skipped: Missing credentials in .env");
    return;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: targetId, messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LINE Messaging API error response (${errorLabel}):`, errorText);

      // กรณีส่งพร้อมรูปภาพแล้วล้มเหลว (เช่น ขนาดรูปเกินเกณฑ์ของ LINE) ให้ส่งเฉพาะข้อความสำรอง
      if (messages.length > 1) {
        console.warn(`[LINE] พยายามส่งข้อความสำรองโดยตัดรูปภาพออก (${errorLabel})...`);
        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ to: targetId, messages: [messages[0]] }),
        });
      }
    }
  } catch (error) {
    console.error(`Failed to send LINE ${errorLabel} alert:`, error);
  }
}

// -------------------------------------------------------------
// 1. ฟังก์ชันแจ้งเตือนงานใหม่ (ส่งเฉพาะรูปสลิป รูปก่อน/หลังสูบไม่ส่ง)
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

  const hasSlip = Boolean(
    slipPhotoUrl && typeof slipPhotoUrl === "string" && slipPhotoUrl.startsWith("http")
  );

  if (hasSlip) {
    messageText += `🧾 หลักฐานสลิป: ส่งรูปด้านล่างนี้\n`;
  }

  const messages: LineMessage[] = [
    {
      type: "text",
      text: messageText.trim(),
    },
  ];

  // ส่งรูปสลิปตามเข้าไปด้วยถ้ามี (เฉพาะรูปสลิป รูปก่อนสูบ/หลังสูบไม่ต้องส่ง)
  if (hasSlip && slipPhotoUrl) {
    messages.push({
      type: "image",
      originalContentUrl: slipPhotoUrl,
      previewImageUrl: slipPhotoUrl,
    });
  }

  await pushLineMessages(messages, "job");
}

// -------------------------------------------------------------
// 2. ฟังก์ชันแจ้งเตือนบันทึกรายจ่ายใหม่ (ส่งรูปสลิป/บิล)
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

  const catLabel = getExpenseCategoryLabel(category);

  const hasSlip = Boolean(
    slipUrl && typeof slipUrl === "string" && slipUrl.startsWith("http")
  );

  let messageText =
    `📕 มีการบันทึกรายจ่ายใหม่!\n` +
    `----------------------------\n` +
    `💰 ยอดเงิน: ฿${amount.toLocaleString()}\n` +
    `🏷️ หมวดหมู่: ${catLabel}\n` +
    `🚚 คันรถ: ${plateNumber || "-"}\n` +
    `👤 ผู้บันทึก: ${userName}\n` +
    `📝 รายละเอียด: ${note || "-"}\n` +
    `🕒 เวลา: ${dateStr} ${timeStr} น.\n`;

  if (hasSlip) {
    messageText += `🧾 หลักฐานสลิป/บิล: ส่งรูปด้านล่างนี้\n`;
  }

  const messages: LineMessage[] = [
    {
      type: "text",
      text: messageText.trim(),
    },
  ];

  // ถ้ามีแนบรูปสลิป/บิลรายจ่าย ส่งรูปตามไปด้วย
  if (hasSlip && slipUrl) {
    messages.push({
      type: "image",
      originalContentUrl: slipUrl,
      previewImageUrl: slipUrl,
    });
  }

  await pushLineMessages(messages, "expense");
}

// -------------------------------------------------------------
// 3. ฟังก์ชันแจ้งเตือนจ่ายงานใหม่ (Admin Dispatch Alert)
// -------------------------------------------------------------
export async function sendLineJobAssignedAlert({
  customerName,
  customerPhone,
  plateNumber,
  driverName,
  driver2Name,
  address,
  appointmentDate,
  note,
  latitude,
  longitude,
}: {
  customerName: string;
  customerPhone: string;
  plateNumber: string;
  driverName: string;
  driver2Name?: string | null;
  address?: string | null;
  appointmentDate?: Date | null;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  let apptStr = "-";
  if (appointmentDate) {
    const d = new Date(appointmentDate);
    apptStr = `${d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })} เวลา ${d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`;
  }

  let messageText =
    `📋 แอดมินมอบหมายงานใหม่ (Dispatch)!\n` +
    `----------------------------\n` +
    `👤 ลูกค้า: ${customerName}\n` +
    `📞 เบอร์โทร: ${customerPhone}\n` +
    `🚚 คันรถ: ${plateNumber}\n` +
    `👷‍♂️ คนขับหลัก: ${driverName}\n` +
    (driver2Name ? `👷‍♂️ ผู้ช่วย: ${driver2Name}\n` : "") +
    `⏰ เวลานัดหมาย: ${apptStr}\n` +
    `📍 สถานที่/ที่อยู่: ${address || "-"}\n` +
    (note ? `📝 หมายเหตุ: ${note}\n` : "");

  if (latitude && longitude) {
    messageText += `🗺️ แผนที่นำทาง: https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}\n`;
  }

  const messages: LineMessage[] = [
    {
      type: "text",
      text: messageText.trim(),
    },
  ];

  await pushLineMessages(messages, "job-assign");
}
