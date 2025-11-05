const express = require('express');

const router = express.Router();

router.get('/ssh-tunnels/:operationName/:value', (req, res) => {
    const { operationName, value } = req.params;

    if (operationName === "" || value === "") {
        return res.status(400).json({ error: 'Invalid parameters' });
    }

    console.log(`Operation: ${operationName}, Value: ${value}`);
    res.json({ message: `Received operation ${operationName} with value ${value}` });
});

module.exports = router;
