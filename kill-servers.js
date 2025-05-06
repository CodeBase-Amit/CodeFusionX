/**
 * Script to kill any processes using our server ports
 */
const { execSync } = require('child_process');

// Define the ports to check
const ports = [3022, 3032, 5173];

console.log('Checking for processes using our ports...');

// Kill process function (Windows-specific)
function killProcessOnPort(port) {
  try {
    // Find the PID of the process using the port
    const output = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = output.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && trimmedLine.includes(`:${port}`)) {
        const pid = trimmedLine.split(/\s+/).pop().trim();
        
        if (pid && /^\d+$/.test(pid)) {
          console.log(`Found process with PID ${pid} on port ${port}, killing...`);
          execSync(`taskkill /PID ${pid} /F`);
          console.log(`Successfully killed process on port ${port}`);
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    // If there's an error (like no process found), just return false
    return false;
  }
}

// Try to kill processes on each port
for (const port of ports) {
  console.log(`Checking port ${port}...`);
  const killed = killProcessOnPort(port);
  if (!killed) {
    console.log(`No process found using port ${port}`);
  }
}

console.log('Done killing processes. Ports should be available now.'); 