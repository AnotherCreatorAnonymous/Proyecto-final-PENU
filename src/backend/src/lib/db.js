const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

async function getDb() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        return null; // Modo memoria para tests unitarios sin BD externa
    }
    if (cachedDb) {
        return cachedDb;
    }

    cachedClient = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
    });

    await cachedClient.connect();
    cachedDb = cachedClient.db(process.env.MONGODB_DB || 'pan_de_la_casa');
    return cachedDb;
}

module.exports = { getDb };