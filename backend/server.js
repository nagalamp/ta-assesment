import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs";
import { fileTypeFromFile } from "file-type";
import { fromPath } from "pdf2pic";

const app = express();
app.use(cors());

// Upload temp folder
const upload = multer({ dest: "uploads/" });

/* SAFE DELETE TEMP */
function safeDelete(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/* OCR IMAGE */
async function parseImageOCR(imagePath) {
  const result = await Tesseract.recognize(imagePath, "eng", {
    tessedit_char_whitelist:
      "0123456789:-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz() ",
  });
  return result.data.text;
}

/* VALIDATE IMAGE */
async function isImage(filePath) {
  const type = await fileTypeFromFile(filePath);
  return type && ["image/png", "image/jpg", "image/jpeg"].includes(type.mime);
}

/* PDF -> IMAGE */
async function convertPDF(filePath) {
  const outputDir = "./uploads/pdf-images";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const converter = fromPath(filePath, {
    density: 200,
    savePath: outputDir,
    format: "png",
    width: 1400,
    height: 2000,
  });

  const result = await converter(1);
  return result.path;
}

/* PDF OCR */
async function parsePDF(filePath) {
  const imgPath = await convertPDF(filePath);
  const text = await parseImageOCR(imgPath);
  safeDelete(imgPath);
  return text;
}

/* ---------------------------------------------------------
   CLEAN + STRUCTURE TIMETABLE TEXT
--------------------------------------------------------- */
function formatTimetable(ocrRaw) {
  const lines = ocrRaw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const timetable = {
    monday_tuesday_thursday: [],
    wednesday: [],
    friday: [],
  };

  let currentDay = null;

  for (const line of lines) {
    // Detect headers
    if (line.includes("Monday") || line.includes("Tuesday")) {
      currentDay = "monday_tuesday_thursday";
      continue;
    }
    if (line.includes("Wednesday")) {
      currentDay = "wednesday";
      continue;
    }
    if (line.includes("Friday")) {
      currentDay = "friday";
      continue;
    }

    // Detect time + activity rows (e.g., "9:00–9:15 Morning Work")
    const rowMatch = line.match(
      /^(\d{1,2}[:.]\d{2}(?:\s*[-–]\s*\d{1,2}[:.]\d{2})?)\s+(.*)$/
    );

    if (rowMatch && currentDay) {
      timetable[currentDay].push({
        time: rowMatch[1],
        activity: rowMatch[2],
      });
    }
  }

  return timetable;
}

/* ---------------------------------------------------------
   UPLOAD ROUTE
--------------------------------------------------------- */
app.post("/file-upload", upload.single("file"), async (req, res) => {
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const ext = file.originalname.split(".").pop().toLowerCase();
    let ocrText = "";

    if (["jpg", "jpeg", "png"].includes(ext)) {
      if (!(await isImage(file.path))) {
        safeDelete(file.path);
        return res.status(400).json({ error: "Invalid image type" });
      }
      ocrText = await parseImageOCR(file.path);
    } else if (ext === "pdf") {
      ocrText = await parsePDF(file.path);
    } else {
      safeDelete(file.path);
      return res.status(400).json({ error: "Only PDF/JPG/PNG supported" });
    }

    if (!ocrText || ocrText.trim().length === 0) {
      safeDelete(file.path);
      return res.status(400).json({ error: "OCR failed or no text found" });
    }

    // STRUCTURE THE DATA
    const formatted = formatTimetable(ocrText);

    safeDelete(file.path);

    return res.json({
      message: "OCR success",
      text_raw: ocrText,
      timetable: formatted,
    });
  } catch (err) {
    console.error("OCR error:", err);

    if (file?.path) safeDelete(file.path);

    return res.status(500).json({ error: "OCR failed", details: err.message });
  }
});

app.listen(5001, () =>
  console.log("🚀 Server running at http://localhost:5001")
);
