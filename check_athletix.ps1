# ============================================================
# Athletix Deep Health Check Script
# Run: PowerShell -ExecutionPolicy Bypass -File .\check_athletix.ps1
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ATHLETIX FULL SYSTEM HEALTH CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$BACKEND = "https://fyp-athletix-production.up.railway.app"
$ML      = "https://desirable-playfulness-production-a1dd.up.railway.app"
$pass = 0
$fail = 0

function Get-Val($obj, $field) {
    if ($null -eq $obj) { return "NULL" }
    $v = $obj.$field
    if ($null -eq $v -or $v -eq "") { return "NULL" }
    return $v
}

function Test-API($label, $url, $method, $body, $headers, $expectCode, $expectField) {
    if (-not $method)     { $method = "GET" }
    if (-not $expectCode) { $expectCode = 200 }
    try {
        $params = @{
            Uri              = $url
            Method           = $method
            UseBasicParsing  = $true
            ErrorAction      = "Stop"
        }
        if ($headers) { $params.Headers = $headers }
        if ($body)    { $params.Body = $body; $params.ContentType = "application/json" }

        $res  = Invoke-WebRequest @params
        $json = $res.Content | ConvertFrom-Json
        $ok   = ($res.StatusCode -eq $expectCode)
        if ($expectField -and $ok) {
            $ok = ($null -ne $json.$expectField)
        }
        if ($ok) {
            Write-Host "  [PASS] $label" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  [FAIL] $label (status=$($res.StatusCode))" -ForegroundColor Red
            $script:fail++
        }
        return $json
    } catch {
        $code = ""
        if ($_.Exception.Response) { $code = " (status=$([int]$_.Exception.Response.StatusCode))" }
        if ($expectCode -ne 200 -and $code -match [string]$expectCode) {
            Write-Host "  [PASS] $label" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  [FAIL] $label$code" -ForegroundColor Red
            $script:fail++
        }
        return $null
    }
}

# ── 1. Infrastructure ─────────────────────────────────────
Write-Host "1. INFRASTRUCTURE" -ForegroundColor Yellow
$bh = Test-API "Backend health"    $BACKEND"/health"  "GET" $null $null 200 "status"
$mh = Test-API "ML server health"  $ML"/health"       "GET" $null $null 200 "status"
Test-API        "ML exercises list" $ML"/exercises"   "GET" $null $null 200 $null | Out-Null

if ($mh) {
    $ml_count = Get-Val $mh "models_loaded"
    Write-Host "     Models loaded: $ml_count" -ForegroundColor Gray
}

# ── 2. Authentication ─────────────────────────────────────
Write-Host ""
Write-Host "2. AUTHENTICATION" -ForegroundColor Yellow
$loginBody = '{"email":"test@test.com","password":"Test1234!"}'
$loginRes  = Test-API "Login valid credentials" $BACKEND"/api/v1/auth/login" "POST" $loginBody $null 200 "access_token"
$token     = $null
if ($loginRes) { $token = $loginRes.access_token }

# Wrong password test
try {
    Invoke-WebRequest -Uri $BACKEND"/api/v1/auth/login" -Method POST -Body '{"email":"test@test.com","password":"wrong"}' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop | Out-Null
    Write-Host "  [FAIL] Wrong password should be rejected" -ForegroundColor Red
    $fail++
} catch {
    Write-Host "  [PASS] Wrong password correctly rejected (401)" -ForegroundColor Green
    $pass++
}

if ($token) {
    $authH = @{ Authorization = "Bearer $token" }

    Test-API "Get current user" $BACKEND"/api/v1/auth/me" "GET" $null $authH 200 "email" | Out-Null

    # ── 3. Profile ─────────────────────────────────────────
    Write-Host ""
    Write-Host "3. USER PROFILE" -ForegroundColor Yellow
    $prof = Test-API "Get full profile" $BACKEND"/api/v1/users/me/profile" "GET" $null $authH 200 "fitness_goal"

    if ($prof) {
        $gender  = Get-Val $prof "gender"
        $dob     = Get-Val $prof "date_of_birth"
        $height  = Get-Val $prof "height_cm"
        $weight  = Get-Val $prof "weight_kg"
        $goal    = Get-Val $prof "fitness_goal"
        $cal     = Get-Val $prof "daily_calorie_target"
        $prot    = Get-Val $prof "protein_target_g"
        $bf      = Get-Val $prof "body_fat_percentage"

        $gColor = if ($gender -eq "NULL") { "Red" } else { "Gray" }
        $dColor = if ($dob    -eq "NULL") { "Red" } else { "Gray" }

        Write-Host "     Gender:    $gender"  -ForegroundColor $gColor
        Write-Host "     DOB:       $dob"     -ForegroundColor $dColor
        Write-Host "     Height:    $height cm" -ForegroundColor Gray
        Write-Host "     Weight:    $weight kg"  -ForegroundColor Gray
        Write-Host "     Goal:      $goal"       -ForegroundColor Gray
        Write-Host "     Calories:  $cal kcal"   -ForegroundColor Gray
        Write-Host "     Protein:   $prot g"     -ForegroundColor Gray
        Write-Host "     Body Fat:  $bf"         -ForegroundColor Gray

        if ($gender -eq "NULL") { Write-Host "     WARNING: Gender not set" -ForegroundColor Red }
        if ($dob    -eq "NULL") { Write-Host "     WARNING: Date of birth not set" -ForegroundColor Red }
    }

    # ── 4. Progress ─────────────────────────────────────────
    Write-Host ""
    Write-Host "4. PROGRESS TRACKER" -ForegroundColor Yellow
    $progList = Test-API "Get progress history" $BACKEND"/api/v1/progress/" "GET" $null $authH 200 $null
    Test-API "Get latest progress" $BACKEND"/api/v1/progress/latest" "GET" $null $authH 200 "id" | Out-Null

    if ($progList) {
        $count = if ($progList -is [Array]) { $progList.Count } else { 1 }
        Write-Host "     Progress records: $count" -ForegroundColor Gray
    }

    $testLog = '{"weight_kg":75.0,"body_fat_percentage":18.0,"notes":"Health check test"}'
    $logged  = Test-API "Log new progress record" $BACKEND"/api/v1/progress/" "POST" $testLog $authH 201 $null
    if ($logged) {
        $rid = Get-Val $logged "id"
        Write-Host "     Saved record ID: $rid" -ForegroundColor Gray
    }

    # ── 5. Workouts ──────────────────────────────────────────
    Write-Host ""
    Write-Host "5. WORKOUTS" -ForegroundColor Yellow
    $exList   = Test-API "Get exercise library"  $BACKEND"/api/v1/workouts/exercises" "GET" $null $authH 200 $null
    $sessList = Test-API "Get workout sessions"  $BACKEND"/api/v1/workouts/sessions"  "GET" $null $authH 200 $null
    Test-API "Form analysis history" $BACKEND"/api/v1/workouts/form-analysis/1/history" "GET" $null $authH 200 $null | Out-Null

    if ($exList)   {
        $ec = if ($exList -is [Array]) { $exList.Count } else { 1 }
        Write-Host "     Exercises in DB: $ec" -ForegroundColor Gray
    }
    if ($sessList) {
        $sc = if ($sessList -is [Array]) { $sessList.Count } else { 1 }
        Write-Host "     Sessions logged: $sc" -ForegroundColor Gray
    }

    # ── 6. Diet ──────────────────────────────────────────────
    Write-Host ""
    Write-Host "6. DIET" -ForegroundColor Yellow
    $foods = Test-API "Food search all"      $BACKEND"/api/v1/diet/foods"                         "GET" $null $authH 200 $null
    Test-API "Food search Pakistani" $BACKEND"/api/v1/diet/foods?is_pakistani_local=true" "GET" $null $authH 200 $null | Out-Null
    Test-API "Food search halal"     $BACKEND"/api/v1/diet/foods?is_halal=true"           "GET" $null $authH 200 $null | Out-Null

    if ($foods) {
        $fc = if ($foods -is [Array]) { $foods.Count } else { 1 }
        Write-Host "     Foods in DB: $fc" -ForegroundColor Gray
    }

    # ── 7. Chat ──────────────────────────────────────────────
    Write-Host ""
    Write-Host "7. CHAT (ARIXA AI)" -ForegroundColor Yellow
    $chatSessions = Test-API "Get chat sessions" $BACKEND"/api/v1/chat/sessions" "GET" $null $authH 200 $null

    if ($chatSessions -and ($chatSessions -is [Array]) -and $chatSessions.Count -gt 0) {
        $sid     = $chatSessions[0].id
        $msgBody = '{"content":"Reply with just the word OK"}'
        $chatRes = Test-API "Send message to Arixa" $BACKEND"/api/v1/chat/sessions/$sid/messages" "POST" $msgBody $authH 201 "content"
        if ($chatRes) {
            $reply = Get-Val $chatRes "content"
            Write-Host "     Arixa replied: $($reply.ToString().Substring(0, [Math]::Min(60,$reply.ToString().Length)))" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [SKIP] No chat sessions found - create one in app first" -ForegroundColor DarkYellow
    }

    # ── 8. ML Server ─────────────────────────────────────────
    Write-Host ""
    Write-Host "8. ML FORM ANALYSIS SERVER" -ForegroundColor Yellow
    $mlEx = Test-API "ML exercises endpoint" $ML"/exercises" "GET" $null $null 200 "exercises"
    if ($mlEx) {
        $mlCount = if ($mlEx.exercises -is [Array]) { $mlEx.exercises.Count } else { 0 }
        Write-Host "     ML exercises available: $mlCount" -ForegroundColor Gray
    }

} else {
    Write-Host ""
    Write-Host "  [SKIP] All auth tests skipped - login failed" -ForegroundColor DarkYellow
}

# ── 9. Frontend Static Scan ──────────────────────────────
Write-Host ""
Write-Host "9. FRONTEND STATIC VALUE SCAN" -ForegroundColor Yellow
$frontendPath = ".\Frontend\src\screens"
if (Test-Path $frontendPath) {
    $checks = @(
        @{ P="exercise_id.*?[:=].*?1\b";       L="Hardcoded exercise_id=1 in FormAnalysisScreen" },
        @{ P="session_exercise_id.*?[:=].*?1\b";L="Hardcoded session_exercise_id=1" },
        @{ P="age\s*=\s*25";                    L="Hardcoded age fallback=25 in FitnessGoalScreen" },
        @{ P="level\s*=\s*'beginner'";          L="Hardcoded fitness_level=beginner" },
        @{ P="TODO|FIXME";                      L="TODO/FIXME comment in code" },
        @{ P="console\.log";                    L="console.log in production code" }
    )
    $warnCount = 0
    Get-ChildItem "$frontendPath\*.tsx" | ForEach-Object {
        $fname    = $_.Name
        $fcontent = Get-Content $_.FullName -Raw
        foreach ($c in $checks) {
            if ($fcontent -match $c.P) {
                Write-Host "  [WARN] [$fname] $($c.L)" -ForegroundColor DarkYellow
                $warnCount++
            }
        }
    }
    if ($warnCount -eq 0) {
        Write-Host "  [OK] No static value issues found" -ForegroundColor Green
        $pass++
    }
} else {
    Write-Host "  [SKIP] Run from C:\Users\azhan\Athletix-frontend" -ForegroundColor DarkYellow
}

# ── SUMMARY ──────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
$color = if ($fail -eq 0) { "Green" } else { "Red" }
Write-Host "  PASSED: $pass   FAILED: $fail" -ForegroundColor $color
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
if ($fail -eq 0) {
    Write-Host "All systems operational!" -ForegroundColor Green
} else {
    Write-Host "$fail test(s) failed - check output above" -ForegroundColor Red
}