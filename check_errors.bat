@echo off
echo 🔍 检查项目错误
echo =========================================

echo.
echo 1. 检查依赖...
npm list --depth=0

echo.
echo 2. 检查TypeScript错误...
call npx vue-tsc --noEmit

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ TypeScript编译错误！
    echo    正在检查具体错误...
    call npx vue-tsc --noEmit 2>&1 | findstr /C:"error" /C:"Error"
)

echo.
echo 3. 检查Vite构建...
call npx vite build 2>&1 | findstr /C:"error" /C:"Error" /C:"failed"

echo.
echo 4. 检查服务器状态...
netstat -ano | findstr :3001

echo.
echo 5. 访问测试...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001' -Method Head -UseBasicParsing -ErrorAction Stop; echo '✅ 服务器响应: ' + $response.StatusCode } catch { echo '❌ 服务器访问失败: ' + $_.Exception.Message }"

echo.
echo 💡 如果看到浏览器白屏或错误：
echo    - 按 F12 打开开发者工具
echo    - 查看 Console 面板的错误信息
echo    - 查看 Network 面板的请求状态

pause