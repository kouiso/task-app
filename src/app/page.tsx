'use client';

import ChatInterface from '@/components/chat/ChatInterface';
import { Box } from '@mui/material';

export default function HomePage() {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ChatInterface />
    </Box>
  );
}
