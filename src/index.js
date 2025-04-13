require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ConnectDB } = require("./config/database");

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    // allowedHeaders: [
    //   "Content-Type",
    //   "Authorization",
    //   "X-Requested-With",
    //   "Accept",
    // ],
    // methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  })
);
const port = process.env.PORT || 5000;
const CookieParser = require("cookie-parser");

app.use(express.json());
app.use(CookieParser());

const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/requests");
const bookRouter = require("./routes/book");
// const userRouter = require("./routes/user");

app.use(authRouter);
app.use(profileRouter);
app.use(requestRouter);
app.use(bookRouter);
// app.use(userRouter);

ConnectDB()
  .then(() => {
    console.log("Database connected");
    app.listen(port, () => console.log(`Server listening on port ${port}!`));
  })
  .catch((err) => {
    console.log("Error connecting to database", err);
  });
