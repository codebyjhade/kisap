$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$publicDirectory = Join-Path $PSScriptRoot "..\public"

function New-RoundedPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-KisapIcon([int]$size, [string]$filename) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::FromArgb(11, 11, 11))
  $font = [System.Drawing.Font]::new("Arial", $size * 0.55, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $paper = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(244, 241, 234))
  $signal = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 77, 61))
  $graphics.DrawString("k", $font, $paper, $size * 0.2, $size * 0.25)
  $graphics.FillEllipse($signal, $size * 0.72, $size * 0.18, $size * 0.12, $size * 0.12)
  $bitmap.Save((Join-Path $publicDirectory $filename), [System.Drawing.Imaging.ImageFormat]::Png)
  $signal.Dispose(); $paper.Dispose(); $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

function New-OgImage {
  $width = 1200
  $height = 630
  $bitmap = [System.Drawing.Bitmap]::new($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::FromArgb(11, 11, 11))
  $paper = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(244, 241, 234))
  $muted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(166, 163, 155))
  $signal = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 77, 61))
  $stripBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(20, 20, 19))
  $frameBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(5, 5, 5))
  $linePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(48, 244, 241, 234), 1)
  $titleFont = [System.Drawing.Font]::new("Arial", 86, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $serifFont = [System.Drawing.Font]::new("Georgia", 76, [System.Drawing.FontStyle]::Italic, [System.Drawing.GraphicsUnit]::Pixel)
  $bodyFont = [System.Drawing.Font]::new("Arial", 25, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $brandFont = [System.Drawing.Font]::new("Arial", 31, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $monoFont = [System.Drawing.Font]::new("Consolas", 11, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

  $graphics.DrawString("A moment,", $titleFont, $paper, 74, 130)
  $graphics.DrawString("still moving.", $serifFont, $paper, 72, 220)
  $graphics.DrawString("FOUR MOMENTS  /  PRIVATE WEB PHOTO BOOTH", $bodyFont, $muted, 80, 363)
  $graphics.DrawString("kisap", $brandFont, $paper, 80, 493)
  $graphics.FillEllipse($signal, 163, 518, 9, 9)

  $stripXs = @(785, 970)
  foreach ($stripX in $stripXs) {
    $stripPath = New-RoundedPath $stripX 55 160 520 4
    $graphics.FillPath($stripBrush, $stripPath)
    $graphics.DrawPath($linePen, $stripPath)
    for ($index = 0; $index -lt 4; $index++) {
      $frameY = 78 + ($index * 96)
      $graphics.FillRectangle($frameBrush, $stripX + 14, $frameY, 132, 78)
      $graphics.DrawString(("0" + ($index + 1)), $monoFont, $muted, $stripX + 22, $frameY + 57)
    }
    $graphics.DrawString("kisap.", $bodyFont, $paper, $stripX + 43, 485)
    $stripPath.Dispose()
  }

  $bitmap.Save((Join-Path $publicDirectory "og-image.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $monoFont.Dispose(); $brandFont.Dispose(); $bodyFont.Dispose(); $serifFont.Dispose(); $titleFont.Dispose()
  $linePen.Dispose(); $frameBrush.Dispose(); $stripBrush.Dispose(); $signal.Dispose(); $muted.Dispose(); $paper.Dispose()
  $graphics.Dispose(); $bitmap.Dispose()
}

New-KisapIcon 180 "apple-touch-icon.png"
New-KisapIcon 192 "icon-192.png"
New-KisapIcon 512 "icon-512.png"
New-OgImage
Write-Host "Kisap brand assets generated in $publicDirectory"
