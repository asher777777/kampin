$pids = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
if ($pids) {
    foreach ($p in $pids) {
        if ($p) {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 2
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Write-Host "Cleanup complete."
