const express = require('express');

const router = express.Router();

const registerUser = require('../middleware/register-user');

router.post('/register-user', registerUser);

module.exports = router;
