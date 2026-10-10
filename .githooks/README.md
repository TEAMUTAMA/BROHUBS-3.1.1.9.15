# .githooks — Git hooks BROHUBS (ter-version)

Folder ini berisi git hook yang **ikut tersimpan di repo** (berbeda dari `.git/hooks/` yang lokal & tidak ter-push).

## Hook
- **`post-commit`** — setiap `git commit`, otomatis menambahkan ringkasan commit ke DevLog hari ini di `../Doc/DevLog/YYYY-MM-DD.md` (dibuat dari template bila belum ada), membuat commit DevLog terpisah tanpa loop, lalu push ke GitHub. Mencantumkan waktu, hash, branch, subjek, daftar file (≤5, selebihnya jumlah), dan author.

## Auto-save lokal
- **`AUTO SIMPAN GITHUB.cmd`** di root repo menyalakan watcher lokal. Setelah status Git stabil sekitar 10 menit, watcher menjalankan `git add -A`, `git commit`, dan `git push`.
- **`BROHUBS APP.cmd`** juga menyalakan watcher ini otomatis di background saat aplikasi dijalankan.

## Aktivasi (sekali per mesin/clone)
Git tidak mengaktifkan hooks dari folder ini secara otomatis. Jalankan sekali:

```sh
git config core.hooksPath .githooks      # manual
# atau
sh .githooks/setup-hooks.sh              # macOS/Linux/Git-Bash
.githooks\setup-hooks.cmd                # Windows (klik 2x)
```

## Catatan
- DevLog berada di root repo (`Doc/`), dan hook akan menyimpan auto-log DevLog sebagai commit terpisah.
- Saat `core.hooksPath` aktif, git **hanya** memakai hook dari folder ini (folder `.git/hooks/` diabaikan).
- Jika exec-bit hilang saat checkout (mis. di Linux): jalankan ulang `setup-hooks.sh` (melakukan `chmod +x`).
