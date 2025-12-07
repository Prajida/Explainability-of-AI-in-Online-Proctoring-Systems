import mongoose from "mongoose";

const questionSchema = mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    options: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        optionText: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
      },
    ],
    ansmarks: {
      type: Number,
      required: false,
      default: 0,
    },
    examId: {
      type: String, // Use the same data type (String) as in the exam model
      required: true,
      // You can make examId required if it's always present
    },
  },
  {
    timestamps: true,
  }
);

// Add index on examId for faster queries
questionSchema.index({ examId: 1 });

const Question = mongoose.model("Question", questionSchema);
//83309
export default Question;
