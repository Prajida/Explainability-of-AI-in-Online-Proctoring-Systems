import React from 'react';
import { Grid, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BlankCard from '../../../components/shared/BlankCard';
import ExamCard from './ExamCard';
import { useGetExamsQuery } from 'src/slices/examApiSlice';

const Exams = () => {
  // Fetch exam data from the backend using useGetExamsQuery
  const { data: userExams, isLoading, isError } = useGetExamsQuery();
  console.log('Exam USer ', userExams);

  if (isLoading) {
    return <div>Loading...</div>; // You can replace this with a loading spinner component
  }

  if (isError) {
    console.error('Error fetching exams:', isError);
    return (
      <div>
        <Typography color="error">Error fetching exams. Please try refreshing the page.</Typography>
        {isError?.data?.message && (
          <Typography variant="body2" color="error">{isError.data.message}</Typography>
        )}
      </div>
    );
  }

  if (!userExams || userExams.length === 0) {
    return (
      <PageContainer title="Exams" description="List of exams">
        <Typography>No exams available at the moment.</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Exams" description="List of exams">
      <Grid container spacing={3}>
        {userExams.map((exam) => (
          <Grid item sm={6} md={4} lg={3} key={exam._id || exam.examId}>
            <BlankCard>
              <ExamCard exam={exam} />
            </BlankCard>
          </Grid>
        ))}
      </Grid>
    </PageContainer>
  );
};

export default Exams;
