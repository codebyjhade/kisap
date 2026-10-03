$ErrorActionPreference = "Stop"
$fontDirectory = Join-Path $PSScriptRoot "..\public\fonts"
New-Item -ItemType Directory -Force -Path $fontDirectory | Out-Null

$files = @{
  "Manrope-Variable.ttf" = "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/Manrope%5Bwght%5D.ttf"
  "DMMono-Light.ttf" = "https://raw.githubusercontent.com/google/fonts/main/ofl/dmmono/DMMono-Light.ttf"
  "DMMono-Regular.ttf" = "https://raw.githubusercontent.com/google/fonts/main/ofl/dmmono/DMMono-Regular.ttf"
  "DMMono-Medium.ttf" = "https://raw.githubusercontent.com/google/fonts/main/ofl/dmmono/DMMono-Medium.ttf"
  "Newsreader-Italic-Variable.ttf" = "https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/Newsreader-Italic%5Bopsz%2Cwght%5D.ttf"
  "OFL-Manrope.txt" = "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt"
  "OFL-DM-Mono.txt" = "https://raw.githubusercontent.com/google/fonts/main/ofl/dmmono/OFL.txt"
  "OFL-Newsreader.txt" = "https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt"
}

foreach ($entry in $files.GetEnumerator()) {
  Invoke-WebRequest -Uri $entry.Value -OutFile (Join-Path $fontDirectory $entry.Key)
}

Write-Host "Kisap fonts downloaded to $fontDirectory"
