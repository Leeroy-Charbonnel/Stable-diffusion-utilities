@echo off
echo Starting 3 processes...

start "Server" cmd /k "bun run src/server.ts"
start "Frontend" cmd /k "npm run dev:frontend"
start "WebUI" "webui-user.bat - Raccourci.lnk"

echo All processes started.
