import mongoose from "mongoose";

const examAttemptSchema = mongoose.Schema(
  {
    examId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

examAttemptSchema.index({ examId: 1, userId: 1 }, { unique: true });

const ExamAttempt = mongoose.model("ExamAttempt", examAttemptSchema);
export default ExamAttempt; 