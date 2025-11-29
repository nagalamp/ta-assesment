import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Tesseract from 'tesseract.js';

const app = express();
const PORT = 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

function cleanAndStructureOCRText(text) {
  // Clean the text
  let cleanedText = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/[^\S\n]+/g, ' ') // Replace multiple spaces with single space
    .replace(/[•·]/g, '') // Remove bullet points
    .trim();

  // Split into lines and filter out empty lines
  const lines = cleanedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Extract key-value pairs
  const keyValuePairs = {};
  const tableRows = [];

  // Common patterns for key-value extraction
  const keyPatterns = [
    { key: 'class', regex: /class[:\s]*([^\n]+)/i },
    { key: 'term', regex: /term[:\s]*([^\n]+)/i },
    { key: 'week', regex: /week[:\s]*([^\n]+)/i },
    { key: 'teacher', regex: /teacher[:\s]*([^\n]+)/i },
    { key: 'subject', regex: /subject[:\s]*([^\n]+)/i },
    { key: 'date', regex: /date[:\s]*([^\n]+)/i },
    { key: 'time', regex: /time[:\s]*([^\n]+)/i }
  ];

  // Process each line for key-value pairs
  lines.forEach(line => {
    // Try to match key-value patterns
    for (const pattern of keyPatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        keyValuePairs[pattern.key] = match[1].trim();
        break;
      }
    }

    // Identify table rows (lines that look like structured data)
    // Common table patterns: multiple words separated by spaces, potential numbers, etc.
    if (isPotentialTableRow(line)) {
      tableRows.push(parseTableRow(line));
    }
  });

  // Fallback: if key-value extraction didn't work well, try line-by-line analysis
  if (Object.keys(keyValuePairs).length === 0) {
    extractKeyValuesFromLines(lines, keyValuePairs);
  }

  return {
    rawText: text,
    cleanedText: cleanedText,
    lines: lines,
    keyValuePairs: keyValuePairs,
    tableRows: tableRows,
    structuredData: {
      metadata: keyValuePairs,
      content: tableRows.length > 0 ? tableRows : lines
    }
  };
}

function isPotentialTableRow(line) {
  // A line is considered a potential table row if:
  // - Contains multiple "columns" (3 or more words/groups)
  // - Might contain numbers (times, dates, codes)
  // - Not obviously a header or label

  const words = line.split(/\s+/).filter(word => word.length > 0);

  // If it has 3 or more distinct elements, consider it a table row
  if (words.length >= 3) {
    // Exclude lines that are clearly headers or labels
    const lowerLine = line.toLowerCase();
    const excludePatterns = [
      /class|term|week|teacher|subject|date|time/i,
      /^\s*[a-z]+\s*$/i, // Single word lines
    ];

    return !excludePatterns.some(pattern => pattern.test(lowerLine));
  }

  return false;
}

function parseTableRow(line) {
  // Simple table row parsing - split by multiple spaces or tabs
  const columns = line.split(/\s{2,}|\t/).filter(col => col.trim().length > 0);

  return {
    raw: line,
    columns: columns,
    columnCount: columns.length
  };
}

function extractKeyValuesFromLines(lines, keyValuePairs) {
  // Simple heuristic extraction from lines
  const commonKeys = ['class', 'term', 'week', 'teacher', 'subject'];

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();

    for (const key of commonKeys) {
      if (lowerLine.includes(key) && index + 1 < lines.length) {
        // Check if the value might be in the next line
        const nextLine = lines[index + 1];
        if (!commonKeys.some(k => nextLine.toLowerCase().includes(k))) {
          keyValuePairs[key] = nextLine.trim();
        } else {
          // Value might be in the same line after the key
          const match = line.match(new RegExp(`${key}[\\s:]*([^\\n]+)`, 'i'));
          if (match) {
            keyValuePairs[key] = match[1].trim();
          }
        }
      }
    }
  });
}

async function extractTextFromImage(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error('Image file not found');
    }

    const result = await Tesseract.recognize(
      imagePath,
      'eng',
      {
        logger: m => { } // disable logs or you can log if needed
      }
    );

    // Process and structure the OCR text
    const structuredData = cleanAndStructureOCRText(result.data.text);

    // Return complete OCR data with structured information
    return {
      text: result.data.text,          // full extracted text
      structured: structuredData       // cleaned and structured data
    };

  } catch (error) {
    console.error('OCR processing failed:', error);
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

app.post('/file-upload', upload.single('file'), async (req, res) => {
  let fileCleanup = false;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('File received:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    if (!fs.existsSync(req.file.path)) {
      throw new Error('File was not saved correctly');
    }

    const fileStats = fs.statSync(req.file.path);
    if (fileStats.size === 0) {
      throw new Error('Uploaded file is empty');
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    let extractedData = null;

    if (req.file.mimetype.startsWith('image/')) {
      console.log('Processing image file with OCR...');
      extractedData = await extractTextFromImage(req.file.path);
      fileCleanup = true;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Only image files are supported for text extraction'
      });
    }

    console.log('File processed successfully');

    if (fileCleanup && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('Temporary file cleaned up');
    }

    const response = {
      success: true,
      message: 'File uploaded and processed successfully',
      file: fileInfo,
      extractedData: extractedData.text,           // Raw OCR text
      structuredData: extractedData.structured    // Cleaned and structured data
    };

    res.json(response);

  } catch (error) {
    console.error('Upload/processing error:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('Temporary file cleaned up after error');
    }

    res.status(500).json({
      success: false,
      message: 'File processing failed',
      error: error.message
    });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files'
      });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Upload endpoint: http://localhost:${PORT}/file-upload`);
  console.log('Tesseract.js OCR is ready for text extraction with structured output');
});