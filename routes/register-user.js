const express = require('express');
const router = express.Router();
const registerUser = require('../middleware/register-user');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: "Too many login attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/register-user', loginLimiter, registerUser);

module.exports = router;
