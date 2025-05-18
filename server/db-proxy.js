// db-proxy.js
// This creates a local proxy for the Supabase connection to work around Replit network restrictions

const { createServer } = require('http');
const net = require('net');
const url = require('url');

// Extract host and port from DATABASE_URL
function getDbDetails() {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const parsed = new url.URL(dbUrl);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432'),
      username: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1) || 'postgres'
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
}

// Start the proxy server
function startDbProxy() {
  const dbDetails = getDbDetails();
  if (!dbDetails) {
    console.error('Could not parse DATABASE_URL');
    return null;
  }

  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('PostgreSQL proxy is running');
  });

  server.on('connect', (req, clientSocket, head) => {
    console.log(`CONNECT request to ${dbDetails.host}:${dbDetails.port}`);
    
    // Connect to the PostgreSQL server
    const serverSocket = net.connect(dbDetails.port, dbDetails.host, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                        'Connection: keep-alive\r\n\r\n');
      serverSocket.write(head);
      
      // Pipe data between client and server
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });

    serverSocket.on('error', (err) => {
      console.error('Error connecting to PostgreSQL server:', err);
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      console.error('Client socket error:', err);
      serverSocket.end();
    });
  });

  // Start on a random port
  const proxyPort = 3456;
  server.listen(proxyPort, () => {
    console.log(`PostgreSQL proxy running on port ${proxyPort}`);
  });

  return `http://localhost:${proxyPort}`;
}

module.exports = { startDbProxy };