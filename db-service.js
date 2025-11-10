const { MongoClient } = require('mongodb');

module.exports = async function runGetStarted() {
  // Replace the uri string with your connection string
  const uri = process.env.DB_HOST;
  const client = new MongoClient(uri);

  try {
    const database = client.db("ai-server");
    const users = database.collection("users");

    // Queries for a movie that has a title value of 'Back to the Future'
    const query = { title: 'Back to the Future' };
    const movie = await movies.findOne(query);

    console.log(movie);
  } finally {
    await client.close();
  }
}
