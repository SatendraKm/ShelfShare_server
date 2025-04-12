const mongoose = require("mongoose");
const validator = require("validator");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    genre: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
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
