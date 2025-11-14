const express = require('express');
const router = express.Router();
const validateUser = require('../middleware/validate-user');

router.post('/login', validateUser);

module.exports = router;