const { MongoClient } = require('mongodb');
require('dotenv').config();

class DatabaseService {
  constructor() {
    this.mongoClient = null;
    this.db = null;
    this.uriLocal = process.env.LOCAL_DB_HOST;
    this.uriRemote = process.env.DB_HOST;
    this.uri = null;
  }

  setDatabase(local) {
    this.uri = local ? this.uriLocal : this.uriRemote;
    if (!this.uri) throw new Error('No database URI defined');
    this.mongoClient = new MongoClient(this.uri);
  }

  getDatabase() {
    return this.db;
  }

  async connect() {
    if (!this.mongoClient) {
      throw new Error('MongoClient not initialized. Call setDatabase() first.');
    }

    try {
      await this.mongoClient.connect();
      this.db = this.mongoClient.db("ai-server");
      console.log('Connected to database successfully');
      return this.db;
    } catch (error) {
      console.error('Error connecting to database:', error);
      throw error;
    }
  }

  async close() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      console.log("Database connection closed.");
    }
  }

  async runDatabaseTest() {
    if (!this.db) throw new Error('Database not initialized. Call connect() first.');

    const users = this.db.collection("users");
    console.log("Running test operations...");

    const testUser = { username: "test", password: "test" };
    await users.insertOne(testUser);
    console.log("User inserted");

    const found = await users.findOne({ username: "test" });
    console.log("User found:", found.username);

    const result = await users.deleteOne({ username: "test" });
    console.log(`Deleted ${result.deletedCount} user(s)`);

    console.log("Database test completed successfully.");
  }
}

module.exports = DatabaseService;