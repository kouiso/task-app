'use client'

import { useState, useEffect } from 'react'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Box,
  Divider,
  TextField,
  InputAdornment,
} from '@mui/material'
import ChatIcon from '@mui/icons-material/Chat'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import { Conversation } from '@/types/chat'
import { ChatStorage } from '@/lib/storage'

interface ConversationListProps {
  selectedId?: string
  onSelect: (conversation: Conversation) => void
  onNew: () => void
  onDelete?: (id: string) => void
}

export default function ConversationList({
  selectedId,
  onSelect,
  onNew,
  onDelete,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadConversations()
    
    const interval = setInterval(loadConversations, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadConversations = () => {
    const stored = ChatStorage.getConversations()
    setConversations(stored)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    ChatStorage.deleteConversation(id)
    loadConversations()
    onDelete?.(id)
  }

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.messages.some(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString()
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <IconButton
          fullWidth
          sx={{
            width: '100%',
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
          onClick={onNew}
        >
          <AddIcon />
          <Typography sx={{ ml: 1 }}>New Chat</Typography>
        </IconButton>
      </Box>

      <Box sx={{ px: 2, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Divider />

      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filteredConversations.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No conversations yet
            </Typography>
          </Box>
        ) : (
          filteredConversations.map((conversation) => (
            <ListItem
              key={conversation.id}
              disablePadding
              selected={conversation.id === selectedId}
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => handleDelete(conversation.id, e)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton onClick={() => onSelect(conversation)}>
                <ListItemIcon>
                  <ChatIcon />
                </ListItemIcon>
                <ListItemText
                  primary={conversation.title}
                  secondary={formatDate(conversation.updatedAt)}
                  primaryTypographyProps={{
                    noWrap: true,
                    fontSize: '0.9rem',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Box>
  )
}