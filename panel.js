const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PANEL_PORT || 3000;
const BOT_SCRIPT = path.join(__dirname, "index.js");
const AUTH_DIR = path.join(__dirname, "auth_info");
const QR_FILE = path.join(__dirname, "tmp", "qr.txt");
const TMP_DIR = path.join(__dirname, "tmp");

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

let botProcess = null;
let botLogs = [];
let botStatus = "stopped";

function addLog(msg) {
  const ts = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" });
  const line = `[${ts}] ${msg}`;
  botLogs.push(line);
  if (botLogs.length > 100) botLogs = botLogs.slice(-100);
  console.log(line);
}

function clearQR() {
  try { if (fs.existsSync(QR_FILE)) fs.unlinkSync(QR_FILE); } catch {}
}

function startBotProcess() {
  if (botProcess) return { ok: false, msg: "Bot sudah berjalan." };
  botStatus = "starting";
  clearQR();
  addLog("▶ Starting bot...");

  botProcess = spawn("node", [BOT_SCRIPT], {
    cwd: __dirname,
    env: { ...process.env },
  });

  botProcess.stdout.on("data", (d) => {
    const lines = d.toString().trim().split("\n");
    lines.forEach((l) => {
      if (!l.trim()) return;
      if (l.startsWith("QR_DATA:")) {
        const qrStr = l.replace("QR_DATA:", "").trim();
        fs.writeFileSync(QR_FILE, qrStr, "utf8");
        addLog("📱 QR siap di-scan (lihat panel)");
        botStatus = "starting";
        return;
      }
      addLog(l.trim());
      if (l.includes("WhatsApp connected")) { botStatus = "running"; clearQR(); }
    });
  });

  botProcess.stderr.on("data", (d) => {
    d.toString().trim().split("\n").forEach((l) => { if (l.trim()) addLog("⚠ " + l.trim()); });
  });

  botProcess.on("exit", (code) => {
    addLog(`⏹ Bot berhenti (exit code: ${code})`);
    botProcess = null;
    botStatus = "stopped";
    clearQR();
  });

  botProcess.on("error", (err) => {
    addLog(`❌ Spawn error: ${err.message}`);
    botProcess = null;
    botStatus = "stopped";
  });

  return { ok: true, msg: "Bot starting..." };
}

function stopBotProcess() {
  if (!botProcess) return { ok: false, msg: "Bot tidak sedang berjalan." };
  botStatus = "stopping";
  addLog("⏹ Stopping bot...");
  botProcess.kill("SIGTERM");
  setTimeout(() => { if (botProcess) { botProcess.kill("SIGKILL"); addLog("⛔ Force killed."); } }, 5000);
  return { ok: true, msg: "Stop signal dikirim." };
}

// ─── API ──────────────────────────────────────────────────────────────────────
app.use(express.json());

app.get("/api/status", (req, res) => {
  res.json({ status: botStatus, pid: botProcess?.pid || null, logs: botLogs.slice(-40) });
});

app.get("/api/qr", (req, res) => {
  try {
    if (fs.existsSync(QR_FILE)) {
      const qrStr = fs.readFileSync(QR_FILE, "utf8").trim();
      res.json({ ok: true, qr: qrStr });
    } else {
      res.json({ ok: false });
    }
  } catch { res.json({ ok: false }); }
});

app.post("/api/start", (req, res) => res.json(startBotProcess()));
app.post("/api/stop",  (req, res) => res.json(stopBotProcess()));

app.post("/api/relog", (req, res) => {
  stopBotProcess();
  setTimeout(() => {
    try {
      if (fs.existsSync(AUTH_DIR)) { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); addLog("🗑 Auth dihapus."); }
      setTimeout(() => startBotProcess(), 1000);
      res.json({ ok: true, msg: "Auth dihapus, bot restart untuk scan QR ulang." });
    } catch (err) { res.json({ ok: false, msg: "Gagal hapus auth: " + err.message }); }
  }, 3000);
});

// ─── Panel HTML ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TTS Bot Panel</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></scr` + `ipt>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0d0d0f; --surface: #141416; --border: #1f1f24;
    --text: #e2e2e8; --muted: #5a5a6e;
    --green: #2dba6f; --green-glow: rgba(45,186,111,0.15);
    --red: #e05252;   --red-glow: rgba(224,82,82,0.15);
    --yellow: #e5b84a;--yellow-glow: rgba(229,184,74,0.12);
    --blue: #4a8fe5;  --blue-glow: rgba(74,143,229,0.12);
  }
  body { font-family:'JetBrains Mono',monospace; background:var(--bg); color:var(--text); min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:32px 24px; }
  .header { text-align:center; margin-bottom:24px; }
  .header .sub { font-size:11px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); }
  .header .title { font-size:22px; font-weight:700; color:var(--text); margin-top:4px; }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:10px; width:100%; max-width:900px; overflow:hidden; }
  .status-bar { display:flex; align-items:center; gap:10px; padding:14px 20px; border-bottom:1px solid var(--border); }
  .dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; transition:background .3s,box-shadow .3s; }
  .dot.running  { background:var(--green);  box-shadow:0 0 8px var(--green);  animation:pulse 2s infinite; }
  .dot.starting { background:var(--yellow); box-shadow:0 0 8px var(--yellow); animation:pulse .8s infinite; }
  .dot.stopping { background:var(--yellow); box-shadow:0 0 8px var(--yellow); }
  .dot.stopped  { background:var(--muted);  box-shadow:none; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .status-label { font-size:12px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; }
  .status-label.running  { color:var(--green); }
  .status-label.starting { color:var(--yellow); }
  .status-label.stopping { color:var(--yellow); }
  .status-label.stopped  { color:var(--muted); }
  .pid { margin-left:auto; font-size:11px; color:var(--muted); }
  .controls { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--border); border-bottom:1px solid var(--border); }
  .btn { background:var(--surface); border:none; color:var(--text); font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:600; letter-spacing:.08em; padding:16px 12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:background .15s; }
  .btn:hover { filter:brightness(1.2); }
  .btn:active { transform:scale(.97); }
  .btn:disabled { opacity:.3; cursor:not-allowed; transform:none; filter:none; }
  .btn.start  { color:var(--green);  } .btn.start:hover  { background:var(--green-glow); }
  .btn.stop   { color:var(--red);    } .btn.stop:hover   { background:var(--red-glow); }
  .btn.relog  { color:var(--yellow); } .btn.relog:hover  { background:var(--yellow-glow); }
  .btn.refresh{ color:var(--blue);   } .btn.refresh:hover{ background:var(--blue-glow); }
  .qr-section { border-bottom:1px solid var(--border); padding:20px; display:none; flex-direction:column; align-items:center; gap:12px; }
  .qr-section.visible { display:flex; }
  .qr-label { font-size:11px; color:var(--yellow); letter-spacing:.1em; text-transform:uppercase; font-weight:600; }
  .qr-wrap { background:#fff; padding:14px; border-radius:8px; display:inline-block; line-height:0; }
  .qr-hint { font-size:10px; color:var(--muted); text-align:center; }
  .log-header { display:flex; align-items:center; justify-content:space-between; padding:10px 20px; border-bottom:1px solid var(--border); }
  .log-header span { font-size:10px; text-transform:uppercase; letter-spacing:.15em; color:var(--muted); font-weight:600; }
  .log-clear { background:none; border:none; color:var(--muted); font-family:inherit; font-size:10px; cursor:pointer; padding:2px 6px; border-radius:4px; }
  .log-clear:hover { color:var(--text); background:var(--border); }
  .log-box { height:420px; overflow-y:auto; padding:12px 20px; font-size:11px; line-height:1.7; color:var(--muted); scrollbar-width:thin; scrollbar-color:var(--border) transparent; }
  .log-box .line { white-space:pre-wrap; word-break:break-all; }
  .log-box .line.ok   { color:var(--green); }
  .log-box .line.err  { color:var(--red); }
  .log-box .line.warn { color:var(--yellow); }
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(16px); background:var(--surface); border:1px solid var(--border); color:var(--text); font-size:12px; padding:10px 20px; border-radius:8px; opacity:0; pointer-events:none; transition:opacity .2s,transform .2s; white-space:nowrap; z-index:999; }
  .toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
  .footer { margin-top:16px; font-size:10px; color:var(--muted); letter-spacing:.08em; }
</style>
</head>
<body>
<div class="header">
  <div class="sub">WhatsApp TTS Bot</div>
  <div class="title">Control Panel</div>
</div>
<div class="card">
  <div class="status-bar">
    <div class="dot stopped" id="dot"></div>
    <span class="status-label stopped" id="statusLabel">STOPPED</span>
    <span class="pid" id="pidLabel"></span>
  </div>
  <div class="controls">
    <button class="btn start"   onclick="action('start')">▶ START</button>
    <button class="btn stop"    onclick="action('stop')">⏹ STOP</button>
    <button class="btn refresh" onclick="fetchStatus()">↻ REFRESH</button>
    <button class="btn relog"   onclick="action('relog')">⟳ RELOG</button>
  </div>
  <div class="qr-section" id="qrSection">
    <div class="qr-label">📱 Scan QR Code</div>
    <div class="qr-wrap"><div id="qrCanvas"></div></div>
    <div class="qr-hint">WhatsApp → Perangkat Tertaut → Tautkan Perangkat</div>
  </div>
  <div class="log-header">
    <span>📋 Logs</span>
    <button class="log-clear" onclick="document.getElementById('logBox').innerHTML=''">clear</button>
  </div>
  <div class="log-box" id="logBox">
    <div class="line" style="color:#3a3a4e">-- memuat... --</div>
  </div>
</div>
<div class="footer">panel v1.1 · localhost:${PORT}</div>
<div class="toast" id="toast"></div>
<script>
let lastQrStr = null;
function showToast(msg, dur=2500) {
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),dur);
}
function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function renderLogs(lines) {
  const box=document.getElementById('logBox');
  if(!lines||!lines.length){box.innerHTML='<div class="line" style="color:#3a3a4e">-- log kosong --</div>';return;}
  box.innerHTML=lines.map(l=>{
    let c='';
    if(l.includes('✅')||l.includes('connected')||l.includes('▶')||l.includes('OK'))c='ok';
    else if(l.includes('❌')||l.includes('Error')||l.includes('GAGAL'))c='err';
    else if(l.includes('⚠')||l.includes('QR')||l.includes('⏹')||l.includes('📱'))c='warn';
    return '<div class="line '+c+'">'+esc(l)+'</div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
}
function renderQR(qrStr) {
  if(qrStr===lastQrStr)return;
  lastQrStr=qrStr;
  const canvas=document.getElementById('qrCanvas');
  canvas.innerHTML='';
  new QRCode(canvas,{text:qrStr,width:220,height:220,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});
  document.getElementById('qrSection').classList.add('visible');
}
function hideQR(){ document.getElementById('qrSection').classList.remove('visible'); lastQrStr=null; }
function updateUI(status,pid,logs) {
  const dot=document.getElementById('dot'),label=document.getElementById('statusLabel'),pidEl=document.getElementById('pidLabel');
  dot.className='dot '+status; label.className='status-label '+status; label.textContent=status.toUpperCase();
  pidEl.textContent=pid?'PID '+pid:'';
  if(logs)renderLogs(logs);
}
async function fetchStatus() {
  try {
    const d=await fetch('/api/status').then(r=>r.json());
    updateUI(d.status,d.pid,d.logs);
    if(d.status==='starting'){
      const q=await fetch('/api/qr').then(r=>r.json());
      if(q.ok)renderQR(q.qr);
    } else if(d.status==='running'||d.status==='stopped'){ hideQR(); }
  } catch(e){}
}
async function action(type) {
  const btns=document.querySelectorAll('.btn'); btns.forEach(b=>b.disabled=true);
  try {
    const d=await fetch('/api/'+type,{method:'POST'}).then(r=>r.json());
    showToast(d.msg);
    setTimeout(fetchStatus,800); setTimeout(fetchStatus,2500);
    if(type==='relog')setTimeout(fetchStatus,5500);
  } catch(e){showToast('❌ Request gagal');}
  finally{setTimeout(()=>btns.forEach(b=>b.disabled=false),1200);}
}
fetchStatus();
setInterval(fetchStatus,3000);
</script>
</body>
</html>`);
});

// ─── Start server + auto-start bot ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🖥  Panel berjalan di: http://localhost:${PORT}\n`);
  addLog(`🖥  Panel aktif di http://localhost:${PORT}`);
  setTimeout(() => startBotProcess(), 500);
});