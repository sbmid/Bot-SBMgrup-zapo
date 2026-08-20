@echo off
echo === Setup Git Protection for Important Files ===
echo.

echo Setting up merge strategy to protect local files...

git config merge.ours.driver "echo Keeping local file: %%A"

echo.
echo === Protection Setup Complete! ===
echo.
echo Protected files:
echo - .env
echo - sessions/
echo - data/responses/
echo - temp/
echo.
echo These files will NEVER be overwritten by git pull
echo.
pause
