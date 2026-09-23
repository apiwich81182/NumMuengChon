import { supabase } from "../lib/supabase";

async function main() {
  console.log("🚀 ทดสอบ 1: อัปโหลดโดย upsert: false...");
  const dummyBuffer = Buffer.from("test content");
  const fileName = `test/test-${Date.now()}.txt`;

  const res1 = await supabase.storage
    .from("job-photos")
    .upload(fileName, dummyBuffer, {
      contentType: "text/plain",
      upsert: false,
    });

  console.log("ผลการอัปโหลด upsert: false:", res1);
}

main().catch(console.error);

