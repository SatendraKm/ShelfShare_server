const mongoose = require("mongoose");

const ConnectDB = async () => {
  await mongoose.connect("mongodb://localhost:27017/Dev-Tinder");
};
module.exports = {
  ConnectDB,
};
