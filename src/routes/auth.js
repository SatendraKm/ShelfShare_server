const express = require("express");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const authRouter = express.Router();
const {
  signUpDataValidation,
  loginDataValidation,
} = require("../utils/validation");

authRouter.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, emailId, password } = req.body;
    // validating the signup data
    signUpDataValidation(req);
    // check if user already exists
    const existingUser = await User.findOne({ emailId });
    if (existingUser) {
      // return res
      //   .status(400)
      //   .send({ message: "User with this email already exists" });
      throw new Error("User with this email already exists");
    }

    // Encrypting the password
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: hashedPassword,
    });
    await user.save();
    // removing password from the response
    const { password: pwd, ...userData } = user.toObject();
    res.json({ message: "User Created successfully", userData });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});
authRouter.post("/login", async (req, res) => {
  const { emailId, password } = req.body;
  try {
    // check if email and password are provided
    if (!emailId || !password) {
      return res
        .status(400)
        .send({ message: "Email and Password are required!" });
    }
    // check if email is valid
    loginDataValidation(req);
    // check if user exists
    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      return res.status(404).send({ message: "User not found!" });
    }
    // check if password is correct
    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      return res.status(400).send({ message: "Invalid Password!" });
    }
    // removing password from the response
    const { password: pwd, ...userData } = user.toObject();

    // creating JWT token
    const token = await user.getJWT();
    res.cookie("token", token, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      secure: false, // set to true if your using https
      httpOnly: true,
    });
    res.send({ message: "User Logged In successfully", userData });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});
authRouter.post("/logout", async (req, res) => {
  res.clearCookie("token");
  res.send({ message: "User Logged Out successfully" });
});

module.exports = authRouter;
