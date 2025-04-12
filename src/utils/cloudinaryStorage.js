const { cloudinary } = require("./cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ShelfShare",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

module.exports = storage;
