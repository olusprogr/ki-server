const express = require('express');
const expressListEndpoints = require('express-list-endpoints');
require('dotenv').config();
const DatabaseService = require('./db-service');
const testRoutes = require('./routes/test');
const emptyRoutes = require('./routes/empty');
const sshTunnelRoutes = require('./routes/ssh-tunnels');
const registerUser = require('./routes/register-user');
const validateUser = require('./routes/validate-user');
const validateAuthToken = require('./routes/validate-authToken');
const AvailableDevicesInLocalNetwork = require('./routes/devices-local-network');
const getKnownDevices = require('./routes/get-known-devices');
const cors = require('cors');

console.log('testRoutes type:', typeof testRoutes);
console.log('emptyRoutes type:', typeof emptyRoutes);
console.log('sshTunnelRoutes type:', typeof sshTunnelRoutes);
console.log('registerUser type:', typeof registerUser);
console.log('validateUser type:', typeof validateUser);
console.log('validateAuthToken type:', typeof validateAuthToken);
console.log('AvailableDevicesInLocalNetwork type:', typeof AvailableDevicesInLocalNetwork);
console.log('getKnownDevices type:', typeof getKnownDevices);



const app = express();

app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://olusprogr.dynv6.net'
  ],
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));


// Debug Middleware VOR express.json()
app.use((req, res, next) => {
  console.log('=== Incoming Request (BEFORE json) ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  next();
});

app.use(express.json());

// Debug Middleware NACH express.json()
app.use((req, res, next) => {
  console.log('=== After JSON Middleware ===');
  console.log('Body:', req.body);
  next();
});

const PORT = process.env.PORT || 3004;
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = process.env.API_PREFIX;

const db = true;
const local = false;
let dbConnection = null;

const dbService = new DatabaseService();

async function startServer() {
  try {

    if (db) {
      if (local) {
        dbService.setDatabase(true);
        dbConnection = await dbService.connect();
      } else {
        dbService.setDatabase(false);
        dbConnection = await dbService.connect();
      }
    }

    app.locals.dbService = dbConnection;

    // Routen
    app.use('/', emptyRoutes);
    app.use(API_PREFIX, testRoutes);
    app.use(API_PREFIX, sshTunnelRoutes);
    app.use(API_PREFIX, registerUser);
    app.use(API_PREFIX, validateUser);
    app.use(API_PREFIX, validateAuthToken);
    app.use(API_PREFIX, AvailableDevicesInLocalNetwork);
    app.use(API_PREFIX, getKnownDevices);

    // Liste der Endpoints
    console.log('Registered Endpoints:', expressListEndpoints(app));

    // Server starten
    app.listen(PORT, HOST, () => {
      console.log(`Server is running on http://${HOST}:${PORT}${API_PREFIX}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();