$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Generating tokens using current JWT_ACCESS_SECRET..." -ForegroundColor Cyan

$result = node -e "const jwt=require('jsonwebtoken'); const secret=process.env.JWT_ACCESS_SECRET||'dev-access-secret'; const exp=process.env.JWT_ACCESS_TTL||'1h'; const roles=['admin','manager','warehouse_staff','procurement','logistics','partner']; const out={}; for(const r of roles){ out[r]=jwt.sign({sub:'user-'+r+'-uuid', email:r+'@example.com', role:r}, secret, {expiresIn:exp}); } console.log(JSON.stringify(out))"

$tokens = $null
try { $tokens = $result | ConvertFrom-Json } catch {}
if (-not $tokens) { Write-Host "Failed to generate tokens" -ForegroundColor Red; exit 1 }

$admin = $tokens.admin
$manager = $tokens.manager
$partner = $tokens.partner

Write-Host "Testing RBAC endpoints..." -ForegroundColor Cyan

Write-Host "1) GET /auth/me (ADMIN)" -ForegroundColor Yellow
try {
  $res = Invoke-WebRequest -Uri "http://localhost:3000/auth/me" -Headers @{"Authorization"="Bearer $admin"} -Method GET
  Write-Host $res.Content
} catch { Write-Host $_.Exception.Message -ForegroundColor Red }

Write-Host "2) GET /reporting/health (MANAGER)" -ForegroundColor Yellow
try {
  $res = Invoke-WebRequest -Uri "http://localhost:3000/reporting/health" -Headers @{"Authorization"="Bearer $manager"} -Method GET
  Write-Host $res.Content
} catch { Write-Host $_.Exception.Message -ForegroundColor Red }

Write-Host "3) GET /reporting/health (PARTNER) expect 403" -ForegroundColor Yellow
try {
  $res = Invoke-WebRequest -Uri "http://localhost:3000/reporting/health" -Headers @{"Authorization"="Bearer $partner"} -Method GET
  Write-Host $res.StatusCode
} catch { Write-Host $_.Exception.Response.StatusCode.value__ }

Write-Host "4) POST /inventory/receive (PARTNER) expect 403" -ForegroundColor Yellow
$body = @{productBatchId="123e4567-e89b-12d3-a456-426614174000"; locationId="123e4567-e89b-12d3-a456-426614174001"; quantity=10; createdById="123e4567-e89b-12d3-a456-426614174002"} | ConvertTo-Json
try {
  $res = Invoke-WebRequest -Uri "http://localhost:3000/inventory/receive" -Headers @{"Authorization"="Bearer $partner"; "Content-Type"="application/json"} -Method POST -Body $body
  Write-Host $res.StatusCode
} catch { Write-Host $_.Exception.Response.StatusCode.value__ }

Write-Host "5) POST /inventory/receive (ADMIN) expect 2xx/404" -ForegroundColor Yellow
try {
  $res = Invoke-WebRequest -Uri "http://localhost:3000/inventory/receive" -Headers @{"Authorization"="Bearer $admin"; "Content-Type"="application/json"} -Method POST -Body $body
  Write-Host $res.StatusCode
} catch { Write-Host $_.Exception.Response.StatusCode.value__ }


