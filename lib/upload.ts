import { supabase } from "./supabase";

export async function uploadImageToStorage(file: File, folder: string = "jobs") {
  if (!file || file.size === 0) {
    console.log(`[Upload] ข้าม: ไม่มีไฟล์ในช่อง ${folder}`);
    return null;
  }

  console.log(`[Upload] กำลังอัปโหลดไฟล์: ${file.name} (ขนาด ${(file.size / 1024).toFixed(1)} KB)`);

  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

  // แปลง File เป็น ArrayBuffer ก่อนส่ง เพื่อความชัวร์บน Node environment
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { data, error } = await supabase.storage
    .from("job-photos")
    .upload(fileName, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("[Upload Error จาก Supabase]:", error.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from("job-photos")
    .getPublicUrl(data.path);

  console.log("[Upload สำเร็จ URL]:", publicUrlData.publicUrl);
  return publicUrlData.publicUrl;
}

export async function uploadFileToStorage(file: File, folder = "expenses") {
  return uploadImageToStorage(file, folder);
}