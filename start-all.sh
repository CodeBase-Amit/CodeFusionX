#!/bin/bash

# Start all services for CodeFusionX
echo "Starting all CodeFusionX services..."

# Set environment variables
export VITE_MEDIASOUP_SERVER_URL=http://localhost:3032
export VITE_IDE_SERVER_URL=http://localhost:3022
export MEDIASOUP_PORT=3032
export PORT=3022

# Function to start a service
start_service() {
  cd "$1" && npm run dev &
  echo "Started $1"
  cd ..
}

# Start all services
start_service "client"
start_service "mediasoup-server"
start_service "ide-server"

echo "All services started!"
echo "Client: http://localhost:5173"
echo "Mediasoup Server: http://localhost:3032"
echo "IDE Server: http://localhost:3022"

# Wait for all background processes
wait 