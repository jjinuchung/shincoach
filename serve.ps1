# 로컬 테스트 서버 (PC Chrome에서 http://localhost:8080 접속)
# 같은 WiFi의 안드로이드 폰에서는 http://<PC IP>:8080 (서비스워커는 localhost 외 http에서 비활성)
Set-Location $PSScriptRoot
Write-Host "http://localhost:8080  (종료: Ctrl+C)"
python -m http.server 8080 --bind 0.0.0.0
