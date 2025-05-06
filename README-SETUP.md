# CodeFusionX Setup Guide

## Port Configuration
The project uses the following ports:

- **Client**: 5173
- **IDE Server**: 3022 (changed from 5000/3021)
- **Mediasoup Server**: 3032 (changed from 3030/3031)

## Project Structure
The project is structured as follows:
```
CodeFusionX-1.0.1/
└── CodeFusionX/
    ├── client/
    ├── ide-server/
    ├── mediasoup-server/
    └── ...
```

## Running the Project

### Method 1: Using the provided scripts

1. Navigate to the CodeFusionX directory:
   ```bash
   cd /path/to/CodeFusionX-1.0.1/CodeFusionX
   ```

2. Use the start-all script (Windows or Linux/Mac):
   - On Windows: `start-all.bat`
   - On Linux/Mac: `./start-all.sh` (make it executable first with `chmod +x start-all.sh`)

### Method 2: Running services individually

1. Navigate to the CodeFusionX directory:
   ```bash
   cd /path/to/CodeFusionX-1.0.1/CodeFusionX
   ```

2. Start each service in a separate terminal:
   ```bash
   # Run the client
   cd client && npm run dev

   # Run the IDE server (with environment variable)
   PORT=3022 cd ide-server && npm run dev

   # Run the mediasoup server (with environment variable)
   MEDIASOUP_PORT=3032 cd mediasoup-server && npm run dev
   ```

### Method 3: Using Docker Compose

1. Navigate to the CodeFusionX directory:
   ```bash
   cd /path/to/CodeFusionX-1.0.1/CodeFusionX
   ```

2. Start all services with Docker Compose:
   ```bash
   docker-compose -f docker-compose.dev-all.yml up
   ```

## Building for Production

Build all components:
```bash
cd /path/to/CodeFusionX-1.0.1/CodeFusionX
npm run build:all
```

## Troubleshooting

1. **Connection Issues**: 
   - Make sure all servers are running on the correct ports
   - Check the browser console for any errors
   - Verify that the servers are accessible via the specified URLs

2. **Port Conflicts**:
   If you encounter port conflicts, modify the port numbers in:
   - `mediasoup-server/server.ts` - look for `CONFIG.server.port`
   - `ide-server/server.ts` - look for `const PORT`
   - Update corresponding ports in `docker-compose.dev-all.yml`

3. **Path Issues**:
   - Make sure you are running the commands from the correct directory
   - The correct path is `/path/to/CodeFusionX-1.0.1/CodeFusionX/`, not just `/path/to/CodeFusionX-1.0.1/` 