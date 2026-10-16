// Bank soal kuis ranjau: khusus seputar ITK (Institut Teknologi Kalimantan).
// `answer` = index jawaban benar di array `options`.
// Urutan opsi diacak otomatis saat kuis ditampilkan, jadi aman ditulis berurutan.
// Menambah soal: cukup tambah satu objek baru di bawah, game otomatis ikut mengacaknya.
const QUIZ_BANK = [
    {
        question: "Di kota manakah kampus utama ITK berada?",
        options: ["Samarinda", "Balikpapan", "Bontang", "Banjarmasin"],
        answer: 1
    },
    {
        question: "ITK berada di provinsi apa?",
        options: ["Kalimantan Selatan", "Kalimantan Utara", "Kalimantan Timur", "Kalimantan Tengah"],
        answer: 2
    },
    {
        question: "Kampus ITK terletak di kelurahan apa?",
        options: ["Sepinggan", "Gunung Samarinda", "Manggar Baru", "Karang Joang"],
        answer: 3
    },
    {
        question: "Kampus ITK berada di kecamatan apa?",
        options: ["Balikpapan Utara", "Balikpapan Selatan", "Balikpapan Timur", "Balikpapan Barat"],
        answer: 0
    },
    {
        question: "ITK didirikan berdasarkan Peraturan Presiden nomor berapa?",
        options: ["Perpres No. 87 Tahun 2012", "Perpres No. 125 Tahun 2014", "Perpres No. 40 Tahun 2015", "Perpres No. 6 Tahun 2017"],
        answer: 1
    },
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
