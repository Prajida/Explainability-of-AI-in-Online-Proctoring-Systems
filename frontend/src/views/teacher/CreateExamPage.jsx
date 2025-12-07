import React from 'react';
import { Box, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import ExamForm from './components/ExamForm';
import { useCreateExamMutation } from 'src/slices/examApiSlice';
import { toast } from 'react-toastify';
import { Formik } from 'formik';
import * as yup from 'yup';

const validationSchema = yup.object({
  examName: yup.string().required('Exam Name is required'),
  totalQuestions: yup
    .number()
    .typeError('Total Questions must be a number')
    .integer('Total Questions must be an integer')
    .min(1, 'Total Questions must be at least 1')
    .required('Total Questions is required'),
  duration: yup
    .number()
    .typeError('Exam Duration must be a number')
    .integer('Exam Duration must be an integer')
    .min(1, 'Exam Duration must be at least 1 minute')
    .required('Exam Duration is required'),
  liveDate: yup.date().required('Live Date and Time is required'),
  deadDate: yup.date().required('Dead Date and Time is required'),
});

const CreateExamPage = () => {
  const [createExam, { isLoading }] = useCreateExamMutation();

  const initialExamValues = {
    examName: '',
    totalQuestions: '',
    duration: '',
    liveDate: '',
    deadDate: '',
    examCode: '', // Optional exam access code
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      console.log('Creating exam with data:', values);
      
      // Create the exam
      const examResponse = await createExam(values).unwrap();
      console.log('Exam Response:', examResponse);

      if (examResponse) {
        toast.success('Exam created successfully');
        resetForm();
      }
    } catch (err) {
      console.error('Exam Creation Error:', err);
      console.error('Error details:', err.data || err.error || err);
      toast.error(err?.data?.message || err?.error || err?.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title="Create Exam" description="Create a new exam">
      <Box>
        <Typography variant="h4" gutterBottom>
          Create New Exam
        </Typography>
        <DashboardCard title="Exam Details">
          <Formik
            initialValues={initialExamValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {(formik) => (
              <ExamForm 
                formik={formik}
                isLoading={isLoading}
              />
            )}
          </Formik>
        </DashboardCard>
      </Box>
    </PageContainer>
  );
};

export default CreateExamPage;
