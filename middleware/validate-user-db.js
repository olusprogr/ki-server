module.exports = async function validateUserFromDB(db, username, password) {

    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const users = db.collection("users");

        const userExists = await users.findOne({ username: username });
        if (userExists) {
            console.log(`User "${username}" already exists`);
            throw new Error('User already exists');
        }

        const newUser = { username: username, password: hashedPassword };
        const result = await users.insertOne(newUser);
        console.log(`New user created with id: ${result.insertedId}`);
        
    } catch (error) {
        console.error('Error inserting user into database:', error);
        throw error;
    }
}