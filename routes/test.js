const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: "Too many login attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false
});

router.get('/test', loginLimiter, (req, res) => {
  try {
    const result = { message: 'API is working' };
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;