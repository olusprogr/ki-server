const express = require('express');
const router = express.Router();
const sshTunnelRoutes = require('../middleware/ssh-tunnel-auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 2,
    message: { error: "Too many login attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/ssh-tunnel-auth/:operationName', loginLimiter, sshTunnelRoutes);

module.exports = router;