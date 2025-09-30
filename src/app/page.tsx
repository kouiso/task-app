'use client'

import { Box } from '@mui/material'
import ChatInterface from '@/components/chat/ChatInterface'

export default function HomePage() {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ChatInterface />
    </Box>
  )
}