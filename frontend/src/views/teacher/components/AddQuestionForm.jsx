import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Select,
  MenuItem,
  Paper,
  Typography,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import swal from 'sweetalert';
import { 
  useCreateQuestionMutation, 
  useGetExamsQuery,
  useCreateBulkQuestionsMutation,
  useUploadPDFMutation,
} from 'src/slices/examApiSlice';
import { toast } from 'react-toastify';

const AddQuestionForm = () => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [correctOptions, setCorrectOptions] = useState([false, false, false, false]);
  const [selectedExamId, setSelectedExamId] = useState('');

  const handleOptionChange = (index) => {
    const updatedCorrectOptions = [...correctOptions];
    updatedCorrectOptions[index] = !correctOptions[index];
    setCorrectOptions(updatedCorrectOptions);
  };

  const [createQuestion] = useCreateQuestionMutation();
  const [createBulkQuestions, { isLoading: isBulkLoading }] = useCreateBulkQuestionsMutation();
  const [uploadPDF, { isLoading: isUploading }] = useUploadPDFMutation();
  const { data: examsData } = useGetExamsQuery();
  const [pdfFile, setPdfFile] = useState(null);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (examsData && examsData.length > 0) {
      const firstExamId = examsData[0].examId;
      setSelectedExamId(firstExamId);
      console.log('AddQuestionForm - Setting default examId:', firstExamId);
      console.log('AddQuestionForm - examId type:', typeof firstExamId);
      console.log('AddQuestionForm - examId length:', firstExamId?.length);
    }
  }, [examsData]);

  const handleAddQuestion = async () => {
    if (newQuestion.trim() === '' || newOptions.some((option) => option.trim() === '')) {
      swal('', 'Please fill out the question and all options.', 'error');
      return;
    }

    const newQuestionObj = {
      question: newQuestion,
      options: newOptions.map((option, index) => ({
        optionText: option,
        isCorrect: correctOptions[index],
      })),
      examId: selectedExamId,
    };

    try {
      const res = await createQuestion(newQuestionObj).unwrap();
      if (res) {
        toast.success('Question added successfully!!!');
      }
      setQuestions([...questions, res]);
      setNewQuestion('');
      setNewOptions(['', '', '', '']);
      setCorrectOptions([false, false, false, false]);
    } catch (err) {
      swal('', 'Failed to create question. Please try again.', 'error');
    }
  };

  const handleSubmitQuestions = () => {
    setQuestions([]);
    setNewQuestion('');
    setNewOptions(['', '', '', '']);
    setCorrectOptions([false, false, false, false]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      swal('', 'Please select a valid PDF file', 'error');
    }
  };

  const handleUploadPDF = async () => {
    if (!pdfFile) {
      swal('', 'Please select a PDF file first', 'error');
      return;
    }

    if (!selectedExamId) {
      swal('', 'Please select an exam first', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('examId', selectedExamId);

    try {
      const res = await uploadPDF(formData).unwrap();
      if (res.questions && res.questions.length > 0) {
        setParsedQuestions(res.questions);
        toast.success(`Successfully parsed ${res.questions.length} questions from PDF!`);
      } else {
        swal('', 'No questions found in PDF', 'error');
      }
    } catch (err) {
      swal('', err?.data?.error || 'Failed to parse PDF', 'error');
    }
  };

  const handleImportParsedQuestions = async () => {
    if (parsedQuestions.length === 0) {
      swal('', 'No parsed questions to import', 'error');
      return;
    }

    if (!selectedExamId) {
      swal('', 'Please select an exam first', 'error');
      return;
    }

    // Confirm with user which exam they're importing to
    const selectedExam = examsData?.find(exam => exam.examId === selectedExamId);
    const confirmMessage = `Are you sure you want to import ${parsedQuestions.length} questions to:\n\nExam: ${selectedExam?.examName || 'Unknown'}\nExam ID: ${selectedExamId}`;
    
    const confirmed = await swal({
      title: "Confirm Import",
      text: confirmMessage,
      icon: "info",
      buttons: true,
      dangerMode: false,
    });

    if (!confirmed) {
      return;
    }

    try {
      console.log("Importing questions - examId:", selectedExamId);
      console.log("Importing questions - examId type:", typeof selectedExamId);
      console.log("Importing questions - examId length:", selectedExamId?.length);
      console.log("Importing questions - count:", parsedQuestions.length);
      console.log("Importing questions - First question:", parsedQuestions[0]);
      
      const res = await createBulkQuestions({
        examId: selectedExamId,
        questions: parsedQuestions,
      }).unwrap();
      
      console.log("Import result:", res);
      console.log("Import result - verifiedCount:", res.verifiedCount);
      toast.success(`Successfully imported ${res.questions.length} questions to ${selectedExam?.examName || 'exam'}! (Verified: ${res.verifiedCount})`);
      setParsedQuestions([]);
      setPdfFile(null);
      // Reset file input
      const fileInput = document.getElementById('pdf-upload-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error("Import error:", err);
      swal('', err?.data?.error || 'Failed to import questions', 'error');
    }
  };

  return (
    <div>
      {/* Shared Exam Selection */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
          Select the exam you want to add questions to:
        </Typography>
        <Select
          label="Select Exam"
          value={selectedExamId}
          onChange={(e) => {
            const newExamId = e.target.value;
            console.log('AddQuestionForm - Selected examId:', newExamId);
            setSelectedExamId(newExamId);
            // Clear parsed questions when exam changes
            setParsedQuestions([]);
            setPdfFile(null);
            const fileInput = document.getElementById('pdf-upload-input');
            if (fileInput) fileInput.value = '';
          }}
          fullWidth
        >
          {examsData &&
            examsData.map((exam) => (
              <MenuItem key={exam.examId} value={exam.examId}>
                {exam.examName}
              </MenuItem>
            ))}
        </Select>
        {selectedExamId && examsData && examsData.find(e => e.examId === selectedExamId) && (
          <Box sx={{ mt: 1.5, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
              ✓ Selected: {examsData.find(e => e.examId === selectedExamId).examName}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Tabs for Import vs Manual */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
          <Tab label="Import from PDF" />
          <Tab label="Add Manually" />
        </Tabs>

        {/* PDF Import Tab */}
        {tabValue === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a PDF file with questions in the following format:
            </Typography>
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
              Q1. Question text?<br />
              A) Option 1<br />
              B) Option 2<br />
              C) Option 3<br />
              D) Option 4<br />
              Answer: A
            </Box>
            
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Button variant="outlined" component="label">
                Choose PDF File
                <input
                  id="pdf-upload-input"
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {pdfFile && (
                <Typography variant="body2" color="text.secondary">
                  {pdfFile.name}
                </Typography>
              )}
              <Button
                variant="contained"
                onClick={handleUploadPDF}
                disabled={!pdfFile || isUploading || !selectedExamId}
              >
                {isUploading ? 'Parsing...' : 'Parse PDF'}
              </Button>
            </Stack>

            {parsedQuestions.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Found {parsedQuestions.length} questions:
                </Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
                  {parsedQuestions.map((q, idx) => (
                    <Paper key={idx} sx={{ p: 1.5, mb: 1, bgcolor: 'white' }}>
                      <Typography variant="body2" fontWeight="bold">
                        Q{idx + 1}: {q.question}
                      </Typography>
                      {q.options.map((opt, optIdx) => (
                        <Typography
                          key={optIdx}
                          variant="body2"
                          sx={{ ml: 2, color: opt.isCorrect ? 'green' : 'inherit' }}
                        >
                          {String.fromCharCode(65 + optIdx)}) {opt.optionText}
                          {opt.isCorrect && ' ✓'}
                        </Typography>
                      ))}
                    </Paper>
                  ))}
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleImportParsedQuestions}
                  disabled={isBulkLoading}
                  size="large"
                >
                  {isBulkLoading ? 'Importing...' : `Import ${parsedQuestions.length} Questions`}
                </Button>
              </>
            )}
          </Box>
        )}

        {/* Manual Entry Tab */}
        {tabValue === 1 && (
          <Box>

            {questions.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Previously Added Questions ({questions.length}):
                </Typography>
                {questions.map((questionObj, questionIndex) => (
                  <Paper key={questionIndex} sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" fontWeight="bold">
                      Q{questionIndex + 1}: {questionObj.question}
                    </Typography>
                    {questionObj.options.map((option, optionIndex) => (
                      <Typography
                        key={optionIndex}
                        variant="body2"
                        sx={{ ml: 2, color: option.isCorrect ? 'green' : 'inherit' }}
                      >
                        {String.fromCharCode(65 + optionIndex)}) {option.optionText}
                        {option.isCorrect && ' ✓'}
                      </Typography>
                    ))}
                  </Paper>
                ))}
              </Box>
            )}

            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" gutterBottom>
              Add New Question:
            </Typography>

            <TextField
              label="Question Text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />

            {newOptions.map((option, index) => (
              <Stack
                key={index}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
                mb={1.5}
              >
                <TextField
                  label={`Option ${index + 1}`}
                  value={newOptions[index]}
                  onChange={(e) => {
                    const updatedOptions = [...newOptions];
                    updatedOptions[index] = e.target.value;
                    setNewOptions(updatedOptions);
                  }}
                  fullWidth
                  sx={{ flex: '85%' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={correctOptions[index]}
                      onChange={() => handleOptionChange(index)}
                    />
                  }
                  label="Correct"
                />
              </Stack>
            ))}

            <Stack mt={3} direction="row" spacing={2}>
              <Button variant="contained" onClick={handleAddQuestion} disabled={!selectedExamId}>
                Add Question
              </Button>
              <Button variant="outlined" onClick={handleSubmitQuestions}>
                Clear Form
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </div>
  );
};

export default AddQuestionForm;
