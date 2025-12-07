import { Trash } from 'lucide-react';
import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import { useDeleteExamMutation } from 'src/slices/examApiSlice';
import { toast } from 'react-toastify';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const DeleteIcon = ({ examId }) => {
  const [open, setOpen] = React.useState(false);

  const [deleteExam, { isLoading }] = useDeleteExamMutation();
  
  const handleClickOpen = (e) => {
    e.stopPropagation();
    setOpen(true);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    setOpen(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    console.log('Attempting to delete exam:', examId);
    
    try {
      const result = await deleteExam(examId).unwrap();
      console.log('Delete result:', result);
      toast.success('Exam deleted successfully');
      setOpen(false);
      // Use a more gentle refresh instead of window.location.reload()
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error?.data?.message || 'Failed to delete exam');
    }
  };

  return (
    <React.Fragment>
      <Button variant="outlined" onClick={handleClickOpen} disabled={isLoading}>
        <Trash />
      </Button>
      <Dialog
        open={open}
        slots={{
          transition: Transition,
        }}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle>Are you sure you want to delete this exam?</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            This action cannot be undone. All questions and results for this exam will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleDelete} disabled={isLoading} color="error">
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
};

export default DeleteIcon;
