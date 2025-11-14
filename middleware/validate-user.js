const bcrypt = require('bcrypt');

module.exports = async function validateUser(req, res) {
    console.log('Validate User Middleware Invoked');

    const db = req.app.locals.dbService;

    if (!db) {
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const users = db.collection("users");

    const { username, password } = req.body;

    const user = await users.findOne({ username: username });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const storedHashedPassword = user.password;

    const isMatch = await bcrypt.compare(password, storedHashedPassword);

    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(200).json({ message: 'User validated successfully' });
}