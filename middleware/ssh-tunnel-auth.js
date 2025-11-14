const express = require('express');
const router = express.Router();
require('dotenv').config();
const jwt = require('jsonwebtoken');

module.exports = async function validateUser(req, res) {
    console.log('SSH Tunnel Auth Middleware Invoked');

    const dbService = req.app.locals.dbService;
    const users = dbService.collection("users");

    const { operationName, value } = req.params;

    const { admin_key, jwtToken } = req.body;

    if (admin_key !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: 'Invalid admin key' });
    }

    if (!jwtToken) {
        return res.status(401).json({ error: 'JWT token is required' });
    }

    let payload;

    try {
        payload = jwt.verify(jwtToken, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            console.log('Token ist abgelaufen');
            return res.status(401).json({ error: 'JWT token expired' });

        } if (err.name === 'JsonWebTokenError') {
            console.log('Ungültiger Token');
            return res.status(401).json({ error: 'Invalid JWT secret' });

        } else {
            console.log('Ungültiger Token');
            return res.status(401).json({ error: 'Error verifying JWT token' });
        }
    }

    const user = await users.findOne({ username: payload.username });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    console.log('JWT Payload:', payload);

    const validOperations = ['start', 'stop', 'restart', 'status'];
    
    if (!validOperations.includes(operationName)) {
        return res.status(400).json({ 
            error: 'Invalid operation', 
            validOperations: validOperations 
        });
    }

    console.log(`Operation: ${operationName}, Value: ${value}`);
    res.json({ 
        message: `Received operation ${operationName} with value ${value}` 
    });
}
