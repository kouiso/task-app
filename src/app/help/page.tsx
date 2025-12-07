'use client';

import { AppLayout } from '@/components/layout/app-layout';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';

const faqs = [
  {
    question: 'How do I create a new project?',
    answer:
      'Navigate to the Projects page and click the "New Project" button. Fill in the project details including name, description, and color. You will automatically be assigned as the project owner.',
  },
  {
    question: 'How do I assign a task to someone?',
    answer:
      'When creating or editing a task, use the "Assignee" dropdown to select a team member. Only users who are members of the project can be assigned to tasks in that project.',
  },
  {
    question: 'What are the different task statuses?',
    answer:
      'Tasks can have the following statuses: TODO (not started), IN_PROGRESS (actively being worked on), IN_REVIEW (awaiting review), DONE (completed), CANCELLED (no longer needed), and BLOCKED (waiting on something).',
  },
  {
    question: 'How do I add members to a project?',
    answer:
      'Open the project details and click "Add Member". Select the user and assign them a role (Owner, Admin, Member, or Viewer). Different roles have different permissions.',
  },
  {
    question: 'Can I bulk update multiple tasks at once?',
    answer:
      'Yes! On the Tasks page, use the checkboxes to select multiple tasks. Then use the bulk action buttons to complete, change status, or delete the selected tasks.',
  },
  {
    question: 'How does task priority work?',
    answer:
      'Tasks can be assigned one of four priority levels: LOW, MEDIUM, HIGH, or URGENT. Priority helps you and your team focus on what matters most.',
  },
  {
    question: 'How do I track time spent on a task?',
    answer:
      'Each task has a built-in timer. Click the timer button to start tracking time. You can also manually add time in the task details.',
  },
  {
    question: 'Can I archive completed projects?',
    answer:
      'Yes! Open the project details and click the "Archive" button. Archived projects can be viewed by toggling the "Show Archived" switch on the Projects page.',
  },
];

export default function HelpPage() {
  return (
    <AppLayout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Help & Documentation
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          Find answers to common questions and learn how to use Task App effectively.
        </Typography>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Getting Started
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography paragraph>
              <strong>1. Create a Project:</strong> Start by creating a project to organize your
              tasks. Each project can have its own team members and settings.
            </Typography>
            <Typography paragraph>
              <strong>2. Add Team Members:</strong> Invite your team by adding them as project
              members. Assign appropriate roles based on their responsibilities.
            </Typography>
            <Typography paragraph>
              <strong>3. Create Tasks:</strong> Break down your work into tasks. Assign tasks to
              team members, set due dates, and track progress.
            </Typography>
            <Typography paragraph>
              <strong>4. Track Progress:</strong> Use the dashboard to monitor overall progress,
              view weekly reports, and check your personal task list.
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="h5" gutterBottom>
          Frequently Asked Questions
        </Typography>
        <Box>
          {faqs.map((faq) => (
            <Accordion key={faq.question}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="medium">{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary">{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Need More Help?
            </Typography>
            <Typography color="text.secondary">
              If you cannot find the answer to your question, please contact support at{' '}
              <a href="mailto:support@taskapp.com">support@taskapp.com</a>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </AppLayout>
  );
}
