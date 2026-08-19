@echo off
echo === Git Initialization Script ===
echo.

echo [1/5] Initializing git...
git init

echo [2/5] Adding all files...
git add .

echo [3/5] Creating first commit...
git commit -m "first commit"

echo [4/5] Setting main branch...
git branch -M main

echo [5/5] Adding remote origin...
git remote add origin https://github.com/sbmid/Bot-SBMgrup-zapo.git

echo.
echo === Setup Complete! ===
echo.
echo Now run: git push -u origin main
echo Or double-click: push.bat
echo.
pause
