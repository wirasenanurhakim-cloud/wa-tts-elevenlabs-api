# 🎙️ WA TTS Bot — Kassandra V2

Bot WhatsApp yang mengkonversi teks ke suara menggunakan ElevenLabs (voice Kassandra V2), lalu mengirim hasilnya dalam format ZIP.

## Cara Kerja

```
User kirim: /TTS Halo, selamat datang!
     ↓
Bot terima pesan via Baileys (WA)
     ↓
Teks dikirim ke ElevenLabs API (Kassandra V2)
     ↓
File .mp3 dikemas dalam .zip
     ↓
ZIP dikirim balik ke user di WhatsApp
```

---

## 📋 Prasyarat

- Node.js v18+
- Akun ElevenLabs (https://elevenlabs.io)
- Nomor WhatsApp aktif (untuk scan QR)

---

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Konfigurasi `.env`
=======
# 🤖 WhatsApp TTS Bot — ElevenLabs API

Bot WhatsApp untuk generate **Text-to-Speech (TTS)** menggunakan ElevenLabs API.
Mendukung multiple voice, caching untuk hemat kredit, serta laporan penggunaan harian.

---

## 📌 Overview

Project ini adalah automation bot berbasis WhatsApp yang:

* menerima command dari user
* memproses text (khususnya Hangul/Korea)
* generate audio via ElevenLabs
* mengirim hasil audio kembali ke WhatsApp

Cocok untuk:

* konten creator (voice generation)
* automation tools
* eksperimen AI voice pipeline

---

## 🧠 System Flow

User (WhatsApp)
→ Bot (Baileys)
→ ElevenLabs API
→ Audio (.mp3 → .zip)
→ Dikirim kembali ke WhatsApp

---

## 🚀 Features

* 🎤 **Multi Voice Support**

  * Kassandra (v2 / v3)
  * Juhee (v2 / v3)

* ⚡ **Queue System**
  Mencegah spam request & menjaga stabilitas bot

* 💾 **Audio Caching**

  * Menghindari generate ulang
  * Menghemat kredit ElevenLabs

* 📊 **Daily Usage Report**

  * Statistik penggunaan per grup
  * Tracking jumlah generate per user

* 🔁 **Resend Feature**
  Kirim ulang audio terakhir tanpa konsumsi kredit

* 🔐 **Whitelist Group System**
  Bot hanya aktif di grup tertentu

---

## ⚙️ Requirements

* Node.js >= 18
* Akun ElevenLabs (API Key)
* WhatsApp (untuk scan QR)

---

## 📦 Installation

```bash
git clone https://github.com/wirasenanurhakim-cloud/wa-tts-elevenlabs-api.git
cd wa-tts-elevenlabs-api
npm install
```

---

## 🔧 Setup

Copy file environment:
>>>>>>> 1972f45f87ea19d691d1d9618b3d9069894c2e29

```bash
cp .env.example .env
```

<<<<<<< HEAD
Isi file `.env`:

```env
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxx
KASSANDRA_VOICE_ID=xxxxxxxxxxxxxxxx
```

### 3. Cari Voice ID Kassandra V2

```bash
node get-voice-id.js
```

Salin Voice ID yang muncul ke `.env` pada bagian `KASSANDRA_VOICE_ID`.

> Jika Kassandra tidak muncul, berarti voice tersebut belum ada di akun kamu.  
> Kamu bisa tambahkan lewat: https://elevenlabs.io/voice-library → cari "Kassandra"

### 4. Jalankan bot

```bash
npm start
```

Scan QR code yang muncul di terminal menggunakan WhatsApp di HP kamu.

---

## 💬 Cara Pakai

Kirim pesan ke nomor WhatsApp bot:

```
/TTS Halo, ini adalah test suara Kassandra
```

Bot akan membalas dengan file ZIP berisi file `.mp3` hasil TTS.

---

## ⚙️ Pengaturan Voice (ElevenLabs)

Setting default yang digunakan di `index.js`:

| Parameter | Value | Keterangan |
|---|---|---|
| `model_id` | `eleven_multilingual_v2` | Model terbaru, support bahasa Indonesia |
| `stability` | `0.5` | Konsistensi suara |
| `similarity_boost` | `0.75` | Kemiripan dengan suara asli |
| `style` | `0.0` | Style ekspresif (0 = netral) |
| `use_speaker_boost` | `true` | Kualitas lebih jernih |

Ubah nilai-nilai ini di `index.js` sesuai kebutuhan.

---

## 📁 Struktur File

```
wa-tts-bot/
├── index.js          # Bot utama
├── get-voice-id.js   # Helper cari Voice ID
├── package.json
├── .env.example
├── .env              # (buat sendiri, jangan di-commit)
├── auth_info/        # (auto-generate saat login WA)
└── tmp/              # (folder temp, auto-cleanup)
=======
Isi `.env`:

```env
ELEVENLABS_API_KEY=your_api_key
KASSANDRA_VOICE_ID=your_voice_id
JUHEE_VOICE_ID=your_voice_id
OWNER_NUMBER=628xxxxxxxx

WHITELISTED_GROUPS=120xxx@g.us,120xxx@g.us
DEBUG=false
```

---

## ▶️ Run Bot

```bash
node index.js
```

* QR Code akan muncul
* Scan melalui WhatsApp:

  > Perangkat Tertaut → Tautkan Perangkat

---

## 💬 Commands

### Generate TTS (v2)

```bash
/tts lid | namafile | 안녕하세요
```

### Generate TTS (v3)

```bash
/ttsv3 juhi | namafile | 안녕하세요
```

### Ping bot

```bash
/ping
```

### Daily report

```bash
/report
```

### Resend last audio

```bash
/resend
>>>>>>> 1972f45f87ea19d691d1d9618b3d9069894c2e29
```

---

<<<<<<< HEAD
## ⚠️ Catatan

- Sesi WhatsApp tersimpan di folder `auth_info/`. Jangan dihapus agar tidak perlu scan QR ulang.
- Bot menggunakan **Baileys** (library WA unofficial). Gunakan dengan bijak sesuai ToS WhatsApp.
- Untuk production, pertimbangkan menggunakan **WhatsApp Business API** resmi.
- File temp di folder `tmp/` otomatis dihapus setelah dikirim.
=======
## 📁 Project Structure

```bash
index.js            # Main bot logic
panel.js            # Panel / control logic
get-voice-id.js     # Helper untuk voice ID

.env.example        # Environment template
package.json        # Dependencies

*.bat / *.vbs       # Automation scripts (Windows)
```

---

## ⚠️ Notes

* Project ini dibuat untuk **automation & portfolio**
* Beberapa bagian masih monolithic (belum modular)
* Tidak disarankan langsung untuk production tanpa refactor

---

## 🔒 Security

* Jangan pernah commit `.env`
* Jangan commit folder `auth_info/`
* API key harus disimpan di environment variable

---

## 📊 Tech Stack

* Node.js
* Baileys (WhatsApp Web API)
* ElevenLabs API
* Axios

---

## 🎯 Future Improvements

* Modular architecture (service-based)
* Web dashboard (replace VBS automation)
* Multi-platform bot (Telegram / Discord)
* Job queue scaling (Redis / Bull)

---

## 👤 Author

Developed as personal automation project & portfolio.

---

## 📄 License

MIT License
>>>>>>> 1972f45f87ea19d691d1d9618b3d9069894c2e29
