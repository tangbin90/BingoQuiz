@echo off
echo 启动 Bingo Quiz 应用...
echo.

echo 1. 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo 后端依赖安装失败
    pause
    exit /b 1
)

cd client
call npm install
if %errorlevel% neq 0 (
    echo 前端依赖安装失败
    pause
    exit /b 1
)
cd ..

echo.
echo 2. 请确保MySQL服务正在运行
echo 3. 请确保已创建数据库并导入数据
echo.
echo 启动应用...
call npm run dev

pause

