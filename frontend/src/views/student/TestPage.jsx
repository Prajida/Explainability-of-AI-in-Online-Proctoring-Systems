import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Grid, CircularProgress } from "@mui/material";
import PageContainer from "src/components/container/PageContainer";
import BlankCard from "src/components/shared/BlankCard";
import MultipleChoiceQuestion from "./Components/MultipleChoiceQuestion";
import NumberOfQuestions from "./Components/NumberOfQuestions";
import WebCam from "./Components/WebCam";
import BrowserMonitor from "./Components/BrowserMonitor";
import { useGetExamsQuery, useGetQuestionsQuery } from "../../slices/examApiSlice";
import { useSaveCheatingLogMutation } from "src/slices/cheatingLogApiSlice";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useCheatingLog } from "src/context/CheatingLogContext";

const TestPage = () => {
  const { examId, testId } = useParams();
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDurationInSeconds, setExamDurationInSeconds] = useState(0);
  const { data: userExamdata, isLoading: isExamsLoading } = useGetExamsQuery();
  const { userInfo } = useSelector((state) => state.auth);
  const { cheatingLog, updateCheatingLog, resetCheatingLog } = useCheatingLog();
  const [saveCheatingLogMutation] = useSaveCheatingLogMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMcqCompleted, setIsMcqCompleted] = useState(false);

  // Ensure examId is set in cheating log
  useEffect(() => {
    if (examId) {
      updateCheatingLog({ examId });
    }
  }, [examId]);

  // Auto-save cheating log every 15 seconds
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        await saveCheatingLogMutation(cheatingLog);
      } catch (e) {
        // ignore transient errors
      }
    }, 15000);
    return () => clearInterval(id);
  }, [cheatingLog]);

  useEffect(() => {
    if (userExamdata) {
      const exam = userExamdata.find((exam) => exam.examId === examId);
      if (exam) {
        setSelectedExam(exam);
        setExamDurationInSeconds(exam.duration);
        console.log("Exam duration (minutes):", exam.duration);
      }
    }
  }, [userExamdata, examId]);

  const [questions, setQuestions] = useState([]);
  const { data, isLoading, error } = useGetQuestionsQuery(examId);
  const [score, setScore] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("TestPage - examId:", examId);
    console.log("TestPage - Questions data:", data);
    console.log("TestPage - Questions error:", error);
    
    if (Array.isArray(data)) {
      console.log("TestPage - Setting questions (array):", data.length);
      setQuestions(data);
    } else if (data && Array.isArray(data.data)) {
      // handle shape { success, data: [...] }
      console.log("TestPage - Setting questions (nested):", data.data.length);
      setQuestions(data.data);
    } else {
      console.log("TestPage - No questions found, setting empty array");
      setQuestions([]);
    }
  }, [data, examId, error]);

  const handleMcqCompletion = () => {
    setIsMcqCompleted(true);
  };

  const handleTestSubmission = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await saveCheatingLogMutation(cheatingLog);
      toast.success("Exam submitted successfully!");
      navigate("/result");
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast.error("Failed to submit exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveUserTestScore = (score) => {
    setScore(score);
  };

  const handleBrowserViolation = (violationType) => {
    console.log("Browser violation detected:", violationType);
    // Additional handling can be added here
  };

  if (isExamsLoading || isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer title="TestPage" description="This is TestPage">
      <Box pt="3rem">
        <Grid container spacing={3}>
          <Grid item xs={12} md={7} lg={7}>
            <BlankCard>
              <Box
                width="100%"
                minHeight="400px"
                boxShadow={3}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
              >
                {isLoading ? (
                  <CircularProgress />
                ) : (
                  <MultipleChoiceQuestion
                    submitTest={isMcqCompleted ? handleTestSubmission : handleMcqCompletion}
                    questions={questions}
                    saveUserTestScore={saveUserTestScore}
                  />
                )}
              </Box>
            </BlankCard>
          </Grid>
          <Grid item xs={12} md={5} lg={5}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <BlankCard>
                  <Box
                    maxHeight="300px"
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "start",
                      justifyContent: "center",
                      overflowY: "auto",
                      height: "100%",
                    }}
                  >
                    <NumberOfQuestions
                      questionLength={questions.length}
                      submitTest={isMcqCompleted ? handleTestSubmission : handleMcqCompletion}
                      examDurationInSeconds={examDurationInSeconds}
                    />
                  </Box>
                </BlankCard>
              </Grid>
              <Grid item xs={12}>
                <BlankCard>
                  <Box
                    width="300px"
                    maxHeight="180px"
                    boxShadow={3}
                    display="flex"
                    flexDirection="column"
                    alignItems="start"
                    justifyContent="center"
                  >
                    <WebCam cheatingLog={cheatingLog} updateCheatingLog={updateCheatingLog} examId={examId} />
                  </Box>
                </BlankCard>
              </Grid>
              <Grid item xs={12}>
                <BrowserMonitor 
                  examId={examId} 
                  onViolationDetected={handleBrowserViolation}
                  showViolationCounts={false}  // Hide counts during exam
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default TestPage;
