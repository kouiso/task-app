'use client';

import { AppLayout } from '@/components/layout/app-layout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Help & Documentation</h1>
          <p className="text-muted-foreground">
            Find answers to common questions and learn how to use Task App effectively.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold">1. Create a Project:</p>
              <p className="text-sm text-muted-foreground">
                Start by creating a project to organize your tasks. Each project can have its own
                team members and settings.
              </p>
            </div>
            <div>
              <p className="font-semibold">2. Add Team Members:</p>
              <p className="text-sm text-muted-foreground">
                Invite your team by adding them as project members. Assign appropriate roles based
                on their responsibilities.
              </p>
            </div>
            <div>
              <p className="font-semibold">3. Create Tasks:</p>
              <p className="text-sm text-muted-foreground">
                Break down your work into tasks. Assign tasks to team members, set due dates, and
                track progress.
              </p>
            </div>
            <div>
              <p className="font-semibold">4. Track Progress:</p>
              <p className="text-sm text-muted-foreground">
                Use the dashboard to monitor overall progress, view weekly reports, and check your
                personal task list.
              </p>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="font-medium">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need More Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you cannot find the answer to your question, please contact support at{' '}
              <a href="mailto:support@taskapp.com" className="text-primary hover:underline">
                support@taskapp.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
