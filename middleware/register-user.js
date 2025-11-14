// middleware/register-user.js
const bcrypt = require('bcrypt');
const insertUserToDB = require('./register-user-db');

async function registerUser(req, res) {
    console.log('Register User Middleware Invoked');
    console.log('Request Body:', req.body);

    const { username, password } = req.body;

    // Validierungen
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (password.toLowerCase().includes(username.toLowerCase())) {
        return res.status(400).json({ error: 'Password cannot contain the username' });
    }

    if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }

    if (!/[a-z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }

    if (!/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one digit' });
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        const db = req.app.locals.dbService;
        await insertUserToDB(db, username, hashedPassword);
        res.status(201).json({ message: 'User registered successfully' })

    } catch (error) {
        if (error.message === 'User already exists') {
            console.log(`Registration failed: user "${username}" already exists`);
            return res.status(409).json({ error: 'User already exists' });
        }
        
        console.error('Error registering user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = registerUser;