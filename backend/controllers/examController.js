import asyncHandler from "express-async-handler";
import Exam from "./../models/examModel.js";

// @desc Get all exams
// @route GET /api/exams
// @access Private
const getExams = asyncHandler(async (req, res) => {
  // Don't send examCode in response for security, but send requiresCode flag
  // Populate teacherId only if it exists, handle old exams gracefully
  let exams;
  try {
    exams = await Exam.find().populate({
      path: "teacherId",
      select: "name email",
      strictPopulate: false, // Don't throw error if teacherId doesn't exist
    }).lean();
  } catch (populateError) {
    // If populate fails, try without populate (for old exams without teacherId)
    console.log("Populate failed, fetching without populate:", populateError.message);
    exams = await Exam.find().lean();
  }
  
  const examsWithFlag = exams.map(exam => {
    // Handle exams that might not have examCode or teacherId (old exams)
    const examObj = { ...exam };
    examObj.requiresCode = !!(examObj.examCode && examObj.examCode.trim() !== "");
    delete examObj.examCode; // Remove actual code for security
    return examObj;
  });
  
  res.status(200).json(examsWithFlag);
});

// @desc Create a new exam
// @route POST /api/exams
// @access Private (teacher only)
const createExam = asyncHandler(async (req, res) => {
  if (req.user.role !== "teacher") {
    res.status(403);
    throw new Error("Only teachers can create exams");
  }

  const { examName, totalQuestions, duration, liveDate, deadDate, examCode } = req.body;

  const exam = new Exam({
    examName,
    totalQuestions,
    duration,
    liveDate,
    deadDate,
    examCode: examCode || "", // Empty string = no code required (public)
    teacherId: req.user._id,
  });

  const createdExam = await exam.save();

  if (createdExam) {
    res.status(201).json(createdExam);
  } else {
    res.status(400);
    throw new Error("Invalid Exam Data");
  }
});

const DeleteExamById = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const exam = await Exam.findOne({ examId: examId });
  
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  // Only teacher who created the exam can delete it
  if (exam.teacherId && exam.teacherId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this exam");
  }

  await Exam.findOneAndDelete({ examId: examId });
  console.log("deleted exam", exam);
  res.status(200).json({ message: "Exam deleted successfully" });
});

// @desc Verify exam access code
// @route POST /api/exam/:examId/verify-code
// @access Private
const verifyExamCode = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { examCode } = req.body;

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  // If exam has no code, allow access
  if (!exam.examCode || exam.examCode === "") {
    res.status(200).json({ valid: true, message: "Access granted" });
    return;
  }

  // Verify code matches (case-sensitive)
  if (exam.examCode === examCode) {
    res.status(200).json({ valid: true, message: "Access granted" });
  } else {
    res.status(401).json({ valid: false, message: "Invalid exam code" });
  }
});

export { getExams, createExam, DeleteExamById, verifyExamCode };
