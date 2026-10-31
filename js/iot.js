// Jembatan game -> NodeMCU (ESP8266), lewat server.py (/api/...).
// Game tidak pernah menunggu ESP: semua perintah dikirim antrean di belakang layar,
// kalau ESP mati / belum tersambung, game tetap jalan normal.
//
// Pembagian tugas:
//   - Game (browser) yang memutuskan hasil: stage mulai, kuis ranjau, clear, hancur.
//   - ESP hanya menjalankan hitung mundur LCD + beep sendiri (tidak perlu kirim tiap detik),
//     jadi tampilan tetap mulus walau WiFi sempat lag.

const IOT = {
    online: false,
    queue: [],
    busy: false,
    MAX_QUEUE: 10
};

// Kirim satu perintah (path ESP, mis. "/stage/start?stage=1&t=60"). Berurutan, tidak memblokir game.
function sendIoTCommand(path) {
    if (!CONFIG.IOT_ENABLED) return;
    IOT.queue.push(path);
    // Kalau antrean menumpuk (ESP lama tidak menjawab), buang yang paling lama.
    while (IOT.queue.length > IOT.MAX_QUEUE) IOT.queue.shift();
    pumpIoTQueue();
}

async function pumpIoTQueue() {
    if (IOT.busy) return;
    IOT.busy = true;
    while (IOT.queue.length) {
        const path = IOT.queue.shift();
        try {
            const res = await fetch(`${CONFIG.API_BASE}/api${path}`, { cache: 'no-store' });
            setEspOnline(res.ok);
        } catch (e) {
            setEspOnline(false);
        }
    }
    IOT.busy = false;
}

// ---------- Perintah sesuai kejadian game ----------
// stage = 1..3 (E, F, G), detik = sisa waktu stage
function iotStageStart(stage, seconds) { sendIoTCommand(`/stage/start?stage=${stage}&t=${seconds}`); }
function iotQuizStart(seconds)        { sendIoTCommand(`/quiz/start?t=${seconds}`); }
function iotQuizEnd()                 { sendIoTCommand('/quiz/end'); }
function iotStageResult(stage, clear) { sendIoTCommand(`/stage/${clear ? 'clear' : 'destroyed'}?stage=${stage}`); }
function iotReset()                   { sendIoTCommand('/reset'); }

// ---------- Badge status ESP (opsional: elemen #espStatus di index.html) ----------
function setEspOnline(isOnline) {
    IOT.online = isOnline;
    const el = document.getElementById('espStatus');
    if (!el) return;
    el.textContent = isOnline ? 'ESP: TERHUBUNG' : 'ESP: TIDAK TERHUBUNG';
    el.className = 'fixed top-3 right-3 z-40 px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest font-mono ' +
        (isOnline
            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
            : 'bg-red-950/80 border-red-500/60 text-red-300');
}

async function pollEspStatus() {
    // Jangan ganggu antrean perintah; cek status hanya saat antrean kosong.
    if (IOT.busy) return;
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/status`, { cache: 'no-store' });
        setEspOnline(res.ok);
    } catch (e) {
        setEspOnline(false);
    }
}

window.addEventListener('load', () => {
    if (!CONFIG.IOT_ENABLED) return;
    setEspOnline(false);
    pollEspStatus();
    setInterval(pollEspStatus, CONFIG.STATUS_POLL_MS);
});
