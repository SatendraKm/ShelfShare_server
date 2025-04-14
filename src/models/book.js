const mongoose = require("mongoose");
const validator = require("validator");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    genres: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one genre is required.",
      },
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      validate: {
        validator: (v) => !v || validator.isURL(v),
        message: "Invalid image URL",
      },
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["available", "rented", "exchanged"],
      default: "available",
    },
    borrowerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    requests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BookRequest",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
