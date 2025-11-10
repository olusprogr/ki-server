const { MongoClient } = require('mongodb');

require('dotenv').config();

module.exports = async function insertUserToDB(username, hashedPassword) {

    const uri = process.env.DB_HOST;
    const client = new MongoClient(uri);

    try {
        await client.connect();

        const database = client.db("ai-server");
        const users = database.collection("users"); 

        const userExists = await users.findOne({ username: username });
        if (userExists) {
            console.log(`User "${username}" already exists`);
            throw new Error('User already exists');
        }

        const newUser = { username: username, password: hashedPassword };
        const result = await users.insertOne(newUser);
        console.log(`New user created with the following id: ${result.insertedId}`);
    } catch (error) {
        console.error('Error inserting user into database:', error);
        throw error;
    } finally {
        await client.close();
    }
}