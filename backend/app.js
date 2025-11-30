import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/uploadRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/', uploadRoutes);

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Upload endpoint: http://localhost:${PORT}/file-upload`);
  console.log('Tesseract.js OCR is ready for text extraction with structured output');
});

export default app;