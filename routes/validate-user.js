const express = require('express');
const router = express.Router();
const validateUser = require('../middleware/validate-user');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: "Too many login attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/login', loginLimiter, validateUser);

module.exports = router;