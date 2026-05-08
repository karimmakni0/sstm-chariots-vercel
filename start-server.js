const { spawn, execSync } = require('child_process');
const http = require('http');

// Start Python invoice server
const server = spawn('py', ['-3', 'C:\\Users\\user\\OneDrive\\Desktop\\invoice_server.py'], {
  detached: true, stdio: 'ignore'
});
server.unref();

// Wait until server is up, then do nothing (ng serve handles the rest)
function waitForServer(retries = 20) {
  http.get('http://localhost:5000/generate', () => {}).on('error', () => {
    if (retries > 0) setTimeout(() => waitForServer(retries - 1), 500);
  });
}
waitForServer();
