// Komunikasi IoT lewat server Python (server.py), bukan langsung ke ESP lagi.
//
// Alur: game (browser) -> /api/... di server.py -> ESP8266
//
// Game harus dibuka lewat server.py (http://localhost:8000) supaya path "/api/..." ketemu.
// Kalau game dibuka dari alamat lain, isi CONFIG.API_BASE di config.js, mis. "http://localhost:8000".

const IOT_API_BASE = (typeof CONFIG.API_BASE === 'string') ? CONFIG.API_BASE : "";
const IOT_STATUS_POLL_MS = CONFIG.STATUS_POLL_MS || 5000;
// Harus lebih besar dari timeout server.py ke ESP (default 1,5 detik),
// supaya "ESP offline" tidak salah terbaca sebagai "server mati".
const IOT_REQUEST_TIMEOUT_MS = 4000;

// ---------- Badge status ESP ----------
const ESP_BADGE_STYLES = {
    online:      { text: 'ESP ONLINE',         cls: 'text-emerald-400 border-emerald-800 bg-emerald-950/70', dot: 'bg-emerald-400' },
    esp_offline: { text: 'ESP OFFLINE',        cls: 'text-red-400 border-red-800 bg-red-950/70',             dot: 'bg-red-500' },
    server_down: { text: 'SERVER PYTHON MATI', cls: 'text-amber-400 border-amber-800 bg-amber-950/70',       dot: 'bg-amber-400' },
    disabled:    { text: 'IOT NONAKTIF',       cls: 'text-slate-400 border-slate-700 bg-slate-900',          dot: 'bg-slate-500' }
};

let lastEspStatus = null;

// Mengisi <div id="espStatus"></div> kalau ada di index.html. Kalau tidak ada, dilewati begitu saja.
function setEspBadge(status) {
    if (status === lastEspStatus) return;
    lastEspStatus = status;

    const el = document.getElementById('espStatus');
    if (!el) return;

    const s = ESP_BADGE_STYLES[status] || ESP_BADGE_STYLES.server_down;
    el.className = `inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full border text-[11px] font-mono font-semibold tracking-wider ${s.cls}`;
    el.innerHTML = `<span class="w-2 h-2 rounded-full ${s.dot}"></span>${s.text}`;
}

// ---------- Request ----------
function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal, cache: 'no-store' })
        .finally(() => clearTimeout(timeoutId));
}

// Dipanggil game.js, mis. sendIoTCommand('/led/north/blink')
function sendIoTCommand(path) {
    if (!CONFIG.IOT_ENABLED) return;

    fetchWithTimeout(`${IOT_API_BASE}/api${path}`, IOT_REQUEST_TIMEOUT_MS)
        .then(res => setEspBadge(res.ok ? 'online' : 'esp_offline'))
        .catch(err => {
            console.log("IoT Send Error:", path, err.name);
            setEspBadge('server_down');
        });
}

// ---------- Cek status berkala ----------
async function pollEspStatus() {
    if (!CONFIG.IOT_ENABLED) {
        setEspBadge('disabled');
        return;
    }
    try {
        const res = await fetchWithTimeout(`${IOT_API_BASE}/api/status`, IOT_REQUEST_TIMEOUT_MS);
        const data = await res.json();
        setEspBadge(data.esp_online ? 'online' : 'esp_offline');
    } catch (err) {
        setEspBadge('server_down');
    }
}

function startIoTStatusPolling() {
    pollEspStatus();
    setInterval(pollEspStatus, IOT_STATUS_POLL_MS);
}

window.addEventListener('load', startIoTStatusPolling);
