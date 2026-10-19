// Bank soal kuis ranjau: khusus seputar ITK (Institut Teknologi Kalimantan).
// `answer` = index jawaban benar di array `options`.
// Urutan opsi diacak otomatis saat kuis ditampilkan, jadi aman ditulis berurutan.
// Menambah soal: cukup tambah satu objek baru di bawah, game otomatis ikut mengacaknya.
const QUIZ_BANK = [
    {
        question: "Kota Balikpapan berada di provinsi apa?",
        options: ["Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", "Kalimantan Tengah"],
        answer: 1
    },
    {
        question: "Ada Program Studi di ITK?",
        options: ["10", "22", "27", "31"],
        answer: 2
    },
    {
        question: "Kampus ITK terletak di kelurahan apa?",
        options: ["Sepinggan", "Gunung Samarinda", "Manggar Baru", "Karang Joang"],
        answer: 3
    },
    {
        question: "Apa kepanjangan IoT?",
        options: ["Internet of Things", "Internet of Tokens", "Internet of Transactions", "Internet of Telindung"],
        answer: 0
    },
    {
        question: "Dalam Wumpus World klasik, apa yang dirasakan agen saat berada di petak yang bersebelahan dengan Pit (lubang)?",
        options: ["Stench (bau)", "Breeze (hembusan angin)", "Glitter (kilauan)", "Bump (tabrakan)"],
        answer: 1
    },

    // Lanjutkan @Kamil
    {
        question: "Pada tahun berapa ITK menerima angkatan pertama mahasiswanya (sebanyak 100 orang)?",
        options: ["2010", "2012", "2014", "2016"],
        answer: 1
    },
    {
        question: "Sebelum kampus Karang Joang siap, mahasiswa awal ITK menjalani perkuliahan di kampus mana?",
        options: ["ITB Bandung", "Universitas Mulawarman", "ITS Surabaya", "UGM Yogyakarta"],
        answer: 2
    },
    {
        question: "Pada tahun berapa kegiatan akademik ITK dipindahkan ke kampus Karang Joang, Balikpapan?",
        options: ["2013", "2014", "2015", "2017"],
        answer: 2
    },
    {
        question: "Manakah yang BUKAN termasuk lima program studi awal ITK?",
        options: ["Teknik Elektro", "Teknik Perkapalan", "Teknik Kimia", "Sistem Informasi"],
        answer: 3
    },
    {
        question: "Beasiswa dari Pemprov Kaltim yang menopang mahasiswa awal ITK bernama...",
        options: ["Kaltim Cemerlang", "Kaltim Mapan", "Kaltim Gemilang", "Kaltim Berdaya"],
        answer: 0
    },
    {
        question: "Jalur seleksi masuk ITK pada masa awal berdiri dikenal dengan nama...",
        options: ["SMBKal", "UMITK", "SMITeK", "SIMAK-ITK"],
        answer: 2
    },
    {
        question: "Kira-kira berapa luas lahan kampus ITK di Karang Joang?",
        options: ["30 hektare", "100 hektare", "300 hektare", "3.000 hektare"],
        answer: 2
    },
    {
        question: "Kampus ITK berada sekitar kilometer berapa dari Balikpapan ke arah Samarinda?",
        options: ["KM 5", "KM 10", "KM 15", "KM 25"],
        answer: 2
    },
    {
        question: "Sampai 2012, satu-satunya universitas negeri di Kaltim yang berlokasi di Samarinda adalah...",
        options: ["Universitas Balikpapan", "Universitas Mulawarman", "Universitas Widya Gama Mahakam", "Universitas 17 Agustus 1945 Samarinda"],
        answer: 1
    },
    {
        question: "Matkul manakah di Informatika ITK yang mempelajari tentang Wumpus World?",
        options: ["PKA", "PBO", "Arsikom", "Alpro"],
        answer: 0
    }
];
