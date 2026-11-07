$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outDir = "d:\Nov\Nov slot 1\Fashion Designing Institute\tests\screenshots"

$viewports = @(
  @{ name = "1440px_Large_Desktop"; w = 1440; h = 900 },
  @{ name = "1280px_Desktop";       w = 1280; h = 800 },
  @{ name = "1024px_Laptop";        w = 1024; h = 768 },
  @{ name = "768px_Tablet";         w = 768;  h = 1024 },
  @{ name = "390px_Mobile";         w = 390;  h = 844 },
  @{ name = "360px_Small_Mobile";   w = 360;  h = 780 }
)

$pages = @(
  @{ name = "home-1"; file = "file:///d:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/index.html" },
  @{ name = "home-2"; file = "file:///d:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/home-2.html" }
)

Write-Host "Capturing 12 responsive viewport screenshots..." -ForegroundColor Cyan

foreach ($vp in $viewports) {
  foreach ($pg in $pages) {
    $tempFile = "C:\Users\acer\AppData\Local\Temp\$($pg.name)_$($vp.name).png"
    $destFile = "$outDir\$($pg.name)_$($vp.name).png"
    $w = $vp.w
    $h = $vp.h
    $target = $pg.file

    $p = Start-Process -FilePath $chrome -ArgumentList @(
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=$w,$h",
      "--screenshot=$tempFile",
      $target
    ) -Wait -PassThru

    if (Test-Path $tempFile) {
      Copy-Item -Path $tempFile -Destination $destFile -Force
      Remove-Item $tempFile -Force
      $size = (Get-Item $destFile).Length
      Write-Host "✓ Captured $($pg.name) @ $($vp.name) ($($w)x$($h)) - $size bytes" -ForegroundColor Green
    } else {
      Write-Host "✗ Failed $($pg.name) @ $($vp.name) (ExitCode: $($p.ExitCode))" -ForegroundColor Red
    }
  }
}

Write-Host "`nAll screenshots captured successfully!" -ForegroundColor Cyan

