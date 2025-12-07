import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { CardActionArea, IconButton, Stack, Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '../../teacher/components/DeleteIcon';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
export default function ExamCard({ exam }) {
  const { examName, duration, totalQuestions, examId, liveDate, deadDate, requiresCode } = exam;
  const { userInfo } = useSelector((state) => state.auth);
  const isTeacher = userInfo?.role === 'teacher';
  const navigate = useNavigate();

  const now = new Date();
  const start = liveDate ? new Date(liveDate) : null;
  const end = deadDate ? new Date(deadDate) : null;
  const before = start && now < start;
  const after = end && now > end;
  const isExamActive = !before && !after;

  const handleCardClick = () => {
    if (isTeacher) {
      toast.error('You are a teacher, you cannot take this exam');
      return;
    }
    if (!isExamActive) {
      if (before) toast.info(`Exam not started. Starts at ${new Date(liveDate).toLocaleString()}`);
      else if (after) toast.info(`Exam ended at ${new Date(deadDate).toLocaleString()}`);
      return;
    }
    navigate(`/exam/${examId}`);
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography gutterBottom variant="h5" component="div">
            {examName}
          </Typography>
          {isTeacher && (
            <IconButton 
              aria-label="delete"
              onClick={(e) => e.stopPropagation()}
              sx={{ zIndex: 1 }}
            >
              <DeleteIcon examId={examId} />
            </IconButton>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          MCQ
        </Typography>

        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1}>
          <Typography variant="h6">{totalQuestions} ques</Typography>
          <Typography color="textSecondary">{duration}</Typography>
        </Stack>

        <Box mt={1}>
          {before && <Chip size="small" label={`Starts: ${new Date(liveDate).toLocaleString()}`} color="info" />}
          {isExamActive && <Chip size="small" label="Active now" color="success" sx={{ mr: 1 }} />}
          {after && <Chip size="small" label={`Ended: ${new Date(deadDate).toLocaleString()}`} color="warning" />}
          {exam.requiresCode && <Chip size="small" label="🔒 Requires Code" color="default" sx={{ ml: 1 }} />}
        </Box>

        {/* Make the rest of the card clickable */}
        <Box 
          onClick={handleCardClick}
          sx={{ 
            cursor: isExamActive ? 'pointer' : 'default',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0
          }}
        />
      </CardContent>
    </Card>
  );
}
