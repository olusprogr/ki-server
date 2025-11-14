const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  try {
    const result = { message: 'API is working' };
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;