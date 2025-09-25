@echo off
echo 设置 Bingo Quiz 数据库...
echo.

echo 请确保MariaDB服务正在运行
echo 使用密码: binbingo
mysql -u root -pbinbingo < server/database.sql

if %errorlevel% neq 0 (
    echo 数据库创建失败
    pause
    exit /b 1
)

echo.
echo 导入题目数据...
node server/import-data.js

if %errorlevel% neq 0 (
    echo 数据导入失败
    pause
    exit /b 1
)

echo.
echo 数据库设置完成！
echo 现在可以运行 start.bat 启动应用
pause
