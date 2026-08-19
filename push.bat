@echo off
echo === Git Push Script ===
echo.

echo [1/3] Adding all changes...
git add .

echo [2/3] Committing with message 'Update'...
git commit -m "Update"

echo [3/3] Pushing to origin main...
git push -u origin main

echo.
echo === Push Complete! ===
pause
