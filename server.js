const userRoutes = require('./routes/test');
const emptyRoutes = require('./routes/empty');
const sshTunnelRoutes = require('./routes/ssh-tunnels');
const registerUser = require('./routes/register-user');
const validateUser = require('./routes/validate-user');
const expressListEndpoints = require('express-list-endpoints');
const express = require('express');
require('dotenv').config();
const dbService = require('./db-service');

const app = express();
dbService();

// Configuration
const PORT = process.env.PORT || 3004;
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = process.env.API_PREFIX;

// Endpoints
app.use(express.json());
app.use('/', emptyRoutes);
app.use(API_PREFIX, userRoutes);
app.use(API_PREFIX, sshTunnelRoutes);
app.use(API_PREFIX, registerUser);
app.use(API_PREFIX, validateUser);

// List Registered Endpoints
const endpoints = expressListEndpoints(app);
console.log('Registered Endpoints:', endpoints);

// Start Server

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://localhost:${PORT}${API_PREFIX}`);
});
