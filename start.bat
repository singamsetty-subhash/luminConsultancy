@echo off
setlocal enabledelayedexpansion
title Lumin Consultancy - PHP Web Server

echo ===================================================================
echo   Lumin Consultancy Web Portal ^& Admin Dashboard
echo ===================================================================
echo.

set "PHP_CMD=php"

:: 1. Check if php is in System PATH
where php >nul 2>&1
if %ERRORLEVEL% equ 0 (
    goto :FOUND_PHP
)

:: 2. Check standard XAMPP, WAMP, Laragon, or Program Files paths
if exist "C:\xampp\php\php.exe" (
    set "PHP_CMD=C:\xampp\php\php.exe"
    goto :FOUND_PHP
)

if exist "D:\xampp\php\php.exe" (
    set "PHP_CMD=D:\xampp\php\php.exe"
    goto :FOUND_PHP
)

if exist "C:\laragon\bin\php\php-*\php.exe" (
    for /d %%i in (C:\laragon\bin\php\php-*) do (
        if exist "%%i\php.exe" (
            set "PHP_CMD=%%i\php.exe"
            goto :FOUND_PHP
        )
    )
)

if exist "C:\wamp64\bin\php" (
    for /d %%i in (C:\wamp64\bin\php\php*) do (
        if exist "%%i\php.exe" (
            set "PHP_CMD=%%i\php.exe"
            goto :FOUND_PHP
        )
    )
)

:: 3. PHP Not Found message
echo [ERROR] PHP executable (php.exe) could not be found on your system.
echo.
echo Please do one of the following:
echo   1. Install PHP or XAMPP (https://www.apachefriends.org/)
echo   2. Or add PHP to your Windows Environment PATH.
echo.
echo If using XAMPP:
echo   Copy this 'lumin-site' folder to 'C:\xampp\htdocs\lumin-site'
echo   and open http://localhost/lumin-site/ in your browser.
echo.
pause
exit /b 1

:FOUND_PHP
echo [OK] Using PHP: !PHP_CMD!
echo.
echo Starting web server on http://localhost:8080 ...
echo Press Ctrl+C to stop the server.
echo.

:: Automatically open browser after 1.5 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080/"

:: Start PHP built-in web server with custom router
"!PHP_CMD!" -S localhost:8080 router.php

pause
