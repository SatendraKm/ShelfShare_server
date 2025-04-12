const express = require("express");
const { userAuth } = require("../middlewares/auth");
const BookRequest = require("../models/bookRequest");
const Book = require("../models/book"); // To check book details for request creation

const requestRouter = express.Router();

/**
 * POST /api/requests
 * Create a new book request
 */
requestRouter.post("/request", userAuth, async (req, res) => {
  try {
    const { bookId, type } = req.body;
    if (!bookId || !type) {
      return res.status(400).json({ message: "bookId and type are required." });
    }

    // Validate request type if needed (should be "rent" or "exchange")
    if (!["rent", "exchange"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Type must be either 'rent' or 'exchange'." });
    }

    // Verify the book exists
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Prevent a user from requesting their own book
    if (book.ownerId.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot request your own book." });
    }

    // Check if there is already a pending request for the same book by the user
    const existingRequest = await BookRequest.findOne({
      bookId,
      requesterId: req.user._id,
      status: "pending",
    });
    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "You already have a pending request for this book." });
    }

    const newRequest = new BookRequest({
      bookId,
      requesterId: req.user._id,
      ownerId: book.ownerId,
      type,
      status: "pending", // default status
    });

    await newRequest.save();
    res
      .status(201)
      .json({ message: "Request created successfully", data: newRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/requests/sent
 * Get all requests sent by the logged-in user
 */
requestRouter.get("/request/sent", userAuth, async (req, res) => {
  try {
    const requests = await BookRequest.find({ requesterId: req.user._id })
      .populate("bookId", "title author")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ message: "Sent requests fetched successfully", data: requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/requests/received
 * Get all requests received by the logged-in user (i.e. for books they own)
 */
requestRouter.get("/request/received", userAuth, async (req, res) => {
  try {
    const requests = await BookRequest.find({ ownerId: req.user._id })
      .populate("bookId", "title author")
      .sort({ createdAt: -1 });
    res.status(200).json({
      message: "Received requests fetched successfully",
      data: requests,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/requests/:id
 * Get details of a specific request.
 * Only allow if the logged-in user is involved (requester or owner)
 */
requestRouter.get("/request/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const requestDoc = await BookRequest.findById(id)
      .populate("bookId", "title author")
      .populate("requesterId", "fullName emailId")
      .populate("ownerId", "fullName emailId");
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }
    // Only allow access if the logged-in user is the requester or the owner
    if (
      requestDoc.requesterId._id.toString() !== req.user._id.toString() &&
      requestDoc.ownerId._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this request" });
    }
    res.status(200).json({
      message: "Request details fetched successfully",
      data: requestDoc,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/requests/:id/accept
 * Accept a request. Only the owner of the book can perform this action.
 */
requestRouter.put("/request/:id/accept", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const requestDoc = await BookRequest.findById(id);
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }
    // Validate that the logged-in user is the owner
    if (requestDoc.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the owner can accept this request" });
    }
    // Accept only if the request is pending
    if (requestDoc.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending requests can be accepted" });
    }
    requestDoc.status = "accepted";
    await requestDoc.save();

    // Optionally update the book as well (set borrower and update status)
    const book = await Book.findById(requestDoc.bookId);
    if (book) {
      book.status = "rented"; // or "exchanged" based on requestDoc.type
      book.borrowerId = requestDoc.requesterId;
      await book.save();
    }

    res
      .status(200)
      .json({ message: "Request accepted successfully", data: requestDoc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/requests/:id/reject
 * Reject a request. Only the owner can perform this action.
 */
requestRouter.put("/request/:id/reject", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const requestDoc = await BookRequest.findById(id);
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }
    // Validate that the logged-in user is the owner
    if (requestDoc.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the owner can reject this request" });
    }
    // Can only reject pending requests
    if (requestDoc.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending requests can be rejected" });
    }
    requestDoc.status = "rejected";
    await requestDoc.save();
    res
      .status(200)
      .json({ message: "Request rejected successfully", data: requestDoc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/requests/:id/cancel
 * Cancel a request. Only the requester can cancel their own request.
 */
requestRouter.put("/request/:id/cancel", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const requestDoc = await BookRequest.findById(id);
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }
    // Validate that the logged-in user is the requester
    if (requestDoc.requesterId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the requester can cancel this request" });
    }
    // Allow cancellation only if it's still pending
    if (requestDoc.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending requests can be cancelled" });
    }
    requestDoc.status = "cancelled";
    await requestDoc.save();
    res
      .status(200)
      .json({ message: "Request cancelled successfully", data: requestDoc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

requestRouter.get("/requests/:id", async (req, res) => {
  const { id } = req.params;

  // Validate ID first
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid request ID" });
  }

  try {
    const request = await BookRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json({ message: "Request fetched", data: request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = requestRouter;
