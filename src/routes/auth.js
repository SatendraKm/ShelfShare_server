const express = require("express");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const authRouter = express.Router();
const upload = require("../middlewares/multer");
const {
  signUpDataValidation,
  loginDataValidation,
} = require("../utils/validation");

authRouter.post("/signup", (req, res) => {
  upload.single("profileImage")(req, res, async (err) => {
    try {
      if (err) {
        throw new Error("Error uploading image");
      }

      const { fullName, phoneNumber, emailId, password, role } = req.body;

      signUpDataValidation(req);

      const existingUser = await User.findOne({ emailId });
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const hashedPassword = await bcrypt.hash(password, 8);

      const userData = {
        fullName,
        phoneNumber,
        role,
        emailId,
        password: hashedPassword,
      };

      if (req.file && req.file.path) {
        userData.photoUrl = req.file.path;
      }

      const user = new User(userData);

      await user.save();

      const { password: pwd, ...userDataWithoutPassword } = user.toObject();

      const token = await user.getJWT();
      res.cookie("token", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      });

      res.json({
        message: "User Created successfully",
        data: userDataWithoutPassword,
      });
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  });
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
      secure: process.env.NODE_ENV === "production", // true on Render/Vercel
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // for cross-origin cookies (Vercel <-> Render)
    });
    res.send({ message: "User Logged In successfully", data: userData });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});
authRouter.post("/logout", async (req, res) => {
  res.clearCookie("token");
  res.send({ message: "User Logged Out successfully" });
});

module.exports = authRouter;
