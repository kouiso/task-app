'use client'

import { useState } from 'react'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Grid,
  Chip,
  AppBar,
  Toolbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import SettingsIcon from '@mui/icons-material/Settings'
import AddIcon from '@mui/icons-material/Add'
import ChatWindow from './ChatWindow'
import { AIProvider, Message } from '@/types/chat'
import { sendMessage } from '@/lib/api/chat'

const availableProviders: AIProvider[] = [
  { id: 'openai', name: 'ChatGPT', model: 'gpt-3.5-turbo', enabled: true, color: '#10a37f' },
  { id: 'claude', name: 'Claude', model: 'claude-3-sonnet', enabled: true, color: '#6366f1' },
  { id: 'gemini', name: 'Gemini', model: 'gemini-pro', enabled: false, color: '#4285f4' },
  { id: 'llama', name: 'Llama 2', model: 'llama-2-70b', enabled: false, color: '#ff6b6b' },
]

export default function ChatInterface() {
  const [input, setInput] = useState('')
  const [providers, setProviders] = useState(availableProviders)
  const [conversations, setConversations] = useState<Record<string, any[]>>({})
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const enabledProviders = providers.filter(p => p.enabled)
    const userMessage: Message = { role: 'user', content: input }
    
    enabledProviders.forEach(async (provider) => {
      const currentMessages = conversations[provider.id] || []
      const updatedMessages = [...currentMessages, userMessage]
      
      setConversations(prev => ({
        ...prev,
        [provider.id]: [...updatedMessages, 
          { role: 'assistant', content: '', loading: true }
        ]
      }))
      
      try {
        const response = await sendMessage(
          provider.id,
          updatedMessages,
          { model: provider.model }
        )
        
        setConversations(prev => ({
          ...prev,
          [provider.id]: [...updatedMessages, 
            { role: 'assistant', content: response, loading: false }
          ]
        }))
      } catch (error) {
        setConversations(prev => ({
          ...prev,
          [provider.id]: [...updatedMessages, 
            { 
              role: 'assistant', 
              content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`, 
              loading: false 
            }
          ]
        }))
      }
    })

    setInput('')
  }

  const toggleProvider = (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, enabled: !p.enabled } : p
    ))
  }

  const enabledProviders = providers.filter(p => p.enabled)

  return (
    <>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 600 }}>
            AI Chat Hub
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {providers.map(provider => (
              <Chip
                key={provider.id}
                label={provider.name}
                size="small"
                sx={{
                  bgcolor: provider.enabled ? provider.color : 'transparent',
                  color: provider.enabled ? 'white' : 'text.secondary',
                  border: 1,
                  borderColor: provider.enabled ? provider.color : 'divider',
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8,
                  }
                }}
                onClick={() => toggleProvider(provider.id)}
              />
            ))}
          </Box>
          <IconButton onClick={() => setIsSettingsOpen(!isSettingsOpen)} sx={{ ml: 2 }}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Settings Sidebar */}
        {isSettingsOpen && (
          <Paper sx={{ width: 300, p: 2, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Settings</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Active Models</Typography>
            <List dense>
              {providers.map(provider => (
                <ListItem key={provider.id}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={provider.enabled}
                        onChange={() => toggleProvider(provider.id)}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{provider.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {provider.model}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* Chat Windows */}
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          <Grid container sx={{ height: '100%' }}>
            {enabledProviders.length === 0 ? (
              <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box textAlign="center">
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No AI providers selected
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click on the provider chips above to enable them
                  </Typography>
                </Box>
              </Grid>
            ) : (
              enabledProviders.map(provider => (
                <Grid 
                  key={provider.id} 
                  item 
                  xs={12} 
                  md={enabledProviders.length === 1 ? 12 : 6} 
                  lg={enabledProviders.length <= 2 ? 6 : 4}
                  sx={{ height: '100%', borderRight: 1, borderColor: 'divider' }}
                >
                  <ChatWindow 
                    provider={provider}
                    messages={conversations[provider.id] || []}
                  />
                </Grid>
              ))
            )}
          </Grid>
        </Box>
      </Box>

      {/* Input Area */}
      <Paper 
        sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          display: 'flex',
          gap: 1
        }}
        elevation={0}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type your message here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
        />
        <IconButton 
          color="primary" 
          onClick={handleSend}
          disabled={!input.trim() || enabledProviders.length === 0}
          sx={{ 
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&:disabled': {
              bgcolor: 'action.disabledBackground',
            }
          }}
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </>
  )
}