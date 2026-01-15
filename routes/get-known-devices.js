const express = require('express');
const router = express.Router();
const getKnownDevices = require('../middleware/get-known-devices');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: "Too many login attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false
});

router.get('/get-known-devices-in-local-network', loginLimiter, getKnownDevices);

module.exports = router;
