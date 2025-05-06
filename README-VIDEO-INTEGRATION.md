# CodeFusionX with Video Chat Integration

This project integrates video chat functionality into CodeFusionX, allowing users in the same collaborative coding room to communicate via video and audio.

## Architecture

The system uses a two-backend architecture:

1. **IDE Server**: The main CodeFusionX server that handles code collaboration, file operations, and room management.
2. **Mediasoup Server**: An SFU (Selective Forwarding Unit) WebRTC server that manages video/audio streams between users.

## Project Structure

```
CodeFusionX/
├── client/               # React frontend
├── ide-server/           # IDE server (TypeScript)
│   ├── server.ts         # Main server file
│   ├── Dockerfile        # Docker configuration for IDE server
│   └── package.json      # Dependencies for IDE server
├── mediasoup-server/     # Mediasoup video server (TypeScript)
│   ├── server.ts         # Main server file
│   ├── Dockerfile        # Docker configuration for Mediasoup server
│   └── package.json      # Dependencies for Mediasoup server
└── docker-compose.dev.yml # Docker configuration for all services
```

## Prerequisites

- Node.js 18+ and npm
- Required ports:
  - 3000: Client
  - 5000: IDE Server
  - 3030: Mediasoup Server
  - 40000-49999/UDP: Mediasoup WebRTC connections

## Setup and Installation

### 1. Install Dependencies

```bash
# Install IDE server dependencies
cd ide-server
npm install

# Install Mediasoup server dependencies
cd ../mediasoup-server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Build the Client and Servers

```bash
# Build the IDE server
cd ide-server
npm run build

# Build the Mediasoup server
cd ../mediasoup-server
npm run build

# Build the client
cd ../client
npm run build
```

### 3. Starting the Application

There are two ways to start the application:

#### Option 1: Using npm scripts (development)

```bash
# Start the IDE server (Terminal 1)
cd ide-server
npm run dev

# Start the Mediasoup server (Terminal 2)
cd mediasoup-server
npm run dev

# Start the client (Terminal 3)
cd client
npm run dev
```

#### Option 2: Using Docker Compose (Development)

```bash
docker-compose -f docker-compose.dev.yml up
```

## Usage Instructions

1. Open your browser and navigate to `http://localhost:3000`.
2. Create a new room or join an existing one.
3. When in a room, click the video chat icon in the sidebar to access the video chat panel.
4. Grant permission when prompted for camera and microphone access.
5. You should now be able to see and hear other users in the same room.

## Video Chat Controls

- **Start/End Call**: Initiates or terminates your video/audio connection.
- **Mute/Unmute**: Toggles your microphone.
- **Video On/Off**: Toggles your camera.

## Technical Details

### Integration Architecture

The integration uses a coordinated approach between the IDE server and Mediasoup server:

1. When a user joins a CodeFusionX room, the IDE server handles the initial connection and room creation.
2. When the video chat is accessed, the client connects to the Mediasoup server.
3. The two servers communicate indirectly through the client to synchronize room information.

### Mediasoup Integration

The integration uses the mediasoup-client library to connect to the Mediasoup server. When a user joins a CodeFusionX room:

1. A corresponding room is created or joined on the Mediasoup server.
2. WebRTC connections are established between peers.
3. Video/audio streams are transmitted through the Mediasoup SFU server.

### Network Requirements

- For local testing, ensure ports 40000-49999 UDP are available for WebRTC traffic.
- For production deployment, ensure the server has proper public IP or STUN/TURN configuration.

## Troubleshooting

### Common Issues

1. **No Video/Audio**: Check browser permissions for camera and microphone access.
2. **Connection Fails**: Ensure all servers are running and ports are open/not blocked by firewalls.
3. **Black Screen**: Make sure your camera is working properly by testing in another application.

### Debug Mode

To enable debug logging:

```bash
# For Mediasoup server
cd mediasoup-server
NODE_ENV=development DEBUG=mediasoup* npm run dev
``` 