# Working Flow — Waiting List

Aturan ini berlaku untuk setiap pekerjaan di project BROHUBS, baik dikerjakan melalui manusia maupun aplikasi AI/coding assistant apa pun, sekarang atau di masa depan.

## Prinsip utama

- Hanya ada **satu pekerjaan aktif** pada satu waktu.
- Pekerjaan aktif harus diselesaikan sampai implementasi, validasi yang relevan, dan pelaporan hasil selesai sebelum memulai item berikutnya.
- Semua permintaan, ide, bug, atau peningkatan lain dicatat sebagai **Waiting List** dan tidak dikerjakan di tengah pekerjaan aktif.
- Aturan Waiting List ini wajib dipatuhi oleh semua manusia maupun aplikasi AI/coding assistant apa pun yang mengerjakan proyek.

## Prioritas baru

- Jika ditemukan masalah kritis atau permintaan prioritas baru, informasikan dampak dan alasan prioritasnya kepada pengguna terlebih dahulu.
- Jangan mengubah urutan pekerjaan tanpa persetujuan pengguna.
- Setelah prioritas baru disetujui, simpan titik berhenti pekerjaan sebelumnya dan lanjutkan kembali setelah prioritas selesai.

## Penutupan pekerjaan

Sebuah item hanya boleh dianggap selesai setelah:

1. Perubahan yang diminta telah diimplementasikan.
2. Pemeriksaan yang relevan telah dijalankan.
3. Hasil, batasan, dan status commit/push (bila diminta) telah dilaporkan.
4. Item Waiting List berikutnya baru boleh dimulai setelah instruksi pengguna.

## Aturan bahasa UI

- Setiap teks baru atau teks yang diubah di antarmuka website wajib menggunakan sistem terjemahan aplikasi.
- Teks harus mengikuti bahasa yang dipilih pengguna (misalnya pilihan Bahasa Indonesia menampilkan Bahasa Indonesia).
- Jangan menambahkan teks UI yang ditulis langsung hanya dalam satu bahasa, kecuali sebagai kunci teknis yang tidak terlihat pengguna.

## Pekerjaan aktif

- Audit dan konsolidasi penyimpanan file: pastikan file upload dinamis menggunakan Supabase Storage secara konsisten, tangani URL/logo yang gagal dimuat, dan kurangi fallback localStorage untuk data yang perlu tersedia lintas-PC.

## Waiting List saat ini

1. MLBB In-Game Overlay MVP — Gold Graph dan live match stats.
2. MLBB Post-Match Overlay — dimulai setelah MLBB In-Game Overlay selesai.
3. Integrasi Supabase Realtime untuk Control Desk dan output publik (Vercel/domain sendiri) setelah asset dan uji lokal stabil.
4. Audit seluruh teks UI dan pastikan semuanya diterjemahkan melalui sistem bahasa sesuai pengaturan pengguna.
