param(
  [int]$QuietSeconds = 600,
  [int]$PollSeconds = 2
)

$ErrorActionPreference = "Continue"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$hashBytes = [System.Security.Cryptography.SHA1]::Create().ComputeHash(
  [System.Text.Encoding]::UTF8.GetBytes($repoRoot.ToLowerInvariant())
)
$repoHash = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
$createdMutex = $false
$mutex = New-Object System.Threading.Mutex(
  $true,
  "Local\BROHUBS_AUTO_SAVE_GITHUB_$repoHash",
  [ref]$createdMutex
)
if (-not $createdMutex) {
  Write-Host "BROHUBS Auto Save GitHub sudah aktif untuk repo ini."
  exit 0
}

$lastSignature = ""
$lastChange = Get-Date
$busy = $false

function Get-GitPath {
  param([string]$Name)
  $gitDir = (& git rev-parse --git-dir 2>$null)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitDir)) { return $null }
  return Join-Path (Join-Path $repoRoot $gitDir.Trim()) $Name
}

function Test-GitBusy {
  $indexLock = Get-GitPath "index.lock"
  $mergeHead = Get-GitPath "MERGE_HEAD"
  $rebaseMerge = Get-GitPath "rebase-merge"
  $rebaseApply = Get-GitPath "rebase-apply"
  return (
    ($indexLock -and (Test-Path $indexLock)) -or
    ($mergeHead -and (Test-Path $mergeHead)) -or
    ($rebaseMerge -and (Test-Path $rebaseMerge)) -or
    ($rebaseApply -and (Test-Path $rebaseApply))
  )
}

function Get-StatusSignature {
  Set-Location $repoRoot
  $status = (& git status --porcelain)
  if (-not $status) { return "" }
  return ($status -join "`n")
}

function Invoke-AutoSave {
  if ($script:busy) { return }
  $script:busy = $true
  try {
    Set-Location $repoRoot
    if (Test-GitBusy) {
      Write-Host "[auto-save] Git sedang sibuk (merge/rebase/lock). Menunggu..."
      return
    }

    $status = Get-StatusSignature
    if ([string]::IsNullOrWhiteSpace($status)) { return }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Perubahan stabil, menyimpan ke GitHub..."

    & git add -A
    if ($LASTEXITCODE -ne 0) {
      Write-Host "[auto-save] git add gagal."
      return
    }

    $statusAfterAdd = Get-StatusSignature
    if ([string]::IsNullOrWhiteSpace($statusAfterAdd)) { return }

    $message = "autosave: update $timestamp"
    & git commit -m $message
    if ($LASTEXITCODE -ne 0) {
      Write-Host "[auto-save] git commit gagal atau tidak ada perubahan."
      return
    }

    & git push origin HEAD
    if ($LASTEXITCODE -ne 0) {
      Write-Host "[auto-save] Push gagal. Commit tetap aman lokal dan akan bisa dipush lagi nanti."
      return
    }

    Write-Host "[auto-save] Selesai commit + push."
  } finally {
    $script:busy = $false
  }
}

Set-Location $repoRoot

Write-Host "BROHUBS Auto Save GitHub aktif."
Write-Host "Repo: $repoRoot"
Write-Host "Perubahan akan di-commit setelah status Git stabil $QuietSeconds detik, lalu dipush ke origin."
Write-Host "Tekan Ctrl+C untuk berhenti."

try {
  while ($true) {
    Start-Sleep -Seconds $PollSeconds

    if ($busy) { continue }

    $signature = Get-StatusSignature
    if ($signature -ne $lastSignature) {
      $lastSignature = $signature
      $lastChange = Get-Date
      if (-not [string]::IsNullOrWhiteSpace($signature)) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Perubahan terdeteksi. Menunggu stabil..."
      }
      continue
    }

    if ([string]::IsNullOrWhiteSpace($signature)) { continue }

    $age = ((Get-Date) - $lastChange).TotalSeconds
    if ($age -lt $QuietSeconds) { continue }

    Invoke-AutoSave
    $lastSignature = Get-StatusSignature
    $lastChange = Get-Date
  }
} finally {
  if ($mutex) {
    $mutex.ReleaseMutex() | Out-Null
    $mutex.Dispose()
  }
}
