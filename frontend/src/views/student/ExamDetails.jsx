import React, { useState } from 'react';
import { Grid, Paper, Typography, List, ListItemText, Button, Stack, FormControlLabel, Checkbox, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetExamsQuery, useGetQuestionsQuery, useVerifyExamCodeMutation } from 'src/slices/examApiSlice';
import { toast } from 'react-toastify';

function DescriptionAndInstructions({ selectedExam, totalQuestions, durationMinutes, onStartTest }) {
  const [certify, setCertify] = useState(false);

  const handleCertifyChange = (e) => setCertify(e.target.checked);
  
  const handleTest = () => {
    if (!certify) {
      toast.error('Please certify that you have read the instructions');
      return;
    }
    onStartTest();
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h2" mb={3}>Description</Typography>
        <Typography>
          Please read the instructions below carefully before starting your exam.
        </Typography>

        <Typography variant="h3" mb={3} mt={3}>Test Instructions</Typography>
          <List>
            <ol>
              <li>
                <ListItemText>
                <Typography variant="body1">This test consists of only <strong>MCQ questions.</strong></Typography>
                </ListItemText>
              </li>
              <li>
                <ListItemText>
                  <Typography variant="body1">
                  There are a total of <strong>{totalQuestions}</strong> questions. Test Duration is <strong>{durationMinutes} minutes.</strong>
                  </Typography>
                </ListItemText>
              </li>
              <li>
                <ListItemText>
                <Typography variant="body1">Your session will be <strong>AI-proctored</strong> and monitored.</Typography>
              </ListItemText>
            </li>
            <li>
              <ListItemText>
                <Typography variant="body1"><strong>Keep your face clearly visible</strong> to the camera at all times.</Typography>
                </ListItemText>
              </li>
              <li>
                <ListItemText>
                <Typography variant="body1"><strong>Only one person</strong> must be present in the camera frame.</Typography>
                </ListItemText>
              </li>
              <li>
                <ListItemText>
                <Typography variant="body1"><strong>No mobile phones, books, notes, or external devices</strong> are allowed.</Typography>
                </ListItemText>
              </li>
              <li>
                <ListItemText>
                <Typography variant="body1"><strong>Microphone must be enabled</strong>; avoid talking during the exam.</Typography>
                </ListItemText>
              </li>
              <li>
                <ListItemText>
                <Typography variant="body1">Maintain a <strong>quiet environment</strong> with minimal background noise.</Typography>
                </ListItemText>
              </li>
              <li>
                <ListItemText>
                <Typography variant="body1"><strong>Do not switch tabs</strong> or minimize the window during the test.</Typography>
                </ListItemText>
              </li>
              <li>
                <ListItemText>
                <Typography variant="body1">The test will run in <strong>full screen mode</strong>.</Typography>
                </ListItemText>
              </li>
              <li>
                <ListItemText>
                <Typography variant="body1">Ensure a <strong>stable internet connection</strong> and sufficient power supply.</Typography>
                </ListItemText>
              </li>
            </ol>
          </List>

        <Typography variant="h3" mb={3} mt={3}>Confirmation</Typography>
        <Typography mb={3}>Your actions shall be proctored and any signs of wrongdoing may lead to suspension or cancellation of your test.</Typography>
        <Stack direction="column" alignItems="center" spacing={3}>
          <FormControlLabel control={<Checkbox checked={certify} onChange={handleCertifyChange} color="primary" />} label="I certify that I have read and agree to the instructions." />
          <div style={{ display: 'flex', padding: '2px', margin: '10px' }}>
            <Button variant="contained" color="primary" disabled={!certify} onClick={handleTest}>
              Start Test
            </Button>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Exam Code Verification Dialog Component
function ExamCodeDialog({ open, onClose, examCode, setExamCode, onVerify, isVerifying }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Enter Exam Access Code</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This exam requires an access code. Please enter the code provided by your teacher.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Exam Code"
          type="text"
          fullWidth
          variant="outlined"
          value={examCode}
          onChange={(e) => setExamCode(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onVerify();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onVerify} variant="contained" disabled={isVerifying || !examCode.trim()}>
          {isVerifying ? 'Verifying...' : 'Verify & Start Exam'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const imgUrl = 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80';

export default function ExamDetails() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { data: exams } = useGetExamsQuery();
  const { data: questions } = useGetQuestionsQuery(examId);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [examCode, setExamCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyCode, { isLoading: isVerifying }] = useVerifyExamCodeMutation();

  const selectedExam = exams?.find((e) => e.examId === examId);
  const totalQuestions = (questions && Array.isArray(questions)) ? questions.length : (selectedExam?.totalQuestions ?? 0);
  const durationMinutes = selectedExam?.duration ?? 0;
  const requiresCode = selectedExam?.requiresCode || false;

  const handleVerifyCode = async () => {
    if (!examCode.trim()) {
      toast.error('Please enter exam code');
      return;
    }

    try {
      const result = await verifyCode({ examId, examCode }).unwrap();
      if (result.valid) {
        setCodeVerified(true);
        setCodeDialogOpen(false);
        toast.success('Code verified! Starting exam...');
        // Navigate to test after verification
        setTimeout(() => {
          startExam();
        }, 500);
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid exam code');
      setExamCode('');
    }
  };

  const startExam = () => {
    // Just navigate to test page - the TestPage component will handle attempt creation
    // when it loads and calls the questions endpoint
    navigate(`/exam/${examId}/test`);
  };

  const handleStartTest = () => {
    if (!selectedExam) {
      toast.error('Exam not found.');
      return;
    }
    
    // If exam requires code and not verified, show code dialog
    if (requiresCode && !codeVerified) {
      setCodeDialogOpen(true);
      return;
    }
    
    startExam();
  };

  return (
    <>
      <Grid container sx={{ height: '100vh' }}>
        <Grid item xs={false} sm={4} md={7} sx={{ backgroundImage: `url(${imgUrl})`, backgroundRepeat: 'no-repeat', backgroundColor: (t) => (t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900]), backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
          <DescriptionAndInstructions 
            selectedExam={selectedExam}
            totalQuestions={totalQuestions}
            durationMinutes={durationMinutes}
            onStartTest={handleStartTest}
          />
        </Grid>
      </Grid>
      
      <ExamCodeDialog
        open={codeDialogOpen}
        onClose={() => setCodeDialogOpen(false)}
        examCode={examCode}
        setExamCode={setExamCode}
        onVerify={handleVerifyCode}
        isVerifying={isVerifying}
      />
    </>
  );
}
