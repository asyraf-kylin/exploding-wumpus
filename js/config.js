// Semua pengaturan game ada di sini, tinggal ubah tanpa menyentuh logika.
const CONFIG = {
    // --- IoT (NodeMCU / ESP8266) ---
    IOT_ENABLED: false,
    NODEMCU_IP: "http://192.168.1.100",   // samakan dengan IP di firmware ESP
    IOT_TIMEOUT_MS: 1500,

    // --- Gameplay ---
    GRID_SIZE: 6,
    TOTAL_KITS: 5,
    START_POS: { r: 5, c: 0 },            // Bunker: pojok kiri bawah
    GAME_TIME: 60,                         // detik per stage
    QUIZ_TIME: 15,                         // detik per kuis ranjau
    WARNING_TIME: 10,                      // timer berkedip di bawah ini
    MINES_MIN: 4,
    MINES_MAX: 5,

    // --- Stage ---
    STAGES: {
        1: { name: "NORTH TOWER", iotPrefix: "/led/north" },
        2: { name: "SOUTH TOWER", iotPrefix: "/led/south" }
    },
    LAST_STAGE: 2,

    // --- Gambar kondisi Twin Towers ---
    // Kunci = "<status North>_<status South>", status: idle (belum dimainkan) | clear | destroyed.
    // Taruh file di folder `images/` (sebelah index.html), atau ubah path di sini.
    // Kalau file belum ada / salah nama, game otomatis menampilkan ilustrasi placeholder.
    WTC_IMAGES: {
        idle_idle:           "images/wtc-idle.jpg",                       // awal misi
        clear_idle:          "images/north-clear.jpg",                    // North clear, South belum dimainkan
        destroyed_idle:      "images/north-destroyed.jpg",                // North hancur, South belum dimainkan
        clear_clear:         "images/wtc-win.jpg",                        // keduanya clear
        clear_destroyed:     "images/north-clear-south-destroyed.jpg",    // North clear, South hancur
        destroyed_clear:     "images/north-destroyed-south-clear.jpg",    // North hancur, South clear (cek nama file ini)
        destroyed_destroyed: "images/wtc-gameover.jpg"                    // keduanya hancur
    },
    WTC_LABELS: {
        idle_idle:           "Misi dimulai",
        clear_idle:          "North aman",
        destroyed_idle:      "North hancur",
        clear_clear:         "Kedua tower aman",
        clear_destroyed:     "North aman, South hancur",
        destroyed_clear:     "North hancur, South aman",
        destroyed_destroyed: "Kedua tower hancur"
    }
};