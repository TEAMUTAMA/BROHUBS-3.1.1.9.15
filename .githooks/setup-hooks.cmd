@echo off
REM Aktifkan git hooks BROHUBS di mesin ini (cukup jalankan sekali per clone).
REM Klik dua kali file ini, atau jalankan dari root repo App\
cd /d "%~dp0.."
git config core.hooksPath .githooks
echo OK: core.hooksPath = .githooks (post-commit hook aktif)
pause
