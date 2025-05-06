@echo off
echo Starting all CodeFusionX services...

:: Set environment variables
set VITE_MEDIASOUP_SERVER_URL=http://localhost:3032
set VITE_IDE_SERVER_URL=http://localhost:3022
set MEDIASOUP_PORT=3032
set PORT=3022

:: Start client (will open a new terminal window)
start cmd /k "cd client && npm run dev"

:: Start mediasoup server (will open a new terminal window)
start cmd /k "cd mediasoup-server && npm run dev"

:: Start IDE server (will open a new terminal window)
start cmd /k "cd ide-server && npm run dev"

echo All services started!
echo Client: http://localhost:5173
echo Mediasoup Server: http://localhost:3032
echo IDE Server: http://localhost:3022 