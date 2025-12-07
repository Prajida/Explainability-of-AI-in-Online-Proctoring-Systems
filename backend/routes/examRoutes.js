import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import {
  createExam,
  DeleteExamById,
  getExams,
  verifyExamCode,
} from "../controllers/examController.js";
import {
  createQuestion,
  getQuestionsByExamId,
  createBulkQuestions,
  getAllQuestionsByExam,
} from "../controllers/quesController.js";
import {
  uploadPDF,
  uploadAndParsePDF,
} from "../controllers/pdfController.js";
import {
  getCheatingLogsByExamId,
  saveCheatingLog,
  getDetailedCheatingLogs,
} from "../controllers/cheatingLogController.js";
const examRoutes = express.Router();

// protecting Exam route using auth middleware protect /api/users/
examRoutes.route("/exam").get(protect, getExams).post(protect, createExam);
examRoutes.route("/exam/:examId/verify-code").post(protect, verifyExamCode);
examRoutes.route("/exam/questions").post(protect, createQuestion);
examRoutes.route("/exam/questions/bulk").post(protect, createBulkQuestions);
examRoutes.route("/exam/questions/:examId").get(protect, getQuestionsByExamId);
examRoutes.route("/exam/questions-debug/all").get(protect, getAllQuestionsByExam);
// Debug endpoint to check questions without auth (for testing)
examRoutes.route("/exam/questions/debug/:examId").get(async (req, res) => {
  const Question = (await import("../models/quesModel.js")).default;
  const { examId } = req.params;
  const trimmedExamId = examId.trim();
  const questions = await Question.find({ examId: trimmedExamId });
  const allExamIds = await Question.distinct("examId");
  res.json({ 
    examId: trimmedExamId, 
    questionsFound: questions.length, 
    allExamIds,
    questions: questions.map(q => ({ _id: q._id, examId: q.examId, question: q.question.substring(0, 50) }))
  });
});
examRoutes.route("/exam/upload-pdf").post(protect, uploadPDF, uploadAndParsePDF);
examRoutes.route("/cheatingLogs/:examId").get(protect, getCheatingLogsByExamId);
examRoutes.route("/cheatingLogs/detailed/:examId").get(protect, getDetailedCheatingLogs);
examRoutes.route("/cheatingLogs/").post(protect, saveCheatingLog);
examRoutes.route("/exam/:examId").post(protect, DeleteExamById);

export default examRoutes;
