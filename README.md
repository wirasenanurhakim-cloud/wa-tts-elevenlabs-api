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

```bash
cp .env.example .env
```

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
```

---

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
