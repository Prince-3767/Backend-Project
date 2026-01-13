import multer from "multer";
import path from "path";
const uploadPath = path.resolve("public/temp");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // cb(null, file.fieldname + "-" + uniqueSuffix);
    cb(null, file.originalname); // change this, cause it can be duplicate
  },
});

export const upload = multer({ storage });
