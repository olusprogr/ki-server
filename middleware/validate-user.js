const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

    const token = jwt.sign(
        { username: user.username, id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Generated JWT Payload:', payload);
    console.log(token);

    res.json({ message: 'User validated successfully', token: token });
}