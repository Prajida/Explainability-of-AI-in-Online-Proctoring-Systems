import asyncHandler from "express-async-handler";
import multer from "multer";
import { parsePDFQuestions } from "../utils/pdfParser.js";

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Middleware for single file upload
export const uploadPDF = upload.single("pdf");

// Controller to handle PDF upload and parsing
export const uploadAndParsePDF = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  const { examId } = req.body;

  if (!examId) {
    return res.status(400).json({ error: "examId is required" });
  }

  try {
    const pdfBuffer = req.file.buffer;
    const parsedQuestions = await parsePDFQuestions(pdfBuffer);

    if (parsedQuestions.length === 0) {
      return res.status(400).json({
        error: "No questions found in PDF. Please ensure the PDF follows the expected format.",
        format: "Q1. Question text?\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4\nAnswer: A",
      });
    }

    res.status(200).json({
      message: `Successfully parsed ${parsedQuestions.length} questions from PDF`,
      questions: parsedQuestions,
      examId,
    });
  } catch (error) {
    res.status(400).json({
      error: "Failed to parse PDF",
      message: error.message,
    });
  }
});

