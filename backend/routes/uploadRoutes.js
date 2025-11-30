import express from 'express';
import { upload } from '../config/multer.js';
import { uploadFile } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/file-upload', upload.single('file'), uploadFile);

export default router;