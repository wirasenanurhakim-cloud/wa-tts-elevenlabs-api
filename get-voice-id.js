// Jalankan script ini sekali untuk mencari Voice ID Kassandra V2
// Usage: node get-voice-id.js
require("dotenv").config();
const axios = require("axios");

async function findKassandraVoice() {
  const res = await axios.get("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
  });

  const voices = res.data.voices;

  // Cari semua voice yang mengandung "kassandra" (case-insensitive)
  const matches = voices.filter((v) =>
    v.name.toLowerCase().includes("kassandra")
  );

  if (matches.length === 0) {
    console.log("❌ Tidak ditemukan voice 'Kassandra'. Daftar semua voice:");
    voices.forEach((v) => console.log(`  - ${v.name}: ${v.voice_id}`));
  } else {
    console.log("✅ Ditemukan voice Kassandra:");
    matches.forEach((v) => {
      console.log(`  Name : ${v.name}`);
      console.log(`  ID   : ${v.voice_id}`);
      console.log(`  Labels: ${JSON.stringify(v.labels)}`);
      console.log("---");
    });
    console.log("\n📋 Copy Voice ID di atas ke file .env kamu:");
    console.log(`KASSANDRA_VOICE_ID=${matches[0].voice_id}`);
  }
}

findKassandraVoice().catch(console.error);
