const jwt = require('jsonwebtoken');

module.exports = async function validateAuthToken(req, res) {
    console.log('Validate Auth Token Middleware Invoked');

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    console.log('Authorization Header:', authHeader);

    let username;
    let payload;
    try {
        payload = jwt.verify(authHeader, process.env.JWT_SECRET);
        console.log('Verified JWT Payload:', payload);
        username = payload.username;
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired auth token' });
    }

    const db = req.app.locals.dbService;

    if (!db) {
        return res.status(500).json({ error: 'Database connection not available' });
    }

    const users = db.collection("users");
    const user = await users.findOne({ username: username });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (user.username !== username) {
        return res.status(403).json({ error: 'Username mismatch' });
    }

    res.json({ message: 'User validated successfully', pass: true });
};
