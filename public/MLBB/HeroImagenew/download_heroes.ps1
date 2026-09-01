# PowerShell script to download Mobile Legends: Bang Bang hero images
# and generate black‑and‑white (grayscale) copies.
#
# Target directories (adjust if needed):
#   $colorDir : colored images
#   $bwDir    : grayscale images

$colorDir = "D:\\APP\\BROHUBS\\App\\public\\MLBB\\HeroImagenew\\Hero All"
$bwDir    = "D:\\APP\\BROHUBS\\App\\public\\MLBB\\HeroImagenew\\Hero All Hitam Putih"

# Ensure directories exist
if (-not (Test-Path -Path $colorDir)) { New-Item -ItemType Directory -Path $colorDir -Force | Out-Null }
if (-not (Test-Path -Path $bwDir))    { New-Item -ItemType Directory -Path $bwDir -Force | Out-Null }

function Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $msg"
}

# Step 1: Retrieve list of heroes from the Mobile Legends Fandom API
$categoryApi = "https://mobile-legends.fandom.com/api.php?action=query&list=categorymembers&cmtitle=Category:Heroes&cmlimit=500&format=json"
Log "Fetching hero list from API..."
$categoryResponse = Invoke-WebRequest -Uri $categoryApi -UseBasicParsing
$categoryJson = $categoryResponse.Content | ConvertFrom-Json
$heroes = $categoryJson.query.categorymembers
Log "Found $($heroes.Count) heroes."

# Step 2: For each hero, obtain the main portrait image URL
foreach ($hero in $heroes) {
    $title = $hero.title
    $imageApi = "https://mobile-legends.fandom.com/api.php?action=query&titles=$( [uri]::EscapeDataString($title) )&prop=pageimages&format=json&pithumbsize=0"
    try {
        $imgResp = Invoke-WebRequest -Uri $imageApi -UseBasicParsing -ErrorAction Stop
        $imgJson = $imgResp.Content | ConvertFrom-Json
        $pages = $imgJson.query.pages
        $page = $pages.PSObject.Properties.Value
        $imageUrl = $page.thumbnail.source
        if (-not $imageUrl) { Log "No image found for hero '$title'. Skipping."; continue }
        $safeName = $title -replace '[\\/:*?"<>|]', '_'  # sanitize filename
        $fileName = "$safeName.png"
        $colorPath = Join-Path $colorDir $fileName
        $bwPath = Join-Path $bwDir $fileName
        if (-not (Test-Path $colorPath)) {
            Log "Downloading '$title' image..."
            Invoke-WebRequest -Uri $imageUrl -OutFile $colorPath -UseBasicParsing
        } else { Log "Image for '$title' already exists. Skipping download." }
        if (-not (Test-Path $bwPath)) {
            Log "Generating grayscale for '$title'..."
            Add-Type -AssemblyName System.Drawing
            $bitmap = [System.Drawing.Bitmap]::FromFile($colorPath)
            for ($x=0;$x -lt $bitmap.Width;$x++) {
                for ($y=0;$y -lt $bitmap.Height;$y++) {
                    $pixel = $bitmap.GetPixel($x,$y)
                    $gray = [int]([math]::Round((0.299*$pixel.R)+(0.587*$pixel.G)+(0.114*$pixel.B)))
                    $grayColor = [System.Drawing.Color]::FromArgb($gray,$gray,$gray)
                    $bitmap.SetPixel($x,$y,$grayColor)
                }
            }
            $bitmap.Save($bwPath,[System.Drawing.Imaging.ImageFormat]::Png)
            $bitmap.Dispose()
        } else { Log "Grayscale image for '$title' already exists. Skipping conversion." }
    } catch { Log "Error processing hero '$title': $_" }
}

Log "All done. Colored images in '$colorDir', grayscale images in '$bwDir'."
