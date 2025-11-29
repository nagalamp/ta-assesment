import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs";
import { fileTypeFromFile } from "file-type";

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

function safeDelete(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

async function extractTextFromImage(imagePath) {
  const result = await Tesseract.recognize(imagePath, "eng");
  return result.data.text;
}

async function isImage(filePath) {
  const type = await fileTypeFromFile(filePath);
  return type && ["image/png", "image/jpg", "image/jpeg"].includes(type.mime);
}

app.post("/file-upload", upload.single("file"), async (req, res) => {
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const ext = file.originalname.split(".").pop().toLowerCase();
    
    if (!["jpg", "jpeg", "png"].includes(ext)) {
      safeDelete(file.path);
      return res.status(400).json({ error: "Only JPG/PNG images supported" });
    }

    if (!(await isImage(file.path))) {
      safeDelete(file.path);
      return res.status(400).json({ error: "Invalid image type" });
    }

    const extractedText = await extractTextFromImage(file.path);
    safeDelete(file.path);

    return res.json({
      success: true,
      extracted_text: extractedText
    });

  } catch (err) {
    console.error("Extraction error:", err);
    if (file?.path) safeDelete(file.path);
    return res.status(500).json({ 
      error: "Text extraction failed", 
      details: err.message 
    });
  }
});

app.listen(5001, () =>
  console.log("Server running at http://localhost:5001")
);