const express = require("express");
const { userAuth } = require("../middlewares/auth");
const {
  profileDataValidation,
  passwordValidation,
} = require("../utils/validation");
const bcrypt = require("bcrypt");
const Book = require("../models/book");

const profileRouter = express.Router();

// ✅ GET Profile Data
profileRouter.get("/profile", userAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.status(200).send({ data: user });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// ✅ PATCH Profile Data (except password)
profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    // Validate the user data from the request
    if (!profileDataValidation(req)) {
      throw new Error("Invalid profile update request");
    }

    const user = req.user;
    const allowedFields = ["fullName", "phoneNumber", "photoUrl"];
    const updates = Object.keys(req.body);

    // Check for invalid fields
    const isValidOperation = updates.every((update) =>
      allowedFields.includes(update)
    );
    if (!isValidOperation) {
      throw new Error("Invalid fields in update request");
    }

    // Update the user fields
    updates.forEach((field) => {
      user[field] = req.body[field];
    });

    await user.save();

    res.status(200).send({
      message: `Profile of ${user.fullName} updated successfully`,
      data: user,
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// ✅ PATCH Password Update
profileRouter.patch("/profile/password", userAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new Error("Current and New Password are required!");
    }

    if (currentPassword === newPassword) {
      throw new Error(
        "New password should be different from the current password"
      );
    }

    const user = req.user;

    // Check if current password is valid
    const isMatch = await user.validatePassword(currentPassword);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }

    // Validate the new password
    if (!passwordValidation(newPassword)) {
      throw new Error("Enter a strong password!");
    }

    // Encrypt and update the new password
    user.password = await bcrypt.hash(newPassword, 8);
    await user.save();

    res.status(200).send({
      message: `Password for ${user.fullName} has been updated successfully`,
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

profileRouter.get("/user/stats", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role; // Check user's role

    let stats = {};

    if (role === "seeker") {
      // Seeker: count borrowed and exchanged books
      stats = {
        borrowedCount: await Book.countDocuments({
          requester: userId,
          status: "approved",
        }),
        exchangedCount: await Book.countDocuments({
          requester: userId,
          status: "exchanged",
        }),
      };
    } else if (role === "owner") {
      // Owner: count owned and exchanged books
      stats = {
        ownedCount: await Book.countDocuments({
          owner: userId,
          status: { $ne: "exchanged" }, // Exclude exchanged books from owned
        }),
        exchangedCount: await Book.countDocuments({
          owner: userId,
          status: "exchanged",
        }),
      };
    }

    res.status(200).send(stats); // Send the stats based on role
  } catch (error) {
    res
      .status(500)
      .send({ message: "Failed to fetch stats", error: error.message });
  }
});

module.exports = profileRouter;
