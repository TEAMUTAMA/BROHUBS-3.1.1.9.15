#!/bin/sh
# Aktifkan git hooks BROHUBS di mesin ini (cukup jalankan sekali per clone).
# Pemakaian:  sh .githooks/setup-hooks.sh   (dari root repo App/)
cd "$(dirname "$0")/.." || exit 1
git config core.hooksPath .githooks
chmod +x .githooks/post-commit 2>/dev/null
echo "OK: core.hooksPath = .githooks (post-commit hook aktif)"
