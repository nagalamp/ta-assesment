import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

app.post("/file-upload", upload.single("file"), (req, res) => {
  console.log(req.file);
  res.json({
    message: "File uploaded successfully!",
    filename: req.file.originalname,
    storedAs: req.file.filename
  });
});

app.listen(5001, () => {
  console.log("Server running at http://localhost:5001");
});
