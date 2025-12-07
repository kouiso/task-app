'use client';

import { AppLayout } from '@/components/layout/app-layout';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import TimelineIcon from '@mui/icons-material/Timeline';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';

const features = [
  {
    icon: <AssignmentIcon sx={{ fontSize: 48 }} color="primary" />,
    title: 'Task Management',
    description:
      'Create, assign, and track tasks with multiple status options, priorities, and due dates.',
  },
  {
    icon: <DashboardIcon sx={{ fontSize: 48 }} color="secondary" />,
    title: 'Project Organization',
    description: 'Organize your work into projects with team members and custom workflows.',
  },
  {
    icon: <TimelineIcon sx={{ fontSize: 48 }} color="success" />,
    title: 'Progress Tracking',
    description:
      'Monitor progress with visual indicators, time tracking, and completion statistics.',
  },
  {
    icon: <GroupIcon sx={{ fontSize: 48 }} color="warning" />,
    title: 'Team Collaboration',
    description: 'Collaborate with your team through comments, mentions, and real-time updates.',
  },
];

export default function AboutPage() {
  return (
    <AppLayout>
      <Box>
        <Box mb={6} textAlign="center">
          <Typography variant="h3" gutterBottom>
            About Task App
          </Typography>
          <Typography variant="h6" color="text.secondary" maxWidth={800} mx="auto">
            A modern task management application built with Next.js, tRPC, and Prisma. Designed for
            teams who want to stay organized and productive.
          </Typography>
        </Box>

        <Grid container spacing={4} mb={6}>
          {features.map((feature) => (
            <Grid item xs={12} md={6} key={feature.title}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Box mb={2}>{feature.icon}</Box>
                  <Typography variant="h5" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">{feature.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Technology Stack
            </Typography>
            <Grid container spacing={2} mt={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Frontend
                </Typography>
                <Typography component="div" color="text.secondary">
                  • Next.js 15 - React framework
                </Typography>
                <Typography component="div" color="text.secondary">
                  • Material-UI - UI component library
                </Typography>
                <Typography component="div" color="text.secondary">
                  • tRPC - Type-safe API layer
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Backend
                </Typography>
                <Typography component="div" color="text.secondary">
                  • Prisma - Database ORM
                </Typography>
                <Typography component="div" color="text.secondary">
                  • PostgreSQL - Database
                </Typography>
                <Typography component="div" color="text.secondary">
                  • NextAuth.js - Authentication
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </AppLayout>
  );
}
