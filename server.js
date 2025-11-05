const userRoutes = require('./routes/test');
const emptyRoutes = require('./routes/empty');
const sshTunnelRoutes = require('./routes/ssh-tunnels');

const express = require('express');
require('dotenv').config();

const app = express();

// Configuration
const PORT = process.env.PORT || 3004;
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = process.env.API_PREFIX;

// Endpoints
app.use(express.json());
app.use('/', emptyRoutes);
app.use(API_PREFIX, userRoutes);
app.use(API_PREFIX, sshTunnelRoutes);

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://localhost:${PORT}${API_PREFIX}`);
});
