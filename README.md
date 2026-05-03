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

```bash
cp .env.example .env
```

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
```

---

## ⚠️ Catatan

- Sesi WhatsApp tersimpan di folder `auth_info/`. Jangan dihapus agar tidak perlu scan QR ulang.
- Bot menggunakan **Baileys** (library WA unofficial). Gunakan dengan bijak sesuai ToS WhatsApp.
- Untuk production, pertimbangkan menggunakan **WhatsApp Business API** resmi.
- File temp di folder `tmp/` otomatis dihapus setelah dikirim.
