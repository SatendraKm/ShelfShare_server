const express = require("express");
const { userAuth } = require("../middlewares/auth");
const Users = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");
const userRouter = express.Router();

// get all the pending requests for the loggedin user
userRouter.get("/user/requests/recieved", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", [
      "firstName",
      "lastName",
      "photoUrl",
      "age",
      "gender",
      "about",
      "skills",
    ]);

    res.json({
      message: "Recieved requests",
      connectionRequests,
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id, status: "accepted" },
        { toUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", [
        "firstName",
        "lastName",
        "photoUrl",
        "age",
        "gender",
        "about",
        "skills",
      ])
      .populate("toUserId", [
        "firstName",
        "lastName",
        "photoUrl",
        "age",
        "gender",
        "about",
        "skills",
      ]);

    const data = connectionRequests.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }
      return row.fromUserId;
    });

    res.json({
      message: "Connections",
      data,
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    if (limit > 50) {
      limit = 50;
    }
    const skip = (page - 1) * limit;
    // fetching all the connections of the loggedin user
    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select(["fromUserId", "toUserId"]);
    // creating a set of user ids to hide them from the feed
    const hiddenUserIds = new Set();
    connectionRequests.forEach((req) => {
      hiddenUserIds.add(req.toUserId.toString());
      hiddenUserIds.add(req.fromUserId.toString());
    });
    // fetching all the users except the loggedin user and the connections of the loggedin user
    const users = await Users.find({
      $and: [
        { _id: { $nin: Array.from(hiddenUserIds) } },
        { _id: { $ne: loggedInUser._id } },
      ],
    })
      .select([
        "firstName",
        "lastName",
        "photoUrl",
        "about",
        "skills",
        "age",
        "gender",
      ])
      .limit(limit)
      .skip(skip);
    // sending the response
    res.json({ message: "Feed", users });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

module.exports = userRouter;
