const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const KASSANDRA_VOICE_ID = process.env.KASSANDRA_VOICE_ID || "YOUR_KASSANDRA_V2_VOICE_ID";
const JUHEE_VOICE_ID = process.env.JUHEE_VOICE_ID || "YOUR_JUHEE_V2_VOICE_ID";
const OWNER_NUMBER = process.env.OWNER_NUMBER || "";
const TIMEZONE = "Asia/Jakarta";

const WHITELISTED_GROUPS = [
  "120363407481213948@g.us",
  "120363405918412291@g.us",
];

const TMP_DIR = path.join(__dirname, "tmp");
const BACKUP_DIR = path.join(__dirname, "backup");
const CACHE_DIR = path.join(__dirname, "cache");
const STATS_FILE = path.join(BACKUP_DIR, "daily_generate_stats.json");
const CONTACTS_FILE = path.join(BACKUP_DIR, "contacts.json");
const LAST_GENERATE_FILE = path.join(BACKUP_DIR, "last_generate.json");

for (const dir of [TMP_DIR, BACKUP_DIR, CACHE_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let activeSock = null;
let reportSchedulerStarted = false;

function getCacheKey(text, modelVersion = "v2", voiceName = "lid") {
  return crypto.createHash("md5").update(`${voiceName}:${modelVersion}:${text}`).digest("hex");
}

function getCachedAudio(text, modelVersion = "v2", voiceName = "lid") {
  const cachePath = path.join(CACHE_DIR, `${getCacheKey(text, modelVersion, voiceName)}.mp3`);
  return fs.existsSync(cachePath) ? cachePath : null;
}

function saveAudioToCache(text, audioBuffer, modelVersion = "v2", voiceName = "lid") {
  const cachePath = path.join(CACHE_DIR, `${getCacheKey(text, modelVersion, voiceName)}.mp3`);
  fs.writeFileSync(cachePath, audioBuffer);
}

const queue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const task = queue.shift();
  try {
    await task();
  } catch (err) {
    console.error("❌ Queue error:", err.message);
  } finally {
    isProcessing = false;
    processQueue();
  }
}

function addToQueue(task) {
  queue.push(task);
  processQueue();
}

const processedMessages = new Set();
function isDuplicate(msgId) {
  if (!msgId) return false;
  if (processedMessages.has(msgId)) return true;
  processedMessages.add(msgId);
  setTimeout(() => processedMessages.delete(msgId), 5 * 60 * 1000);
  return false;
}

function containsHangul(text) {
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
}

function extractHangul(text) {
  const index = text.search(/[\uAC00-\uD7AF]/);
  if (index === -1) return "";
  return text.slice(index).trim();
}

function sanitizeFilename(text) {
  return (
    text
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .trim()
      .slice(0, 50) || "tts_output"
  );
}

function getNowPartsInJakarta() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    timeLabel: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function formatJakartaDate(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

function getSenderJid(msg) {
  return msg.key.participant || msg.participant || msg.key.remoteJid || "";
}

function normalizePhoneNumber(jid = "") {
  const raw = jid.split(":")[0].split("@")[0].replace(/\D/g, "");
  return raw || "unknown";
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
function loadContacts() {
  try {
    if (!fs.existsSync(CONTACTS_FILE)) return {};
    const raw = fs.readFileSync(CONTACTS_FILE, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveContact(phoneNumber, pushName) {
  if (!pushName || !phoneNumber || phoneNumber === "unknown") return;
  try {
    const contacts = loadContacts();
    if (contacts[phoneNumber] === pushName) return;
    contacts[phoneNumber] = pushName;
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
  } catch (err) {
    console.error("❌ Gagal simpan kontak:", err.message);
  }
}

function getDisplayName(phoneNumber) {
  const contacts = loadContacts();
  return contacts[phoneNumber]
    ? `${contacts[phoneNumber]} (${phoneNumber})`
    : phoneNumber;
}

// ─── Last Generate (global, bukan per-sender) ─────────────────────────────────
function loadLastGenerate() {
  try {
    if (!fs.existsSync(LAST_GENERATE_FILE)) return null;
    const raw = fs.readFileSync(LAST_GENERATE_FILE, "utf8");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLastGenerate(data) {
  try {
    fs.writeFileSync(LAST_GENERATE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Gagal simpan last generate:", err.message);
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function loadGenerateStats() {
  try {
    if (!fs.existsSync(STATS_FILE)) return {};
    const raw = fs.readFileSync(STATS_FILE, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("❌ Gagal membaca file statistik:", err.message);
    return {};
  }
}

function saveGenerateStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error("❌ Gagal menyimpan file statistik:", err.message);
  }
}

function pruneOldStats(stats, keepDays = 30) {
  const dates = Object.keys(stats).sort();
  if (dates.length <= keepDays) return stats;

  const trimmed = { ...stats };
  for (const dateKey of dates.slice(0, dates.length - keepDays)) {
    delete trimmed[dateKey];
  }
  return trimmed;
}

function incrementGenerateCount(groupId, senderJid, pushName) {
  const dateKey = getNowPartsInJakarta().dateKey;
  const phoneNumber = normalizePhoneNumber(senderJid);

  if (pushName) saveContact(phoneNumber, pushName);

  let stats = pruneOldStats(loadGenerateStats());

  if (!stats[dateKey]) stats[dateKey] = {};
  if (!stats[dateKey][groupId]) stats[dateKey][groupId] = {};
  stats[dateKey][groupId][phoneNumber] = (stats[dateKey][groupId][phoneNumber] || 0) + 1;

  saveGenerateStats(stats);
  return stats[dateKey][groupId][phoneNumber];
}

function getTodayGroupStats(groupId) {
  const dateKey = getNowPartsInJakarta().dateKey;
  const stats = loadGenerateStats();
  return stats[dateKey]?.[groupId] || {};
}

// ─── Daily Report ─────────────────────────────────────────────────────────────
async function buildDailyReportText(groupId) {
  const { dateKey } = getNowPartsInJakarta();
  const todayStats = getTodayGroupStats(groupId);
  const entries = Object.entries(todayStats).sort((a, b) => b[1] - a[1]);

  const credit = await getElevenLabsCredit();
  const creditLine = credit
    ? `💳 Sisa kredit ElevenLabs: ${credit.remaining.toLocaleString("id-ID")} karakter (${credit.pct}%)`
    : `💳 Gagal cek kredit ElevenLabs`;

  if (entries.length === 0) {
    return [
      `📊 Laporan Generate Hari Ini`,
      `📅 ${formatJakartaDate(dateKey)}`,
      ``,
      `Belum ada generate hari ini.`,
      ``,
      creditLine,
    ].join("\n");
  }

  const totalGenerate = entries.reduce((sum, [, count]) => sum + count, 0);
  const lines = entries.map(([phoneNumber, count]) => {
    const display = getDisplayName(phoneNumber);
    return `👤 ${display}: ${count}x generate`;
  });

  return [
    `📊 Laporan Generate Hari Ini`,
    `📅 ${formatJakartaDate(dateKey)}`,
    ``,
    ...lines,
    ``,
    `Total: ${totalGenerate}x generate`,
    creditLine,
  ].join("\n");
}

async function sendDailyReports() {
  const sock = activeSock;
  if (!sock) return;

  const now = getNowPartsInJakarta();
  if (now.hour !== "16" || now.minute !== "00") return;

  const markerPath = path.join(BACKUP_DIR, `report_sent_${now.dateKey}.json`);
  let sentMap = {};

  try {
    if (fs.existsSync(markerPath)) {
      sentMap = JSON.parse(fs.readFileSync(markerPath, "utf8") || "{}");
    }
  } catch (err) {
    console.error("❌ Gagal membaca marker laporan:", err.message);
  }

  for (const groupId of WHITELISTED_GROUPS) {
    if (sentMap[groupId]) continue;

    try {
      const reportText = await buildDailyReportText(groupId);
      await sock.sendMessage(groupId, { text: reportText });
      sentMap[groupId] = true;
      fs.writeFileSync(markerPath, JSON.stringify(sentMap, null, 2));
      console.log(`✅ Laporan harian terkirim ke ${groupId}`);
    } catch (err) {
      console.error(`❌ Gagal kirim laporan ke ${groupId}:`, err.message);
    }
  }
}

function startReportScheduler() {
  if (reportSchedulerStarted) return;
  reportSchedulerStarted = true;

  setInterval(() => {
    sendDailyReports().catch((err) => {
      console.error("❌ Scheduler laporan error:", err.message);
    });
  }, 30 * 1000);
}

// ─── Parser command TTS ───────────────────────────────────────────────────────
function parseTtsCommand(rawText, command) {
  const commandWithSlash = `/${command}`;
  const payload = rawText.slice(commandWithSlash.length).trim();

  const errorMsg =
    `⚠️ Format:\n` +
    `  ${commandWithSlash} lid | namafile | teks Korea\n` +
    `  ${commandWithSlash} juhi | namafile | teks Korea`;

  if (!payload) return { error: errorMsg };

  const delimiterCount = (payload.match(/\|/g) || []).length;
  if (delimiterCount !== 2) {
    return { error: `❌ Format salah! Harus tepat 2 separator "|"\n\n${errorMsg}` };
  }

  const parts = payload.split("|");
  if (parts.length !== 3) return { error: errorMsg };

  const rawVoice = parts[0].trim().toLowerCase();
  const rawFilename = parts[1].trim();
  const rawTextInput = parts[2].trim();

  if (rawVoice !== "lid" && rawVoice !== "juhi") {
    return {
      error: `❌ Voice tidak valid: "${rawVoice}"\nGunakan: lid atau juhi\n\n${errorMsg}`,
    };
  }

  if (rawTextInput.includes("|")) {
    return { error: `❌ Teks tidak boleh mengandung karakter "|"` };
  }

  const filename = sanitizeFilename(rawFilename);
  if (!filename) return { error: `❌ Nama file tidak boleh kosong.` };
  if (!rawTextInput) return { error: `❌ Teks TTS tidak boleh kosong.` };

  const cleanText = extractHangul(rawTextInput);
  if (!cleanText) {
    return { error: `❌ Teks harus mengandung Hangul dan dimulai dari karakter Korea.` };
  }

  return { voiceName: rawVoice, filename, ttsText: cleanText };
}

// ─── ElevenLabs ───────────────────────────────────────────────────────────────
async function getElevenLabsCredit() {
  try {
    const res = await axios.get("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    });

    const { character_count, character_limit } = res.data;
    const remaining = character_limit - character_count;
    const pct = ((remaining / character_limit) * 100).toFixed(1);

    return {
      used: character_count,
      remaining,
      limit: character_limit,
      pct,
    };
  } catch (err) {
    console.error("❌ Gagal cek kredit:", err.message);
    return null;
  }
}

async function generateTTS(text, modelVersion = "v2", voiceId = KASSANDRA_VOICE_ID) {
  const modelId = modelVersion === "v3" ? "eleven_v3" : "eleven_multilingual_v2";

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: modelId,
      voice_settings: {
        speed: 1,
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
      },
    },
    {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "arraybuffer",
    }
  );

  return Buffer.from(response.data);
}

async function createZip(audioBuffer, filename) {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(TMP_DIR, `${filename}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(zipPath));
    archive.on("error", reject);

    archive.pipe(output);
    archive.append(audioBuffer, { name: `${filename}.mp3` });
    archive.finalize();
  });
}

// ─── Bot ──────────────────────────────────────────────────────────────────────
async function startBot() {
  if (activeSock) {
    try {
      activeSock.end(undefined);
    } catch {}
    activeSock = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    getMessage: async () => {
      return { conversation: "" };
    },
  });

  activeSock = sock;
  startReportScheduler();

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      const qrHtmlPath = path.join(TMP_DIR, "qr.html");
      const qrHtml = [
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Scan QR</title>',
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>',
        '<style>',
        'body{background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#fff;}',
        'h2{margin-bottom:16px;font-size:16px;color:#e5b84a;}',
        '.wrap{background:#fff;padding:16px;border-radius:8px;}',
        'p{margin-top:12px;font-size:12px;color:#888;}',
        '</style></head>',
        '<body>',
        '<h2>📱 Scan QR Code WhatsApp</h2>',
        '<div class="wrap"><div id="qr"></div></div>',
        '<p>WhatsApp → Perangkat Tertaut → Tautkan Perangkat</p>',
        `<script>new QRCode(document.getElementById("qr"),{text:"${qr}",width:280,height:280});<\/script>`,
        '</body></html>',
      ].join("\n");
      fs.writeFileSync(qrHtmlPath, qrHtml);
      require("child_process").exec(`start "" "${qrHtmlPath}"`);
      console.log("QR dibuka di browser.");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("❌ Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startBot();
    }

    if (connection === "open") {
      console.log("✅ WhatsApp connected!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      const from = msg.key.remoteJid;
      if (!from) continue;

      const isGroup = from.endsWith("@g.us");
      if (isGroup && !WHITELISTED_GROUPS.includes(from)) continue;

      const msgId = msg.key.id;
      if (isDuplicate(msgId)) continue;

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.ephemeralMessage?.message?.conversation ||
        msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
        "";

      console.log("MESSAGE IN:", { from, fromMe: msg.key.fromMe, text });

      if (!text) continue;

      if (text.toLowerCase() === "/ping") {
        const credit = await getElevenLabsCredit();
        const creditInfo = credit
          ? `\n📊 Sisa kredit: ${credit.remaining.toLocaleString()} karakter (${credit.pct}%)`
          : "\n❌ Gagal cek kredit ElevenLabs";

        await sock.sendMessage(from, {
          text: `🤖 Bot aktif! ✅\n⏰ ${new Date().toLocaleString("id-ID", { timeZone: TIMEZONE })}${creditInfo}`,
        });
        continue;
      }

      if (text.toLowerCase() === "/test") {
        await sock.sendMessage(from, { text: "🔧 Testing API ElevenLabs..." });
        try {
          const audioBuffer = await generateTTS("세");
          const zipPath = await createZip(audioBuffer, "test");

          await sock.sendMessage(from, {
            document: fs.readFileSync(zipPath),
            mimetype: "application/zip",
            fileName: "test.zip",
            caption: "✅ API ElevenLabs OK!",
          });

          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        } catch (err) {
          await sock.sendMessage(from, {
            text: `❌ API ElevenLabs GAGAL!\nError: ${err.message}`,
          });
        }
        continue;
      }

      if (text.toLowerCase() === "/report") {
        if (!isGroup) {
          await sock.sendMessage(from, {
            text: "⚠️ Command /report hanya bisa dipakai di grup whitelist.",
          });
          continue;
        }

        await sock.sendMessage(from, {
          text: await buildDailyReportText(from),
        });
        continue;
      }

      if (text.toLowerCase() === "/resend") {
        const last = loadLastGenerate();

        if (!last) {
          await sock.sendMessage(from, {
            text: "❌ Belum ada generate TTS apapun sejak bot terakhir jalan.",
          });
          continue;
        }

        const cachedPath = getCachedAudio(last.ttsText, last.modelVersion, last.voiceName || "lid");

        if (!cachedPath) {
          await sock.sendMessage(from, {
            text: `❌ Cache untuk generate terakhir tidak ditemukan.\nGenerate ulang pakai /tts ya.`,
          });
          continue;
        }

        await sock.sendMessage(from, {
          text: `🔁 Mengirim ulang generate terakhir...`,
        });

        addToQueue(async () => {
          let zipPath = null;
          try {
            const audioBuffer = fs.readFileSync(cachedPath);
            zipPath = await createZip(audioBuffer, last.filename);

            const voiceLabel = (last.voiceName || "lid") === "juhi" ? "Juhee" : "Kassandra";
            const modelLabel = `${voiceLabel} ${(last.modelVersion || "v2").toUpperCase()} (${last.modelVersion === "v3" ? "eleven_v3" : "eleven_multilingual_v2"})`;

            await sock.sendMessage(from, {
              document: fs.readFileSync(zipPath),
              mimetype: "application/zip",
              fileName: `${last.filename}.zip`,
              caption:
                `🔁 *Resend dari cache*\n` +
                `🎵 Voice: ${modelLabel}\n` +
                `📝 "${last.ttsText.slice(0, 60)}${last.ttsText.length > 60 ? "..." : ""}"\n` +
                `⚡ Kredit tidak terpakai (dari cache)`,
            });
          } catch (err) {
            console.error("❌ Error resend:", err.message);
            await sock.sendMessage(from, {
              text: `❌ Gagal resend.\nError: ${err.message}`,
            });
          } finally {
            if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
          }
        });
        continue;
      }

      const lowerText = text.toLowerCase();
      const isV3 = lowerText.startsWith("/ttsv3");
      const isV2 = !isV3 && lowerText.startsWith("/tts");
      if (!isV2 && !isV3) continue;

      const modelVersion = isV3 ? "v3" : "v2";
      const commandName = isV3 ? "ttsv3" : "tts";
      const parsed = parseTtsCommand(text, commandName);

      if (parsed.error) {
        await sock.sendMessage(from, { text: parsed.error });
        continue;
      }

      const { voiceName, filename, ttsText } = parsed;

      const voiceId = voiceName === "juhi" ? JUHEE_VOICE_ID : KASSANDRA_VOICE_ID;
      const voiceLabel = voiceName === "juhi" ? "Juhee" : "Kassandra";
      const modelLabel = `${voiceLabel} ${modelVersion.toUpperCase()} (${modelVersion === "v3" ? "eleven_v3" : "eleven_multilingual_v2"})`;

      console.log("🎤 VOICE DEBUG:", {
        inputVoice: voiceName,
        resolvedVoiceId: voiceId,
        modelVersion,
      });

      if (!voiceId || voiceId.includes("YOUR_")) {
        await sock.sendMessage(from, {
          text: `❌ Voice ID belum diset dengan benar di .env`,
        });
        continue;
      }

      if (!containsHangul(ttsText) || !/^[\uAC00-\uD7AF]/.test(ttsText)) {
        await sock.sendMessage(from, {
          text: `❌ Teks harus mengandung huruf Korea (Hangul) dan harus dimulai dari Hangul!\nContoh: /${commandName} ${voiceName} | namafile | 안녕하세요`,
        });
        continue;
      }

      await sock.sendMessage(from, {
        text: `⏳ Sedang memproses TTS kamu (${voiceLabel} ${modelVersion.toUpperCase()}), mohon tunggu sebentar...`,
      });

      addToQueue(async () => {
        let zipPath = null;
        let fromCache = false;

        try {
          let audioBuffer = null;
          const cachedAudio = getCachedAudio(ttsText, modelVersion, voiceName);

          if (cachedAudio) {
            audioBuffer = fs.readFileSync(cachedAudio);
            fromCache = true;
          } else {
            audioBuffer = await generateTTS(ttsText, modelVersion, voiceId);
            saveAudioToCache(ttsText, audioBuffer, modelVersion, voiceName);
          }

          zipPath = await createZip(audioBuffer, filename);

          saveLastGenerate({ ttsText, filename, modelVersion, voiceName });

          const usageCount = incrementGenerateCount(from, getSenderJid(msg), msg.pushName);

          const credit = await getElevenLabsCredit();
          const cacheTag = fromCache ? `\n⚡ *Dari cache* (kredit tidak terpakai)` : "";
          const creditInfo = credit
            ? `\n\n📊 *Kredit ElevenLabs:*\n• Karakter teks ini: ${fromCache ? "0 (cache)" : ttsText.length.toLocaleString()}\n• Sisa kredit: ${credit.remaining.toLocaleString()} karakter (${credit.pct}%)`
            : "";

          await sock.sendMessage(from, {
            document: fs.readFileSync(zipPath),
            mimetype: "application/zip",
            fileName: `${filename}.zip`,
            caption:
              `✅ TTS selesai!\n🎵 Voice: ${modelLabel}\n📝 "${ttsText.slice(0, 60)}${ttsText.length > 60 ? "..." : ""}"\n👤 Generate kamu hari ini: ${usageCount}x` +
              cacheTag +
              creditInfo,
          });
        } catch (err) {
          console.error("❌ Error:", err.message);
          await sock.sendMessage(from, {
            text: `❌ Gagal memproses TTS.\nError: ${err.message}`,
          });
        } finally {
          if (zipPath && fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
          }
        }
      });
    }
  });
}

startBot().catch(console.error);
