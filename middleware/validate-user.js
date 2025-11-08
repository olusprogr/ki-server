const bcrypt = require('bcrypt');

module.exports = async function validateUser(req, res, next) {
    console.log('Validate User Middleware Invoked');

    const storedHashedPassword = "$2b$10$XTZeqKRiiPt9PB.gh44caOnPXvkcaOg828K7/krsa3Jxl3UaKK1mu"; // Example hashed password

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const isMatch = await bcrypt.compare(password, storedHashedPassword);

    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(200).json({ message: 'User validated successfully' });

}