require('dotenv').config();

const bcrypt = require('bcrypt');

const insertUserToDB = require('./register-user-db');


module.exports = async function registerUser(req, res) {

    console.log('Register User Middleware Invoked');
    console.log('Request Body:', req.body);

    try {
        ({ username, password } = req.body);

    } catch (error) {
        console.error('Error in registerUser middleware:', error);
        return res.status(500).json({ error: 'Internal server error. 1' });
    }

    try {
        (hashedPassword = await bcrypt.hash(password, 10));
    } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).json({ error: 'Internal server error. 2' });
    }

    console.log(hashedPassword);

    // Continue with user registration logic

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

    insertUserToDB(username, hashedPassword)
        .then(() => {
            res.status(201).json({ message: 'User registered successfully' });
        })
        .catch((error) => {
            if (error.message === 'User already exists') {
                console.log(`Registration failed: user "${username}" already exists`);
                res.status(409).json({ error: 'User already exists' });
            } else {
                console.error('Error registering user:', error);
                res.status(500).json({ error: 'Internal server error. 3' });
            }
        });
}