require('dotenv').config();
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const path = require('path');

module.exports = async function sshTunnelAuth(req, res) {
    console.log('SSH Tunnel Auth Middleware Invoked');

    const dbService = req.app.locals.dbService;
    const users = dbService.collection("users");

    const { operationName, value } = req.params;

    // const { admin_key } = req.body;

    // if (admin_key !== process.env.ADMIN_KEY) {
    //     return res.status(403).json({ error: 'Invalid admin key' });
    // }

    const jwtToken = req.headers.authorization;

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

    const validOperations = ['start', 'stop', 'restart', 'status'];
    
    if (!validOperations.includes(operationName)) {
        return res.status(400).json({ 
            error: 'Invalid operation', 
            validOperations: validOperations 
        });
    }

    let response = null;

    if (operationName === 'start') {
        response = openSSHTunnelCommand();
    } else if (operationName === 'stop') {
        response = closeSSHTunnelCommand();
    } else if (operationName === 'restart') {
        response = closeSSHTunnelCommand();
        response = openSSHTunnelCommand();
    } else {
        response = checkSSHTunnelStatus();
    }

    console.log(`Operation: ${operationName}, Value: ${value}`);
    res.json({ 
        message: `Received operation ${operationName} with value ${value}`,
        response: response
    });
}

function openSSHTunnelCommand() {
    const scriptPath = path.join(__dirname, '../commands/open-ssh-tunnel.sh');
    exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
        if (error) return console.error(`Error executing SSH tunnel command: ${error.message}`);
        if (stderr) console.error(`SSH tunnel stderr: ${stderr}`);
        if (stdout) console.log(`SSH tunnel stdout: ${stdout}`);
    });
}

function closeSSHTunnelCommand() {
    const scriptPath = path.join(__dirname, '../commands/close-ssh-tunnel.sh');
    exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
        if (error) return console.error(`Error executing SSH tunnel close command: ${error.message}`);
        if (stderr) console.error(`SSH tunnel close stderr: ${stderr}`);
        if (stdout) console.log(`SSH tunnel close stdout: ${stdout}`);
    });
}

function checkSSHTunnelStatus() {
    const scriptPath = path.join(__dirname, '../commands/check-ssh-tunnel.sh');
    exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
        if (error) return console.error(`Error checking SSH tunnel status: ${error.message}`);
        if (stderr) console.error(`SSH tunnel status stderr: ${stderr}`);
        if (stdout) console.log(`SSH tunnel status stdout: ${stdout}`);
    });
}
