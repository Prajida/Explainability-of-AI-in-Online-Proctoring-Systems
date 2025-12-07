import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const examSchema = mongoose.Schema(
  {
    examName: {
      type: String,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    liveDate: {
      type: Date,
      required: true,
    },
    deadDate: {
      type: Date,
      required: true,
    },
    // Define examId field with UUID generation
    examId: {
      type: String,
      default: uuidv4, // Generate a new UUID for each document
      unique: true, // Ensure uniqueness of UUIDs
    },
    // Exam access code/password (optional - if empty, exam is public)
    examCode: {
      type: String,
      default: "", // Empty string means no code required (public exam)
    },
    // Teacher who created the exam
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Exam = mongoose.model("Exam", examSchema);

export default Exam;
