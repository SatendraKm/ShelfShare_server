const express = require("express");
const { userAuth } = require("../middlewares/auth");
const Book = require("../models/book");
const upload = require("../middlewares/multer");

const bookRouter = express.Router();

bookRouter.post(
  "/book/new",
  userAuth,
  upload.single("bookImage"),
  async (req, res) => {
    try {
      const { title, author, genre, location, description } = req.body;

      // Validate required fields
      if (!title || !author || !genre || !location || !description) {
        return res.status(400).json({ message: "All fields are required." });
      }

      // Image upload handling (optional)
      const imageUrl = req.file ? req.file.path : null;

      // Create the book document
      const book = await Book.create({
        title,
        author,
        genre,
        location,
        description,
        imageUrl,
        ownerId: req.user._id,
      });

      res.status(201).json({ message: "Book added successfully", data: book });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

bookRouter.get("/book", async (req, res) => {
  try {
    // Extract query parameters
    const { title, author, genre, location, status, page, limit } = req.query;

    // Build filter query
    const filter = {};

    if (title) {
      filter.title = { $regex: title, $options: "i" }; // case-insensitive search
    }
    if (author) {
      filter.author = { $regex: author, $options: "i" };
    }
    if (genre) {
      filter.genre = { $regex: genre, $options: "i" };
    }
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }
    if (status) {
      filter.status = status;
    }

    // Set pagination defaults or use provided values
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const skipNumber = (pageNumber - 1) * limitNumber;

    // Count total documents matching the filter
    const totalBooks = await Book.countDocuments(filter);

    // Fetch books matching filter with pagination
    const books = await Book.find(filter)
      .skip(skipNumber)
      .limit(limitNumber)
      .sort({ createdAt: -1 }); // newest first

    res.status(200).json({
      message: "Books fetched successfully",
      total: totalBooks,
      page: pageNumber,
      limit: limitNumber,
      data: books,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

bookRouter.get("/book/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res
      .status(200)
      .json({ message: "Book retrieved successfully", data: book });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

bookRouter.put(
  "/book/:id",
  userAuth,
  upload.single("imageUrl"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body; // Text fields from FormData

      // Optional: If a new file is uploaded, set imageUrl to its path
      if (req.file) {
        updates.imageUrl = req.file.path;
      }

      // Find book
      const book = await Book.findById(id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      // Verify that the logged-in user is the owner
      if (book.ownerId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "Only the owner can update this book" });
      }

      // Allowed fields update (for example, title, description, etc.)
      const allowedUpdates = [
        "title",
        "author",
        "genre",
        "location",
        "description",
        "imageUrl",
      ];
      allowedUpdates.forEach((field) => {
        if (updates[field] !== undefined) {
          book[field] = updates[field];
        }
      });

      await book.save();
      res
        .status(200)
        .json({ message: "Book updated successfully", data: book });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

bookRouter.delete("/book/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the book by its ID
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Verify that the logged-in user is the owner of the book
    if (book.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the owner can delete this book" });
    }

    // Delete the book
    await book.deleteOne();

    res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

bookRouter.get("/my-books", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const books = await Book.find({ ownerId: userId }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Books fetched successfully",
      data: books,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

bookRouter.post("/book/:id/mark-returned", userAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Only the owner can mark the book as returned
    if (book.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the owner can mark the book as returned" });
    }

    // Ensure it’s currently rented
    if (book.status !== "rented") {
      return res
        .status(400)
        .json({ message: "Only rented books can be marked as returned" });
    }

    // Reset book status
    book.status = "available";
    book.borrowerId = null;
    await book.save();

    res.status(200).json({ message: "Book marked as returned", data: book });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = bookRouter;
