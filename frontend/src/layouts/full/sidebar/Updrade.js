import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import img1 from 'src/assets/images/backgrounds/rocket.png';

export const Upgrade = () => {
    return (
        <Box
            display={'flex'}
            alignItems="center"
            gap={2}
            sx={{ m: 3, p: 3, bgcolor: `${'primary.light'}`, borderRadius: '8px' }}
        >
            <>
                <Box>
                    <Typography variant="h6" mb={1}>AI_Evalu8 Pro</Typography>
                    <Button color="primary" target="_blank" href="https://github.com/your-repo/AI_Evalu8" variant="contained" aria-label="upgrade" size="small">
                        Learn More
                    </Button>
                </Box>
                <Box mt="-35px">
                    <img alt="AI_Evalu8" src={img1} width={100} />
                </Box>
            </>
        </Box>
    
};
