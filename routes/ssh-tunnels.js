const express = require('express');
const router = express.Router();

router.get('/ssh-tunnels/:operationName/:value', (req, res) => {
    const { operationName, value } = req.params;

    // Validiere erlaubte Operationen
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
});

module.exports = router;