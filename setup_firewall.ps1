# Run as Administrator
# Opens ports 80, 3000, 5000 in Windows Firewall for LAN access

New-NetFirewallRule -DisplayName "SSTM - Nginx port 80"    -Direction Inbound -Protocol TCP -LocalPort 80   -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "SSTM - Node API port 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "SSTM - Invoice port 5000"  -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -ErrorAction SilentlyContinue

Write-Host "Firewall rules added for ports 80, 3000, 5000" -ForegroundColor Green
