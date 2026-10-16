// Logika game. Tampilan ada di ui.js, pengaturan di config.js.

const state = {
    stage: 1,
    player: { ...CONFIG.START_POS },
    bomb: { r: -1, c: -1 },
    kits: [],
    mines: [],
    revealed: [],
    collectedKits: 0,
    timeLeft: CONFIG.GAME_TIME,
    gameOver: false,
    exploded: null,        // koordinat petak yang meledak
    activeMine: null,      // ranjau yang sedang dikuis
    lastResultClear: false, // hasil stage terakhir (menang/kalah)
    results: { 1: null, 2: null } // hasil tiap tower: null | 'safe' | 'destroyed'
};

let globalTimer = null;
let quizTimer = null;
let resultTimeout = null;

// ---------- Helper ----------
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getNeighbors(r, c) {
    const n = [];
    if (r > 0) n.push({ r: r - 1, c });
    if (r < CONFIG.GRID_SIZE - 1) n.push({ r: r + 1, c });
    if (c > 0) n.push({ r, c: c - 1 });
    if (c < CONFIG.GRID_SIZE - 1) n.push({ r, c: c + 1 });
    return n;
}

function hasStench(r, c) {
    return getNeighbors(r, c).some(n => n.r === state.bomb.r && n.c === state.bomb.c);
}

function hasBreeze(r, c) {
    return getNeighbors(r, c).some(n => state.mines.some(m => m.r === n.r && m.c === n.c && !m.disarmed));
}

// Pengambilan soal sistem "kartu": semua soal diacak jadi satu tumpukan, lalu diambil satu per satu.
// Soal baru muncul lagi setelah seluruh soal di tumpukan habis, jadi tidak ada pengulangan beruntun.
// Tumpukan sengaja tidak di-reset antar ronde, supaya variasinya tetap terjaga saat main berkali-kali.
let quizDeck = [];
let lastQuizIndex = -1;

function drawQuiz() {
    if (quizDeck.length === 0) {
        quizDeck = shuffle(QUIZ_BANK.map((_, i) => i));
        // Soal yang akan diambil berikutnya ada di ujung array. Hindari sama dengan soal terakhir.
        const lastPos = quizDeck.length - 1;
        if (quizDeck.length > 1 && quizDeck[lastPos] === lastQuizIndex) {
            const j = Math.floor(Math.random() * lastPos);
            [quizDeck[lastPos], quizDeck[j]] = [quizDeck[j], quizDeck[lastPos]];
        }
    }
    lastQuizIndex = quizDeck.pop();
    return QUIZ_BANK[lastQuizIndex];
}

function isInputLocked() {
    return state.gameOver || state.activeMine !== null;
}

// Hentikan semua timer & modal yang mungkin tersisa dari ronde sebelumnya.
// Inilah yang dulu hilang sehingga player macet setelah reset.
function clearRoundLeftovers() {
    clearInterval(globalTimer);
    clearInterval(quizTimer);
    clearTimeout(resultTimeout);
    globalTimer = quizTimer = resultTimeout = null;
    state.activeMine = null;
    closeQuizModal();
    hideResultModal();
}

// ---------- Mulai ronde ----------
function initGame() {
    clearRoundLeftovers();

    state.player = { ...CONFIG.START_POS };
    state.collectedKits = 0;
    state.gameOver = false;
    state.exploded = null;
    state.mines = [];
    state.kits = [];
    state.timeLeft = CONFIG.GAME_TIME;

    const stage = CONFIG.STAGES[state.stage];
    setStageLabel(`STAGE ${state.stage}: ${stage.name}`);
    sendIoTCommand(`${stage.iotPrefix}/blink`);

    state.revealed = Array.from({ length: CONFIG.GRID_SIZE }, () => Array(CONFIG.GRID_SIZE).fill(false));
    state.revealed[CONFIG.START_POS.r][CONFIG.START_POS.c] = true;

    // Acak posisi bom, kit, dan ranjau tanpa tumpang tindih (Bunker dikecualikan)
    const free = [];
    for (let r = 0; r < CONFIG.GRID_SIZE; r++) {
        for (let c = 0; c < CONFIG.GRID_SIZE; c++) {
            if (r !== CONFIG.START_POS.r || c !== CONFIG.START_POS.c) free.push({ r, c });
        }
    }
    const spots = shuffle(free);

    state.bomb = spots.pop();
    for (let i = 0; i < CONFIG.TOTAL_KITS && spots.length; i++) {
        state.kits.push({ ...spots.pop(), grabbed: false });
    }
    const mineCount = CONFIG.MINES_MIN + Math.floor(Math.random() * (CONFIG.MINES_MAX - CONFIG.MINES_MIN + 1));
    for (let i = 0; i < mineCount && spots.length; i++) {
        state.mines.push({ ...spots.pop(), disarmed: false });
    }

    startGlobalTimer();
    updateUI();
}

function startGlobalTimer() {
    globalTimer = setInterval(() => {
        if (state.gameOver) return;
        state.timeLeft--;
        updateTimerDisplay();

        if (state.timeLeft <= 0) {
            explodeAt(state.player.r, state.player.c);
            handleStageResult(false, "WAKTU OPERASI HABIS! BOM MELEDAK.");
        }
    }, 1000);
}

// ---------- Aksi pemain ----------
function movePlayer(dir) {
    if (isInputLocked()) return;

    let { r, c } = state.player;
    if (dir === 'up') r--;
    if (dir === 'down') r++;
    if (dir === 'left') c--;
    if (dir === 'right') c++;

    if (r < 0 || r >= CONFIG.GRID_SIZE || c < 0 || c >= CONFIG.GRID_SIZE) return;

    state.player = { r, c };
    state.revealed[r][c] = true;
    playSound('move');

    const mine = state.mines.find(m => m.r === r && m.c === c && !m.disarmed);
    if (mine) {
        updateUI();
        startMineQuiz(mine);
        return;
    }

    if (state.bomb.r === r && state.bomb.c === c) {
        explodeAt(r, c);
        handleStageResult(false, "KAMU MENGINJAK BOM WUMPUS! GEDUNG MELEDAK DASHYAT.");
        return;
    }

    updateUI();
}

function grabDefuseKit() {
    if (isInputLocked()) return;
    const kit = state.kits.find(k => k.r === state.player.r && k.c === state.player.c && !k.grabbed);
    if (!kit) {
        showToast("Tidak ada Defuse Kit di petak ini.");
        return;
    }
    kit.grabbed = true;
    state.collectedKits++;
    playSound('kit');
    updateUI();
}

function callSupportAndDefuse() {
    if (isInputLocked()) return;

    const atBunker = state.player.r === CONFIG.START_POS.r && state.player.c === CONFIG.START_POS.c;
    if (!atBunker) {
        showToast("Harus kembali ke Bunker (petak awal) untuk memanggil pasukan!");
        return;
    }
    if (state.collectedKits < CONFIG.TOTAL_KITS) {
        showToast(`Defuse Kit belum lengkap! Terkumpul ${state.collectedKits}/${CONFIG.TOTAL_KITS}.`);
        return;
    }
    playSound('win');
    handleStageResult(true, "BERHASIL DEAKTIVASI BOM! GEDUNG AMAN!");
}

function explodeAt(r, c) {
    state.exploded = { r, c };
    playSound('explosion');
    playExplosionFx();
}

// ---------- Kuis ranjau ----------
function startMineQuiz(mine) {
    state.activeMine = mine;

    const quiz = drawQuiz();
    const options = shuffle(quiz.options.map((text, i) => ({ text, correct: i === quiz.answer })));

    let secondsLeft = CONFIG.QUIZ_TIME;
    setQuizTimerDisplay(secondsLeft);
    openQuizModal(quiz.question, options, handleQuizAnswer);

    clearInterval(quizTimer);
    quizTimer = setInterval(() => {
        secondsLeft--;
        setQuizTimerDisplay(secondsLeft);
        if (secondsLeft <= 0) {
            explodeAt(state.player.r, state.player.c);
            handleStageResult(false, `WAKTU DEAKTIVASI RANJAU HABIS (${CONFIG.QUIZ_TIME}s)! RANJAU MELEDAK.`);
        }
    }, 1000);
}

function handleQuizAnswer(isCorrect) {
    if (!state.activeMine || state.gameOver) return;

    clearInterval(quizTimer);
    quizTimer = null;
    closeQuizModal();

    if (isCorrect) {
        state.activeMine.disarmed = true;
        state.activeMine = null;
        playSound('kit');
        updateUI();
    } else {
        explodeAt(state.player.r, state.player.c);
        handleStageResult(false, "JAWABAN SALAH! PEMICU RANJAU MELEDAK.");
    }
}

// ---------- Hasil stage ----------
function handleStageResult(isClear, message) {
    if (state.gameOver) return; // cegah hasil ganda (mis. timer + kuis berbarengan)

    state.gameOver = true;
    state.lastResultClear = isClear;
    state.results[state.stage] = isClear ? 'safe' : 'destroyed';

    // Bersihkan semua timer & kuis, ini kunci perbaikan bug player macet
    clearInterval(globalTimer);
    clearInterval(quizTimer);
    globalTimer = quizTimer = null;
    state.activeMine = null;
    closeQuizModal();
    updateUI();

    const stage = CONFIG.STAGES[state.stage];
    sendIoTCommand(`${stage.iotPrefix}/${isClear ? 'solid' : 'off'}`);

    // Menang atau kalah, pemain tetap lanjut ke stage berikutnya
    let buttonText;
    if (state.stage < CONFIG.LAST_STAGE) buttonText = `Lanjut ke Stage ${state.stage + 1} (${CONFIG.STAGES[state.stage + 1].name})`;
    else buttonText = "Selesai Operasi (Main Lagi)";

    resultTimeout = setTimeout(() => {
        showResultModal({
            isClear,
            title: isClear ? `${stage.name} CLEAR` : `${stage.name} DESTROYED`,
            message,
            buttonText
        });
    }, 600);
}

function handleModalNext() {
    // Menang atau kalah, selalu lanjut. Setelah stage terakhir, kembali ke Stage 1.
    if (state.stage < CONFIG.LAST_STAGE) {
        state.stage++;
    } else {
        state.stage = 1;
        state.results = { 1: null, 2: null };
        sendIoTCommand('/led/all/off');
    }
    initGame();
}

function resetGame() {
    state.stage = 1;
    state.results = { 1: null, 2: null };
    sendIoTCommand('/led/all/off');
    initGame();
}

// ---------- Input ----------
function setupControls() {
    document.querySelectorAll('[data-move]').forEach(btn => {
        btn.addEventListener('click', () => movePlayer(btn.dataset.move));
    });
    $('btnGrab').addEventListener('click', grabDefuseKit);
    $('btnExit').addEventListener('click', callSupportAndDefuse);
    $('btnReset').addEventListener('click', resetGame);
    $('modalBtn').addEventListener('click', handleModalNext);

    document.addEventListener('keydown', (e) => {
        if (isInputLocked()) return;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': e.preventDefault(); movePlayer('up'); break;
            case 'ArrowDown': case 's': case 'S': e.preventDefault(); movePlayer('down'); break;
            case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); movePlayer('left'); break;
            case 'ArrowRight': case 'd': case 'D': e.preventDefault(); movePlayer('right'); break;
            case ' ': case 'g': case 'G': e.preventDefault(); grabDefuseKit(); break;
            case 'e': case 'E': callSupportAndDefuse(); break;
        }
    });
}

window.addEventListener('load', () => {
    setupControls();
    sendIoTCommand('/led/all/off');
    initGame();
});