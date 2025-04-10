const express = require("express");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");
const { userAuth } = require("../middlewares/auth");
const requestRouter = express.Router();

requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const { status, toUserId } = req.params; // Correct destructuring of params
      // console.log(fromUserId, status, toUserId);

      const allowedStatus = ["ignored", "interested"];
      if (!allowedStatus.includes(status)) {
        throw new Error(`Invalid request status: ${status}`);
      }

      const toUser = await User.findOne({ _id: toUserId });
      if (!toUser) {
        throw new Error("User not found");
      }

      const existingRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId: fromUserId, toUserId: toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });
      if (existingRequest) {
        throw new Error("Request already exists");
      }

      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });

      const connectionData = await connectionRequest.save();
      if (status === "interested") {
        res.json({
          message: `${req.user.firstName} is interested in ${toUser.firstName}`,
          connectionData,
        });
      } else {
        res.json({
          message: `${req.user.firstName} wants to ignore ${toUser.firstName}`,
          connectionData,
        });
      }
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      loggedInUser = req.user;
      const { status, requestId } = req.params;
      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status)) {
        throw new Error(`Invalid request status: ${status}`);
      }

      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });
      if (!connectionRequest) {
        throw new Error("Request not found");
      }

      connectionRequest.status = status;
      const connectionReviewData = await connectionRequest.save();
      res.json({ message: "Request accepted", connectionReviewData });
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

module.exports = requestRouter;
