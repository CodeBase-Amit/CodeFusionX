@echo off
echo Starting CodeFusionX services with automatic port management...

:: Execute the Node.js script to start all services
node start-servers.js

:: If the script exits, wait for user input before closing
pause 