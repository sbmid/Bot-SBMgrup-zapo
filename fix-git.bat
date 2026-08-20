@echo off
echo [!] Fixing Git Conflict...
echo.

REM Abort any merge
git merge --abort 2>nul

REM Clear stash
git stash clear 2>nul

REM Reset to origin/main
git reset --hard origin/main

REM Clean untracked files
git clean -fd

echo.
echo [+] Git Reset Complete!
echo [+] Bot synced with GitHub
echo.
pause
