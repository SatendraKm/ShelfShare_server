const mongoose = require("mongoose");

const ConnectDB = async () => {
  const MongoUri = process.env.MONGODB_URI;
  if (!MongoUri) {
    console.error("❌ MONGODB_URI not found in env");
    process.exit(1);
  }
  await mongoose.connect(MongoUri);
};

module.exports = {
  ConnectDB,
};
