const { MongoClient } = require('mongodb');

module.exports = async function runGetStarted() {
  // Replace the uri string with your connection string
  const uri = process.env.DB_HOST;
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const database = client.db("ai-server");
    const users = database.collection("users");

    const testUser = { username: "test", password: "test" };
    await users.insertOne(testUser);
    console.log("User inserted");

    const found = await users.findOne({ username: "test" });
    console.log("User found:", found);

    const result = await users.deleteOne({ username: "test" });
    console.log(`Deleted ${result.deletedCount} user(s)`);

  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
