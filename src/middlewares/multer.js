const multer = require("multer");
const storage = require("../utils/cloudinaryStorage"); // your multer-storage-cloudinary file

const upload = multer({ storage });
module.exports = upload;
