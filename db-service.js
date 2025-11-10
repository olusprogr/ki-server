const { MongoClient } = require('mongodb');

module.exports = async function runGetStarted() {
  // Replace the uri string with your connection string
  const uri = process.env.DB_HOST;
  
  console.log('Connecting to database at', uri);


  const client = new MongoClient(uri);


  try {

    console.log('Connecting to MongoDB...');

    await client.connect();

    const database = client.db("ai-server");
    const users = database.collection("users");

    console.log("Running unit test operations...");

    const testUser = { username: "test", password: "test" };
    await users.insertOne(testUser);
    console.log("User inserted");

    const found = await users.findOne({ username: "test" });
    console.log("User found:", found.username);

    const result = await users.deleteOne({ username: "test" });
    console.log(`Deleted ${result.deletedCount} user(s)`);

    console.log("Unit test operations completed successfully.");

  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    console.log("Closing database connection...");
    console.log("Continuing with application initialization...");
  }
}
