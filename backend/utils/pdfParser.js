import pdfParse from "pdf-parse";

// Parse PDF and extract questions
export const parsePDFQuestions = async (pdfBuffer) => {
  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text;
    
    // Parse questions from PDF text
    // Expected format: 
    // Q1. Question text?
    // A) Option 1
    // B) Option 2
    // C) Option 3
    // D) Option 4
    // Answer: A (or correct answer marked)
    
    const questions = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentQuestion = null;
    let currentOptions = [];
    let currentCorrectAnswer = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect question (Q1, Q2, 1., etc.)
      const questionMatch = line.match(/^(Q\d+|Question\s*\d+|^\d+[\.\)])\s*(.+)$/i);
      if (questionMatch) {
        // Save previous question if exists
        if (currentQuestion && currentOptions.length >= 2) {
          questions.push({
            question: currentQuestion,
            options: currentOptions,
            correctAnswer: currentCorrectAnswer
          });
        }
        
        // Start new question
        currentQuestion = questionMatch[2];
        currentOptions = [];
        currentCorrectAnswer = null;
        continue;
      }
      
      // Detect options (A), B), C), D) or A. B. C. D.)
      const optionMatch = line.match(/^([A-D])[\.\)]\s*(.+)$/i);
      if (optionMatch) {
        const optionLetter = optionMatch[1].toUpperCase();
        const optionText = optionMatch[2];
        
        currentOptions.push({
          letter: optionLetter,
          text: optionText,
          isCorrect: false
        });
        continue;
      }
      
      // Detect answer (Answer: A, Correct Answer: B, etc.)
      const answerMatch = line.match(/^(Answer|Correct\s*Answer|Ans)[\s:]+([A-D])/i);
      if (answerMatch) {
        currentCorrectAnswer = answerMatch[2].toUpperCase();
        // Mark the correct option
        if (currentOptions.length > 0) {
          currentOptions.forEach(opt => {
            if (opt.letter === currentCorrectAnswer) {
              opt.isCorrect = true;
            }
          });
        }
        continue;
      }
      
      // If we're in a question context and line doesn't match patterns, append to question
      if (currentQuestion && currentOptions.length === 0 && !answerMatch) {
        currentQuestion += ' ' + line;
      }
    }
    
    // Save last question
    if (currentQuestion && currentOptions.length >= 2) {
      questions.push({
        question: currentQuestion,
        options: currentOptions,
        correctAnswer: currentCorrectAnswer
      });
    }
    
    // Convert to required format
    const formattedQuestions = questions.map(q => {
      const options = q.options.map(opt => ({
        optionText: opt.text,
        isCorrect: opt.isCorrect
      }));
      
      // Ensure at least one correct answer
      if (!options.some(opt => opt.isCorrect) && q.correctAnswer) {
        const correctIndex = q.options.findIndex(opt => opt.letter === q.correctAnswer);
        if (correctIndex >= 0) {
          options[correctIndex].isCorrect = true;
        }
      }
      
      return {
        question: q.question.trim(),
        options: options
      };
    });
    
    return formattedQuestions;
  } catch (error) {
    throw new Error(`PDF parsing error: ${error.message}`);
  }
};

