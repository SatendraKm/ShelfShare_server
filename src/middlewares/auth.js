const jwt = require("jsonwebtoken");
const User = require("../models/user");
const userAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return res.status(400).send({ message: "Token not found!" });
    }
    const decoded = await jwt.verify(token, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};
module.exports = { userAuth };
