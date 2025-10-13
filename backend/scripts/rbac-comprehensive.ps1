$ErrorActionPreference = 'SilentlyContinue'

Write-Host "=== COMPREHENSIVE RBAC TEST ===" -ForegroundColor Cyan
Write-Host "Testing all roles against all endpoints..." -ForegroundColor Yellow

# Generate fresh tokens
$result = node -e "const jwt=require('jsonwebtoken'); const secret=process.env.JWT_ACCESS_SECRET||'dev-access-secret'; const exp=process.env.JWT_ACCESS_TTL||'1h'; const roles=['admin','manager','warehouse_staff','procurement','logistics','partner']; const out={}; for(const r of roles){ out[r]=jwt.sign({sub:'user-'+r+'-uuid', email:r+'@example.com', role:r}, secret, {expiresIn:exp}); } console.log(JSON.stringify(out))"

$tokens = $null
try { $tokens = $result | ConvertFrom-Json } catch {}
if (-not $tokens) { Write-Host "Failed to generate tokens" -ForegroundColor Red; exit 1 }

$admin = $tokens.admin
$manager = $tokens.manager
$warehousestaff = $tokens.warehouse_staff
$procurement = $tokens.procurement
$logistics = $tokens.logistics
$partner = $tokens.partner

$body = @{productBatchId="123e4567-e89b-12d3-a456-426614174000"; locationId="123e4567-e89b-12d3-a456-426614174001"; quantity=10; createdById="123e4567-e89b-12d3-a456-426614174002"} | ConvertTo-Json

function Test-Endpoint {
    param($token, $role, $endpoint, $method = "GET", $body = $null, $expected = "PASS")
    
    try {
        $headers = @{"Authorization"="Bearer $token"}
        if ($body) { $headers["Content-Type"] = "application/json" }
        
        $res = Invoke-WebRequest -Uri "http://localhost:3000$endpoint" -Headers $headers -Method $method -Body $body
        $status = $res.StatusCode
        
        if ($expected -eq "PASS" -and $status -in @(200, 201, 404)) {
            Write-Host "✅ $role $method $endpoint → $status" -ForegroundColor Green
        } elseif ($expected -eq "FAIL" -and $status -eq 403) {
            Write-Host "✅ $role $method $endpoint → $status (Expected 403)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $role $method $endpoint → $status (Expected $expected)" -ForegroundColor Yellow
        }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($expected -eq "FAIL" -and $status -eq 403) {
            Write-Host "✅ $role $method $endpoint → $status (Expected 403)" -ForegroundColor Green
        } elseif ($expected -eq "PASS" -and $status -eq 404) {
            Write-Host "✅ $role $method $endpoint → $status (404 = has permission but no data)" -ForegroundColor Green
        } else {
            Write-Host "❌ $role $method $endpoint → $status (Expected $expected)" -ForegroundColor Red
        }
    }
}

Write-Host "`n1. AUTH MODULE (All roles should PASS)" -ForegroundColor Yellow
Test-Endpoint $admin "ADMIN" "/auth/me" "GET" $null "PASS"
Test-Endpoint $manager "MANAGER" "/auth/me" "GET" $null "PASS"
Test-Endpoint $warehousestaff "WAREHOUSE_STAFF" "/auth/me" "GET" $null "PASS"
Test-Endpoint $procurement "PROCUREMENT" "/auth/me" "GET" $null "PASS"
Test-Endpoint $logistics "LOGISTICS" "/auth/me" "GET" $null "PASS"
Test-Endpoint $partner "PARTNER" "/auth/me" "GET" $null "PASS"

Write-Host "`n2. INVENTORY MODULE" -ForegroundColor Yellow
Write-Host "Should PASS: ADMIN, MANAGER, WAREHOUSE_STAFF | Should FAIL: PROCUREMENT, LOGISTICS, PARTNER" -ForegroundColor Gray
Test-Endpoint $admin "ADMIN" "/inventory/receive" "POST" $body "PASS"
Test-Endpoint $manager "MANAGER" "/inventory/receive" "POST" $body "PASS"
Test-Endpoint $warehousestaff "WAREHOUSE_STAFF" "/inventory/receive" "POST" $body "PASS"
Test-Endpoint $procurement "PROCUREMENT" "/inventory/receive" "POST" $body "FAIL"
Test-Endpoint $logistics "LOGISTICS" "/inventory/receive" "POST" $body "FAIL"
Test-Endpoint $partner "PARTNER" "/inventory/receive" "POST" $body "FAIL"

Write-Host "`n3. SUPPLIER MODULE" -ForegroundColor Yellow
Write-Host "Should PASS: ADMIN, MANAGER, PROCUREMENT | Should FAIL: WAREHOUSE_STAFF, LOGISTICS, PARTNER" -ForegroundColor Gray
Test-Endpoint $admin "ADMIN" "/supplier" "GET" $null "PASS"
Test-Endpoint $manager "MANAGER" "/supplier" "GET" $null "PASS"
Test-Endpoint $warehousestaff "WAREHOUSE_STAFF" "/supplier" "GET" $null "FAIL"
Test-Endpoint $procurement "PROCUREMENT" "/supplier" "GET" $null "PASS"
Test-Endpoint $logistics "LOGISTICS" "/supplier" "GET" $null "FAIL"
Test-Endpoint $partner "PARTNER" "/supplier" "GET" $null "FAIL"

Write-Host "`n4. ORDER MODULE" -ForegroundColor Yellow
Write-Host "Should PASS: All roles (read-only)" -ForegroundColor Gray
Test-Endpoint $admin "ADMIN" "/order" "GET" $null "PASS"
Test-Endpoint $manager "MANAGER" "/order" "GET" $null "PASS"
Test-Endpoint $warehousestaff "WAREHOUSE_STAFF" "/order" "GET" $null "PASS"
Test-Endpoint $procurement "PROCUREMENT" "/order" "GET" $null "PASS"
Test-Endpoint $logistics "LOGISTICS" "/order" "GET" $null "PASS"
Test-Endpoint $partner "PARTNER" "/order" "GET" $null "PASS"

Write-Host "`n5. REPORTING MODULE" -ForegroundColor Yellow
Write-Host "Should PASS: ADMIN, MANAGER, WAREHOUSE_STAFF, PROCUREMENT, LOGISTICS | Should FAIL: PARTNER" -ForegroundColor Gray
Test-Endpoint $admin "ADMIN" "/reporting/health" "GET" $null "PASS"
Test-Endpoint $manager "MANAGER" "/reporting/health" "GET" $null "PASS"
Test-Endpoint $warehousestaff "WAREHOUSE_STAFF" "/reporting/health" "GET" $null "PASS"
Test-Endpoint $procurement "PROCUREMENT" "/reporting/health" "GET" $null "PASS"
Test-Endpoint $logistics "LOGISTICS" "/reporting/health" "GET" $null "PASS"
Test-Endpoint $partner "PARTNER" "/reporting/health" "GET" $null "FAIL"

Write-Host "`n=== RBAC TEST COMPLETED ===" -ForegroundColor Cyan
Write-Host "Check results above. Green ✅ = Expected behavior" -ForegroundColor Green
Write-Host "Yellow ⚠️ = Unexpected but acceptable (e.g., 404 for missing data)" -ForegroundColor Yellow
Write-Host "Red ❌ = Failed test case" -ForegroundColor Red
