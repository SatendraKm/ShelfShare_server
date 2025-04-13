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

    // Create a new BookRequest
    const newRequest = new BookRequest({
      bookId,
      requesterId: req.user._id,
      ownerId: book.ownerId,
      type,
      status: "pending", // default status
    });

    // Save the new request
    await newRequest.save();

    // Push the new request ID to the book's requests array
    book.requests.push(newRequest._id);
    await book.save();

    // Populate the necessary fields for the response
    await newRequest.populate([
      { path: "bookId", select: "title author" },
      { path: "requesterId", select: "fullName emailId" },
      { path: "ownerId", select: "fullName emailId" },
    ]);

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
      .populate("bookId", "title author imageUrl")
      .populate("ownerId", "fullName emailId")
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
      .populate("bookId", "title author imageUrl")
      .populate("requesterId", "fullName emailId")
      .populate("ownerId", "fullName emailId")
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

    // Only the owner can accept the request
    if (requestDoc.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the owner can accept this request" });
    }

    // Only pending requests can be accepted
    if (requestDoc.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending requests can be accepted" });
    }

    // Accept the request
    requestDoc.status = "accepted";
    await requestDoc.save();

    // Reject all other pending requests for the same book
    await BookRequest.updateMany(
      {
        bookId: requestDoc.bookId,
        _id: { $ne: requestDoc._id },
        status: "pending",
      },
      { $set: { status: "rejected" } }
    );

    // Update the book
    const book = await Book.findById(requestDoc.bookId);
    if (book) {
      // Update status and borrower
      book.status = requestDoc.type === "rent" ? "rented" : "exchanged";
      book.borrowerId = requestDoc.requesterId;

      // Keep only the accepted request in the book.requests array
      // book.requests = [requestDoc._id];
      book.requests = [];

      await book.save();
    }

    res.status(200).json({
      message: "Request accepted successfully",
      data: requestDoc,
    });
  } catch (error) {
    console.error(error);
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

    // Update request status
    requestDoc.status = "cancelled";
    await requestDoc.save();

    // Remove request from Book's requests array
    await Book.findByIdAndUpdate(requestDoc.bookId, {
      $pull: { requests: requestDoc._id },
    });

    res
      .status(200)
      .json({ message: "Request cancelled successfully", data: requestDoc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

requestRouter.patch("/request/:id/status", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const requestDoc = await BookRequest.findById(id);
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (
      requestDoc.requesterId.toString() !== req.user._id &&
      requestDoc.ownerId.toString() !== req.user._id
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (requestDoc.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request has already been handled" });
    }

    requestDoc.status = status;
    await requestDoc.populate([
      { path: "bookId", select: "title author" },
      { path: "requesterId", select: "fullName emailId" },
      { path: "ownerId", select: "fullName emailId" },
    ]);
    await requestDoc.save();

    // ✅ Only when request is accepted
    if (status === "accepted") {
      // 🔁 Reject other pending requests
      await BookRequest.updateMany(
        {
          bookId: requestDoc.bookId,
          _id: { $ne: requestDoc._id },
          status: "pending",
        },
        { $set: { status: "rejected" } }
      );

      // 🔧 Update book details
      const book = await Book.findById(requestDoc.bookId);
      if (book) {
        if (requestDoc.type === "rent") {
          book.status = "rented";
          book.borrowerId = requestDoc.requesterId;
        } else if (requestDoc.type === "exchange") {
          book.status = "exchanged";
          book.borrowerId = requestDoc.requesterId;

          // ⏳ Optional future logic:
          // Ask the requester to provide their bookId for exchange
          // Then also mark that book as exchanged with ownerId as borrower
        }
        await book.save();
      }
    }

    res
      .status(200)
      .json({ message: "Request status updated", request: requestDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = requestRouter;
