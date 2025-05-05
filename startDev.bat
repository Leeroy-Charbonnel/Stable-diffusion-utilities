@echo off
echo Starting 3 processes...

start "Server" cmd /k "bun run --watch src/server.ts"
start "Frontend" cmd /k "npm run dev:frontend"

echo All processes started.
