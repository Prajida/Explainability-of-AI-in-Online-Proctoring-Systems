import asyncHandler from "express-async-handler";
import Question from "../models/quesModel.js";
import Exam from "../models/examModel.js";
import Result from "../models/resultModel.js";
import ExamAttempt from "../models/examAttemptModel.js";

const getQuestionsByExamId = asyncHandler(async (req, res) => {
  let { examId } = req.params;
  console.log("Question Exam id (raw):", examId);
  
  // Decode URL-encoded examId
  try {
    examId = decodeURIComponent(examId);
    console.log("Question Exam id (decoded):", examId);
  } catch (e) {
    console.log("Question Exam id (decode failed, using raw):", examId);
  }

  if (!examId) {
    return res.status(400).json({ error: "examId is missing or invalid" });
  }

  // Trim examId to ensure no whitespace issues
  const trimmedExamId = examId.trim();
  console.log("Get questions - Looking for examId:", trimmedExamId);
  console.log("Get questions - examId type:", typeof trimmedExamId);
  console.log("Get questions - examId length:", trimmedExamId.length);

  // Enforce exam availability window
  const exam = await Exam.findOne({ examId: trimmedExamId });
  if (!exam) {
    return res.status(404).json({ error: "Exam not found" });
  }

  // Check if exam requires access code (if it does, code should be verified before reaching here)
  // This is handled in the frontend before accessing questions
  console.log("Get questions - Exam found:", "Yes");
  console.log("Get questions - Exam examId:", exam.examId);
  console.log("Get questions - Exam examId type:", typeof exam.examId);
  console.log("Get questions - Exam examId length:", exam.examId?.length);
  
  const now = new Date();
  const start = new Date(exam.liveDate);
  const end = new Date(exam.deadDate);
  if (Number.isFinite(start.getTime()) && now < start) {
    return res.status(403).json({ error: "Exam not started yet", startsAt: exam.liveDate });
  }
  if (Number.isFinite(end.getTime()) && now > end) {
    return res.status(403).json({ error: "Exam has ended", endedAt: exam.deadDate });
  }

  // Check if student has already completed this exam
  const existingAttempt = await ExamAttempt.findOne({
    examId: trimmedExamId,
    userId: req.user._id,
  });

  // If attempt exists and is completed, block access
  if (existingAttempt && existingAttempt.completedAt) {
    return res.status(403).json({ error: "You have already completed this exam" });
  }

  // If attempt doesn't exist, create it (first time starting)
  if (!existingAttempt) {
    await ExamAttempt.create({
      examId: trimmedExamId,
      userId: req.user._id,
      startedAt: new Date(),
    });
  }
  // If attempt exists but not completed, allow access (student can continue)
  
  // Query questions
  const questions = await Question.find({ examId: trimmedExamId });
  console.log("Get questions - Found questions count:", questions.length);
  
  // Debug: Get all unique examIds in questions collection
  const allExamIds = await Question.distinct("examId");
  console.log("Get questions - All examIds in database:", allExamIds);
  console.log("Get questions - Does trimmedExamId match any?", allExamIds.includes(trimmedExamId));
  
  if (questions.length > 0) {
    console.log("Get questions - Sample question examId:", questions[0]?.examId);
    console.log("Get questions - Sample question examId type:", typeof questions[0]?.examId);
  } else {
    console.log("Get questions - No questions found! Check if examId matches.");
    console.log("Get questions - Searched for examId:", trimmedExamId);
    console.log("Get questions - Available examIds in database:", allExamIds);
    
    // Check if there are any questions with similar examId (for debugging)
    const similarQuestions = await Question.find({
      examId: { $regex: trimmedExamId.substring(0, 8), $options: 'i' }
    }).limit(5);
    if (similarQuestions.length > 0) {
      console.log("Get questions - Found similar examIds:", similarQuestions.map(q => q.examId));
    }
  }

  res.status(200).json(questions);
});

const createQuestion = asyncHandler(async (req, res) => {
  const { question, options, examId } = req.body;

  if (!examId) {
    return res.status(400).json({ error: "examId is missing or invalid" });
  }

  const newQuestion = new Question({
    question,
    options,
    examId,
  });

  const createdQuestion = await newQuestion.save();

  if (createdQuestion) {
    res.status(201).json(createdQuestion);
  } else {
    res.status(400);
    throw new Error("Invalid Question Data");
  }
});

const createBulkQuestions = asyncHandler(async (req, res) => {
  const { questions, examId } = req.body;

  console.log("Bulk create - Received examId:", examId);
  console.log("Bulk create - Number of questions:", questions?.length);

  if (!examId) {
    return res.status(400).json({ error: "examId is missing or invalid" });
  }

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Questions array is required and must not be empty" });
  }

  // Trim examId to ensure no whitespace issues
  const trimmedExamId = examId.trim();

  const questionsToCreate = questions.map((q) => ({
    question: q.question,
    options: q.options,
    examId: trimmedExamId,
  }));

  console.log("Bulk create - First question examId:", questionsToCreate[0]?.examId);

  const createdQuestions = await Question.insertMany(questionsToCreate);

  console.log("Bulk create - Created questions count:", createdQuestions.length);
  console.log("Bulk create - First created question examId:", createdQuestions[0]?.examId);

  // Verify questions were created by querying them back
  const verifyQuestions = await Question.find({ examId: trimmedExamId });
  console.log("Bulk create - Verified questions count:", verifyQuestions.length);

  if (createdQuestions) {
    res.status(201).json({
      message: `${createdQuestions.length} questions created successfully`,
      questions: createdQuestions,
      verifiedCount: verifyQuestions.length,
    });
  } else {
    res.status(400);
    throw new Error("Failed to create questions");
  }
});

// Debug endpoint to get all questions grouped by examId
const getAllQuestionsByExam = asyncHandler(async (req, res) => {
  const questions = await Question.find({});
  const grouped = {};
  
  questions.forEach(q => {
    if (!grouped[q.examId]) {
      grouped[q.examId] = [];
    }
    grouped[q.examId].push({
      _id: q._id,
      question: q.question.substring(0, 50) + '...',
    });
  });
  
  const summary = Object.keys(grouped).map(examId => ({
    examId,
    count: grouped[examId].length,
  }));
  
  res.status(200).json({
    summary,
    details: grouped,
  });
});

export { getQuestionsByExamId, createQuestion, createBulkQuestions, getAllQuestionsByExam };
