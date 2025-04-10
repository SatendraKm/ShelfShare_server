const express = require("express");
const { userAuth } = require("../middlewares/auth");
const {
  profileDataValidation,
  passwordValidation,
} = require("../utils/validation");
const bcrypt = require("bcrypt");

const profileRouter = express.Router();

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    } else {
      return res.status(200).send(user);
    }
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});
profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    // validate the user data from the request
    if (!profileDataValidation(req)) {
      throw new Error("Invalid edit request");
    }
    const user = req.user;
    Object.keys(req.body).forEach((field) => {
      user[field] = req.body[field];
    });
    await user.save();
    res.status(200).send({
      message: `Profile data of ${
        user.firstName + " " + user.lastName
      } updated successfully`,
      user,
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});
profileRouter.patch("/profile/password", userAuth, async (req, res) => {
  try {
    // get the current and new password from the request
    const { currentPassword, newPassword } = req.body;

    // check if the current and new password are provided
    if (!currentPassword || !newPassword) {
      throw new Error("Current and New Password are required!");
    }

    // check if the current is same as new password
    if (currentPassword === newPassword) {
      throw new Error(
        "New password should be different from the current password"
      );
    }

    // get the user from the request
    const user = req.user;

    // validate the new password
    if (!passwordValidation(newPassword)) {
      throw new Error("Enter a strong password!");
    }

    // Encrypting the password
    const hashedPassword = await bcrypt.hash(newPassword, 8);
    user.password = hashedPassword;

    // save the new password
    await user.save();
    res.status(200).send({
      message: `Password of ${
        user.firstName + " " + user.lastName
      } has been updated successfully`,
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

module.exports = profileRouter;
