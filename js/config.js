// Semua pengaturan game ada di sini, tinggal ubah tanpa menyentuh logika.
const CONFIG = {
    // --- IoT (NodeMCU / ESP8266 lewat server.py) ---
    // Alamat IP ESP diatur di server.py (variabel ESP_IP), bukan di sini.
    // Kalau ESP belum dipasang, game tetap jalan normal (perintah IoT gagal diam-diam).
    IOT_ENABLED: true,
    API_BASE: "",                          // kosong = game dibuka lewat server.py (http://localhost:8000)
    STATUS_POLL_MS: 5000,                  // jeda cek status ESP

    // --- Gameplay ---
    GRID_SIZE: 6,
    TOTAL_KITS: 5,
    START_POS: { r: 5, c: 0 },            // Bunker: pojok kiri bawah
    GAME_TIME: 60,                         // detik per stage
    QUIZ_TIME: 15,                         // detik per kuis ranjau
    WARNING_TIME: 10,                      // timer berkedip di bawah ini
    MINES_MIN: 4,
    MINES_MAX: 5,

    // --- Stage: dimainkan berurutan E -> F -> G ---
    // `short` = huruf gedung di badge. LED gedung di ESP mengikuti nomor stage (1=E, 2=F, 3=G).
    STAGES: {
        1: { name: "GEDUNG E", short: "E" },
        2: { name: "GEDUNG F", short: "F" },
        3: { name: "GEDUNG G", short: "G" }
    },
    LAST_STAGE: 3,

    // --- Gambar kondisi gedung (foto udara kampus, persegi 1080 x 1080 px) ---
    // Kunci = "<status E>_<status F>_<status G>"
    // status: idle (belum dimainkan) | clear (aman, hijau) | destroyed (hancur, merah)
    // Nilainya nomor file di folder `images/`, mis. 1 -> images/1.jpg
    // Ganti BUILDING_IMAGE_EXT kalau file kamu berformat lain (mis. ".png").
    // Kalau file belum ada / salah nama, game otomatis menampilkan ilustrasi placeholder.
    BUILDING_IMAGE_DIR: "images/",
    BUILDING_IMAGE_EXT: ".png",
    BUILDING_IMAGE_NO: {
        idle_idle_idle:                1,   // awal misi, semua abu-abu
        clear_idle_idle:               2,   // E aman
        clear_clear_idle:              3,   // E, F aman
        clear_clear_destroyed:         4,   // E, F aman, G hancur
        clear_clear_clear:             5,   // semua aman
        destroyed_idle_idle:           6,   // E hancur
        destroyed_destroyed_idle:      7,   // E, F hancur
        destroyed_destroyed_clear:     8,   // E, F hancur, G aman
        destroyed_destroyed_destroyed: 9,   // semua hancur
        clear_destroyed_idle:          10,  // E aman, F hancur
        clear_destroyed_clear:         11,  // E aman, F hancur, G aman
        clear_destroyed_destroyed:     12,  // E aman, F, G hancur
        destroyed_clear_idle:          13,  // E hancur, F aman
        destroyed_clear_destroyed:     14,  // E hancur, F aman, G hancur
        destroyed_clear_clear:         15   // E hancur, F, G aman
    }
};
