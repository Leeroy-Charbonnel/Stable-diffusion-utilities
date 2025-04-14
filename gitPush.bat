@echo off
setlocal enabledelayedexpansion

REM Get the current date and time
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
    set day=%%a
    set month=%%b
    set year=%%c
)

for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set hour=%%a
    set minute=%%b
)

REM Format default commit message
set default_message=Update %day%/%month%/%year% - %hour%:%minute%

REM Prompt for commit message
set /p commit_message=Enter commit message (press Enter for default): 

REM If no message entered, use default
if "!commit_message!"=="" (
    set commit_message=!default_message!
)

REM Display the commit message being used
echo.
echo Committing with message: "!commit_message!"
echo.

REM Add all files and commit
git add .
git commit -m "!commit_message!"

echo.
echo Git push :
git push

echo.
echo Git status after push:
git status

pause