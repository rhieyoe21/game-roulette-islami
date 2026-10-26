# Roda Kebaikan Islami

Game edukasi Islami interaktif untuk anak. Pemain memutar roda kebaikan, memilih kartu situasi yang sesuai, lalu mengumpulkan bintang. Aplikasi berjalan sepenuhnya di browser tanpa backend dan tanpa proses build.

## Fitur

- Roda dengan tujuh kondisi kebaikan dan karakter ilustrasi yang berbeda dari gambar kartu.
- Tiga kartu situasi langsung terbuka agar pemain bisa membaca dan memilih.
- Panel kartu netral dan seragam, sehingga warna roda tidak membocorkan jawaban.
- Nama kondisi pada kartu disembunyikan sebelum menjawab:
  - salah: nama muncul hanya pada kartu yang dipilih;
  - benar: nama muncul pada semua kartu.
- Bintang dan status permainan dalam sesi.
- Tombol reset untuk menghapus bintang dan memulai permainan dari awal.
- Efek suara putaran, benar, salah, dan reset menggunakan Web Audio API.
- Toggle suara dengan preferensi tersimpan di `localStorage`.
- Indikator jawaban berupa toast, badge kartu, perubahan panel, dan pengumuman `aria-live`.
- Dukungan `prefers-reduced-motion`, navigasi keyboard, dan layout responsif hingga 320px.

## Cara Bermain

1. Tekan tombol **Putar** di tengah roda.
2. Setelah roda berhenti, baca tiga situasi yang tersedia.
3. Pilih kartu yang cocok dengan kondisi dari roda.
4. Jawaban salah menampilkan nama kondisi pada kartu tersebut; coba kartu lain.
5. Jawaban benar menampilkan nama kondisi pada semua kartu dan menambah satu bintang.
6. Gunakan **Reset** untuk menghapus bintang dan mengulang dari awal.

## Pasangan Kondisi dan Situasi

| Kondisi | Situasi |
| --- | --- |
| Mengucapkan Salam | Bertemu Guru di Sekolah |
| Berdoa | Masuk Masjid |
| Berbagi | Diberi Makanan |
| Menolong Teman | Teman Menjatuhkan Buku |
| Menjaga Kebersihan | Melihat Sampah Berserakan |
| Berkata Jujur | Tidak Sengaja Menjatuhkan Mainan |
| Meminta Maaf | Melakukan Kesalahan |

## Teknologi

- HTML5, CSS3, dan JavaScript vanilla.
- Web Audio API untuk efek suara tanpa file audio eksternal.
- Python, Pillow, NumPy, dan Gemini API hanya untuk pembuatan aset, bukan dependensi runtime.
- Tidak ada framework, package manager, atau backend.

## Struktur Proyek

```text
.
├── index.html                 # Struktur halaman
├── styles.css                 # Tema, roda, kartu, animasi, responsif
├── app.js                     # Data permainan, roda, kartu, suara, reset
├── assets/
│   ├── cards/                 # Gambar kartu WebP + fallback SVG
│   └── wheel/                 # Karakter roda transparan + fallback SVG
├── tools/
│   └── generate_assets.py     # Generator aset kartu dan karakter roda
├── .gitignore
└── README.md
```

## Menjalankan

Buka folder ini melalui Laragon, atau jalankan server statis:

```powershell
php -S 127.0.0.1:8123
```

Lalu buka `http://127.0.0.1:8123/`.

Tidak diperlukan `npm install` atau proses build.

## Aset AI

Aset kartu dan karakter roda sudah tersedia sebagai WebP. Masing-masing memiliki fallback SVG agar permainan tetap berjalan bila aset raster tidak tersedia.

### Regenerate Aset

Set kredensial sebagai environment variable. Jangan menaruh kredensial di repository.

```powershell
$env:GEMINI_API_KEY = "..."
python tools/generate_assets.py --all --force
```

Hanya karakter roda:

```powershell
python tools/generate_assets.py --wheel --force
```

Hanya satu aset:

```powershell
python tools/generate_assets.py --only berbagi --wheel --force
```

Generator karakter roda memakai:

- satu karakter per gambar;
- latar magenta murni yang dihapus menjadi transparan;
- gambar kartu sebagai referensi gaya, bukan sebagai gambar akhir;
- output `assets/wheel/<id>.webp` berukuran 512 x 512.

Referensi tambahan, bila ada, diletakkan di `assets/reference/`. Folder tersebut diabaikan oleh Git.

## Pemeriksaan

```powershell
node --check app.js
python -m py_compile tools/generate_assets.py
```

Pemeriksaan manual yang disarankan:

- putar roda dan pastikan hasil selalu cocok dengan segmen yang ditunjuk;
- uji jawaban salah lalu benar;
- pastikan nama kondisi hanya muncul sesuai aturan;
- uji reset saat roda sedang berputar;
- uji ukuran layar 320px, 390px, dan desktop;
- uji toggle suara dan reload halaman.

## Keamanan Kredensial

- Kunci API hanya dibaca dari environment.
- `.env`, variabel environment lokal, dan folder referensi tidak dimasukkan ke Git.
- Jangan commit `GEMINI_API_KEY` atau kunci layanan lain.
