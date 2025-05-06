/**
 * Server starter script for CodeFusionX
 * This script starts all required servers and handles port conflicts
 */
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

// Configuration
const IDE_PORT = 3022;
const MEDIASOUP_PORT = 3032;
const CLIENT_PORT = 5173;

// Paths
const ROOT_DIR = __dirname;
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const IDE_SERVER_DIR = path.join(ROOT_DIR, 'ide-server');
const MEDIASOUP_SERVER_DIR = path.join(ROOT_DIR, 'mediasoup-server');

// Environment variables
process.env.VITE_IDE_SERVER_URL = `http://localhost:${IDE_PORT}`;
process.env.VITE_MEDIASOUP_SERVER_URL = `http://localhost:${MEDIASOUP_PORT}`;
process.env.PORT = IDE_PORT.toString();
process.env.MEDIASOUP_PORT = MEDIASOUP_PORT.toString();

// Check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

// Kill process on a specific port (Windows-specific)
async function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    const findPid = spawn('cmd.exe', ['/c', `netstat -ano | findstr :${port}`]);
    let output = '';

    findPid.stdout.on('data', (data) => {
      output += data.toString();
    });

    findPid.on('close', async (code) => {
      if (code !== 0) {
        // No process found on this port
        resolve(false);
        return;
      }

      // Parse the output to find the PID
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && trimmedLine.includes(`${port}`)) {
          const pid = trimmedLine.split(/\s+/).pop().trim();
          
          if (pid && /^\d+$/.test(pid)) {
            console.log(`Found process with PID ${pid} on port ${port}, killing...`);
            
            const killProcess = spawn('taskkill', ['/PID', pid, '/F']);
            
            killProcess.on('close', (killCode) => {
              if (killCode === 0) {
                console.log(`Successfully killed process with PID ${pid}`);
                resolve(true);
              } else {
                console.error(`Failed to kill process with PID ${pid}`);
                resolve(false);
              }
            });
            
            return;
          }
        }
      }
      
      resolve(false);
    });
  });
}

// Start a server
function startServer(name, dir, command, args = []) {
  console.log(`Starting ${name}...`);
  
  const server = spawn(command, args, {
    cwd: dir,
    env: process.env,
    stdio: 'inherit',
    shell: true
  });
  
  server.on('error', (err) => {
    console.error(`Error starting ${name}:`, err);
  });
  
  return server;
}

// Main function
async function main() {
  console.log("Starting CodeFusionX services...");
  
  // Check directories
  const dirs = [CLIENT_DIR, IDE_SERVER_DIR, MEDIASOUP_SERVER_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      console.error(`Directory not found: ${dir}`);
      process.exit(1);
    }
  }
  
  // Check and free ports
  console.log("Checking for port conflicts...");
  
  const portsToCheck = [
    { port: IDE_PORT, name: "IDE Server" },
    { port: MEDIASOUP_PORT, name: "Mediasoup Server" },
    { port: CLIENT_PORT, name: "Client" }
  ];
  
  for (const { port, name } of portsToCheck) {
    if (await isPortInUse(port)) {
      console.log(`Port ${port} for ${name} is in use. Attempting to free it...`);
      const killed = await killProcessOnPort(port);
      
      if (!killed) {
        console.error(`Could not free port ${port}. Please close the application using this port manually.`);
        process.exit(1);
      }
      
      // Wait a moment to ensure the port is released
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Start servers
  console.log("\nStarting servers...");
  
  // Start IDE server
  const ideServer = startServer("IDE Server", IDE_SERVER_DIR, "npm", ["run", "dev"]);
  
  // Wait a bit for the IDE server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start Mediasoup server
  const mediasoupServer = startServer("Mediasoup Server", MEDIASOUP_SERVER_DIR, "npm", ["run", "dev"]);
  
  // Wait a bit for the Mediasoup server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start client
  const client = startServer("Client", CLIENT_DIR, "npm", ["run", "dev"]);
  
  console.log("\nAll services started!");
  console.log(`Client: http://localhost:${CLIENT_PORT}`);
  console.log(`IDE Server: http://localhost:${IDE_PORT}`);
  console.log(`Mediasoup Server: http://localhost:${MEDIASOUP_PORT}`);
  
  // Handle process exit
  process.on('SIGINT', () => {
    console.log("\nStopping all services...");
    ideServer.kill();
    mediasoupServer.kill();
    client.kill();
    process.exit(0);
  });
}

// Run the main function
main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
}); 