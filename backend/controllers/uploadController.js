import fs from 'fs';
import { extractTextFromImage } from '../services/ocrService.js';

export const uploadFile = async (req, res) => {
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

console.log(extractedData)

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
      structuredData: extractedData
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
};

export default {
  uploadFile
};