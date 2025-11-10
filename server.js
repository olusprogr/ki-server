const express = require('express');
const expressListEndpoints = require('express-list-endpoints');
require('dotenv').config();
const dbService = require('./db-service');
const userRoutes = require('./routes/test');
const emptyRoutes = require('./routes/empty');
const sshTunnelRoutes = require('./routes/ssh-tunnels');
const registerUser = require('./routes/register-user');
const validateUser = require('./routes/validate-user');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = process.env.API_PREFIX;

async function startServer() {
  try {
    const db = await dbService();
    app.locals.db = db;

    // Routen
    app.use('/', emptyRoutes);
    app.use(API_PREFIX, userRoutes);
    app.use(API_PREFIX, sshTunnelRoutes);
    app.use(API_PREFIX, registerUser);
    app.use(API_PREFIX, validateUser);

    // Liste der Endpoints
    console.log('Registered Endpoints:', expressListEndpoints(app));

    // Server starten
    app.listen(PORT, HOST, () => {
      console.log(`Server is running on http://${HOST}:${PORT}${API_PREFIX}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1); // optional: Beende Server bei DB-Fehler
  }
}

startServer();
