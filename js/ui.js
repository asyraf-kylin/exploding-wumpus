// Semua urusan tampilan (DOM). Logika game ada di game.js dan menyimpan state di objek `state`.
const $ = (id) => document.getElementById(id);

// ---------- Grid ----------
function renderGrid() {
    const container = $('gridContainer');
    container.innerHTML = '';
    const { GRID_SIZE, START_POS } = CONFIG;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell rounded-xl flex flex-col justify-between p-1 relative border transition-all duration-300 select-none';

            const isRevealed = state.revealed[r][c];
            const isPlayerHere = state.player.r === r && state.player.c === c;
            const isExploded = state.exploded && state.exploded.r === r && state.exploded.c === c;

            if (isRevealed || state.gameOver) {
                cell.classList.add('revealed-cell');
                let html = '<div class="flex flex-wrap gap-0.5 items-center justify-center h-full w-full p-1">';

                if (isExploded) {
                    html += `<div class="w-10 h-10 z-20">${ASSETS.EXPLOSION}</div>`;
                } else {
                    const mine = state.mines.find(m => m.r === r && m.c === c);
                    if (mine && !mine.disarmed) html += `<div class="w-8 h-8 sm:w-10 sm:h-10">${ASSETS.MINE}</div>`;

                    if (state.bomb.r === r && state.bomb.c === c) {
                        html += `<div class="w-8 h-8 sm:w-10 sm:h-10">${ASSETS.BOMB}</div>`;
                    }

                    const kit = state.kits.find(k => k.r === r && k.c === c && !k.grabbed);
                    if (kit) html += `<div class="w-7 h-7 sm:w-9 sm:h-9">${ASSETS.DEFUSE_KIT}</div>`;
                }
                html += '</div>';
                cell.innerHTML = html;

                // Petunjuk sensor di petak yang sudah dibuka
                if (isRevealed && !state.gameOver) {
                    let hints = '';
                    if (hasStench(r, c)) hints += ASSETS.STENCH;
                    if (hasBreeze(r, c)) hints += ASSETS.BREEZE;
                    if (state.kits.some(k => k.r === r && k.c === c && !k.grabbed)) hints += ASSETS.GLINT;

                    if (hints) {
                        const hintDiv = document.createElement('div');
                        hintDiv.className = 'absolute top-1 left-1 flex items-center gap-0.5 bg-slate-950/80 px-1 py-0.5 rounded border border-slate-800';
                        hintDiv.innerHTML = hints;
                        cell.appendChild(hintDiv);
                    }
                }
            } else {
                cell.classList.add('fog-of-war', 'border-slate-800');
                cell.innerHTML = '<div class="flex items-center justify-center h-full opacity-20 text-slate-500 text-xs"><i class="fa-solid fa-shield-halved"></i></div>';
            }

            if (r === START_POS.r && c === START_POS.c) {
                const tag = document.createElement('span');
                tag.className = 'absolute bottom-0.5 right-1 text-[8px] sm:text-[9px] bg-blue-950 text-blue-300 px-1 rounded font-bold border border-blue-800 uppercase tracking-widest';
                tag.innerText = 'Bunker';
                cell.appendChild(tag);
            }

            if (isPlayerHere && !state.exploded) {
                const p = document.createElement('div');
                p.className = 'absolute inset-0 flex items-center justify-center z-10 p-1';
                p.innerHTML = `<div class="w-8 h-8 sm:w-10 sm:h-10">${ASSETS.PLAYER}</div>`;
                cell.appendChild(p);
            }

            container.appendChild(cell);
        }
    }
}

// ---------- Sensor & status ----------
function updateSensors() {
    const { r, c } = state.player;
    const glint = state.kits.some(k => k.r === r && k.c === c && !k.grabbed);
    $('sensorStench').style.opacity = hasStench(r, c) ? '1' : '0.25';
    $('sensorBreeze').style.opacity = hasBreeze(r, c) ? '1' : '0.25';
    $('sensorGlint').style.opacity = glint ? '1' : '0.25';
}

function updateStatus() {
    $('statusKit').innerText = `${state.collectedKits} / ${CONFIG.TOTAL_KITS}`;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const t = Math.max(0, state.timeLeft);
    const mins = Math.floor(t / 60).toString().padStart(2, '0');
    const secs = (t % 60).toString().padStart(2, '0');
    const el = $('globalTimer');
    el.innerText = `${mins}:${secs}`;
    el.classList.toggle('timer-warning', t <= CONFIG.WARNING_TIME && !state.gameOver);
}

function updateUI() {
    renderGrid();
    updateSensors();
    updateStatus();
    renderBuildingPanel();
}

function setStageLabel(text) {
    $('stageDisplay').innerText = text;
}

// ---------- Panel kondisi gedung ----------
// Status tiap gedung: 'idle' (belum dimainkan), 'clear' (aman), 'destroyed' (hancur)
function buildingStatus(result) {
    if (result === 'safe') return 'clear';
    if (result === 'destroyed') return 'destroyed';
    return 'idle';
}

// Daftar nomor stage berurutan, mis. [1, 2, 3]
function getStageIds() {
    return Object.keys(CONFIG.STAGES).map(Number).sort((a, b) => a - b);
}

// Kunci gambar: "<status E>_<status F>_<status G>", mis. "clear_destroyed_idle"
function getBuildingKey() {
    return getStageIds().map(id => buildingStatus(state.results[id])).join('_');
}

// Path gambar dari kunci. undefined kalau kuncinya tidak terdaftar di config.
function getBuildingImageSrc(key) {
    const no = CONFIG.BUILDING_IMAGE_NO[key];
    if (no === undefined) return undefined;
    return `${CONFIG.BUILDING_IMAGE_DIR}${no}${CONFIG.BUILDING_IMAGE_EXT}`;
}

// Keterangan singkat dari kunci, mis. "E aman · F hancur"
function getBuildingLabel(key) {
    const statuses = key.split('_');
    const safe = [];
    const destroyed = [];
    getStageIds().forEach((id, i) => {
        const letter = CONFIG.STAGES[id].short;
        if (statuses[i] === 'clear') safe.push(letter);
        if (statuses[i] === 'destroyed') destroyed.push(letter);
    });
    if (!safe.length && !destroyed.length) return 'Misi dimulai';

    const parts = [];
    if (safe.length) parts.push(`${safe.join(', ')} aman`);
    if (destroyed.length) parts.push(`${destroyed.join(', ')} hancur`);
    return parts.join(' · ');
}

// Ilustrasi cadangan kalau file gambar belum ada / gagal dimuat
function buildingFallbackSvg() {
    const palette = {
        idle:  { fill: '#0f172a', stroke: '#64748b', line: '#1e293b' },
        clear: { fill: '#064e3b', stroke: '#10b981', line: '#047857' }
    };

    const building = (x, label, status) => {
        const name = `<text x="${x + 25}" y="148" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="monospace">${label}</text>`;
        if (status === 'destroyed') {
            return `<polygon points="${x},120 ${x},96 ${x + 10},80 ${x + 20},92 ${x + 30},72 ${x + 40},90 ${x + 50},98 ${x + 50},120" fill="#450a0a" stroke="#ef4444" stroke-width="2"/>
                    <circle cx="${x + 27}" cy="70" r="7" fill="#f59e0b" opacity="0.85"/>${name}`;
        }
        const p = palette[status];
        return `<rect x="${x}" y="50" width="50" height="70" fill="${p.fill}" stroke="${p.stroke}" stroke-width="2"/>
                <path d="M${x + 10} 60V112M${x + 20} 60V112M${x + 30} 60V112M${x + 40} 60V112" stroke="${p.line}" stroke-width="1.5"/>${name}`;
    };

    const xs = [20, 95, 170];
    const blocks = getStageIds().map((id, i) =>
        building(xs[i] ?? 20 + i * 75, CONFIG.STAGES[id].short, buildingStatus(state.results[id]))
    ).join('');

    return `<svg viewBox="0 0 240 190" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
        ${blocks}
        <text x="120" y="176" text-anchor="middle" fill="#475569" font-size="8" font-family="monospace">(gambar belum dipasang)</text>
    </svg>`;
}

// Isi sebuah container dengan gambar sesuai kondisi saat ini.
// Dilewati kalau kondisinya sama dengan render sebelumnya, supaya gambar tidak berkedip.
function renderBuildingInto(container) {
    const key = getBuildingKey();
    if (container.dataset.buildingKey === key) return;
    container.dataset.buildingKey = key;
    container.innerHTML = '';

    const src = getBuildingImageSrc(key);
    if (!src) {
        console.warn(`Kunci gambar gedung tidak terdaftar di config: ${key}`);
        container.innerHTML = buildingFallbackSvg();
        return;
    }

    const img = document.createElement('img');
    img.src = src;
    img.alt = getBuildingLabel(key);
    img.className = 'w-full h-full object-cover';
    img.onerror = () => {
        console.warn(`Gambar gedung tidak ditemukan: ${src}`);
        container.innerHTML = buildingFallbackSvg();
    };
    container.appendChild(img);
}

function setBuildingBadge(el, name, result, isActive) {
    let text, cls;
    if (result === 'destroyed') {
        text = 'HANCUR';
        cls = 'bg-red-950/80 border-red-800 text-red-400';
    } else if (result === 'safe') {
        text = 'AMAN';
        cls = 'bg-emerald-950/80 border-emerald-800 text-emerald-400';
    } else if (isActive) {
        text = 'BOM AKTIF';
        cls = 'bg-amber-950/80 border-amber-800 text-amber-400';
    } else {
        text = 'MENUNGGU';
        cls = 'bg-slate-950 border-slate-800 text-slate-400';
    }
    el.className = `rounded-lg py-1.5 px-2 border ${cls}`;
    el.innerText = `${name}: ${text}`;
}

function renderBuildingPanel() {
    renderBuildingInto($('buildingView'));
    $('buildingCaption').innerText = getBuildingLabel(getBuildingKey());
    getStageIds().forEach(id => {
        const badge = $(`buildingBadge${id}`);
        if (!badge) return;
        setBuildingBadge(badge, CONFIG.STAGES[id].short, state.results[id], state.stage === id && !state.gameOver);
    });
}

// ---------- Efek ledakan ----------
function playExplosionFx() {
    const body = $('mainBody');
    const overlay = $('flashOverlay');

    body.classList.remove('shake');
    overlay.classList.remove('active');
    void body.offsetWidth; // paksa reflow supaya animasi bisa diputar ulang
    body.classList.add('shake');
    overlay.classList.add('active');

    setTimeout(() => {
        body.classList.remove('shake');
        overlay.classList.remove('active');
    }, 600);
}

// ---------- Toast ----------
let toastTimeout = null;
function showToast(message) {
    const el = $('toast');
    el.innerText = message;
    el.classList.remove('opacity-0');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.add('opacity-0'), 2200);
}

// ---------- Modal kuis ----------
function openQuizModal(question, options, onPick) {
    $('quizQuestion').innerText = question;
    const box = $('quizOptions');
    box.innerHTML = '';

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 text-left transition-all';
        btn.innerText = opt.text;
        btn.onclick = () => onPick(opt.correct);
        box.appendChild(btn);
    });

    const modal = $('quizModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function setQuizTimerDisplay(seconds) {
    $('quizTimer').innerText = `${seconds}s`;
}

function closeQuizModal() {
    const modal = $('quizModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// ---------- Modal hasil stage ----------
function showResultModal({ isClear, title, message, buttonText }) {
    const titleEl = $('modalTitle');
    titleEl.innerText = title;
    titleEl.className = `text-2xl font-bold tactical-font ${isClear ? 'text-emerald-400' : 'text-red-500'} mb-2 uppercase tracking-wide`;
    $('modalDesc').innerText = message;

    const icon = $('modalIcon');
    icon.className = `w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 p-3 ${isClear ? 'bg-emerald-950/80 border border-emerald-800' : 'bg-red-950/80 border border-red-800'}`;
    icon.innerHTML = isClear ? ASSETS.DEFUSE_KIT : ASSETS.EXPLOSION;

    $('modalBtn').innerText = buttonText;
    renderBuildingInto($('modalBuilding'));

    const modal = $('gameModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function hideResultModal() {
    const modal = $('gameModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}