# 🎮 PANDUAN INTEGRASI DAN SHORTCUTS (OBS & VMIX)

Dokumen catatan ini mencakup panduan bagaimana mengintegrasikan overlay dari template asset ke dalam software broadcasting seperti **OBS Studio & vMix**, beserta daftar jalan pintas keyboard (**hotkeys**) yang tersedia di sistem dashboard.

---

## ⚡ 1. JALAN PINTAS KEYBOARD (KEYBOARD SHORTCUTS)

### A. Pada Tampilan Output Broadcast Standalone (OBS / vMix output frame)
Tombol-tombol ini dapat ditekan langsung pada window Browser Source untuk keperluan penataan layout:

| Tombol | Fungsi | Deskripsi |
| :---: | :--- | :--- |
| **`G`** | **Toggle Grid Lines** | Menampilkan/menyembunyikan garis bantu grid untuk mempermudah penyesuaian posisi overlay secara presisi. |
| **`C`** | **Toggle Checkerboard**| Mengubah latar belakang menjadi pola catur transparan untuk menguji tingkat transparansi background alpha. |
| **`H`** | **Toggle Connection HUD**| Menyembunyikan atau memunculkan status indikator pemberitahuan koneksi di layar secara manual. |

---

### B. Pada Panel Studio Global (Global Studio Control Hub)
Anda dapat memprogram **Hotkeys Kustom** Anda sendiri untuk memutar/mengaktifkan aset tertentu:

1. **Pembuatan Hotkey Baru**:
   - Di dashboard Studio, dekat pilihan template/aset, klik tombol **Assign Hotkey** (ikon keyboard).
   - Tekan kombinasi tombol pilihan Anda di keyboard (bisa dikombinasikan dengan modifier seperti `CTRL`, `SHIFT`, `ALT`, atau `META`).
2. **Menghapus Hotkey**:
   - Klik ulang tombol rekam hotkey, lalu tekan tombol **`Backspace`** atau **`Delete`** pada keyboard Anda.
3. **Membatalkan Perekaman**:
   - Tekan tombol **`Escape (ESC)`** untuk membatalkan proses perekaman combo kunci.

*Catatan: Hotkey global tidak akan terpicu jika kursor Anda sedang aktif mengetik di dalam bidang input atau kolom pencarian teks.*

---

## 🎥 2. PANDUAN INTEGRASI BACKGROUND TRANSPARAN (OBS & VMIX)

Untuk menggunakan template asset ini secara langsung sebagai aset dinamis yang mengambang dengan latar belakang transparan di siaran langsung, ikuti langkah-langkah di bawah ini:

### 📺 A. Integrasi ke OBS Studio
1. Salin tautan output program Anda dari menu **OUTPUT** (misal: `https://.../?view=program`).
2. Buka aplikasi **OBS Studio**.
3. Pada panel **Sources**, klik tombol tambah **`+`** lalu pilih **`Browser`**.
4. Beri nama Source baru sesuai keinginan Anda (contoh: *PUBG Leaderboard Overlay*), klik **OK**.
5. Pada jendela opsi Browser, masukkan URL yang telah Anda salin sebelumnya ke kolom **`URL`**.
6. Setel resolusi berikut agar presisi dengan kanvas 16:9 1080p:
   - **Width**: `1920`
   - **Height**: `1080`
7. Kosongkan custom CSS (atau biarkan default `body { background-color: rgba(0,0,0,0); margin: 0px; overflow: hidden; }` agar background tetap transparan penuh).
8. Klik **OK**. Hasil overlay template akan otomatis muncul di atas video game Anda tanpa menutupi gameplay di belakangnya!

---

### 🎛️ B. Integrasi ke vMix
1. Salin tautan output program dari menu **OUTPUT** di halaman Member.
2. Buka aplikasi **vMix**.
3. Di sudut kiri bawah, pilih tombol **`Add Input`**.
4. Navigasikan ke bagian tab **`Web Browser`**.
5. Tempelkan URL output yang tadi disalin ke kolom **`URL`**.
6. Pilih resolusi input web menjadi **`1920x1080`**, lalu klik **`OK`**.
7. Di baris input web browser tersebut, jalankan output overlay ke udara sebagai **Layer Overlay** (dengan menekan salah satu nomor overlay **`1`**, **`2`**, **`3`**, atau **`4`** di bawah panel preview vMix).
8. vMix akan secara otomatis mendeteksi transparansi web chroma alpha sehingga widget Anda melayang dengan mulus dan mengagumkan di atas video siar!

---

💡 *Tips: Setiap pengubahan data di dashboard admin/member akan direfleksikan secara instan (real-time) langsung di layar OBS / vMix Anda tanpa perlu me-refresh halaman!*
