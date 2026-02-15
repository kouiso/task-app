'use client';

import { BarChart3, ClipboardList, Lock, Users } from 'lucide-react';
import { AppLayout } from '@/component/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';

const features = [
  {
    icon: <ClipboardList className="w-12 h-12 text-primary" />,
    title: 'Task Management',
    description:
      'Create, assign, and track tasks with multiple status options, priorities, and due dates.',
  },
  {
    icon: <Users className="w-12 h-12 text-primary" />,
    title: 'Team Collaboration',
    description: 'Organize your work into projects with team members and custom workflows.',
  },
  {
    icon: <BarChart3 className="w-12 h-12 text-primary" />,
    title: 'Progress Tracking',
    description:
      'Monitor progress with visual indicators, time tracking, and completion statistics.',
  },
  {
    icon: <Lock className="w-12 h-12 text-primary" />,
    title: 'Project Organization',
    description: 'Collaborate with your team through comments, mentions, and real-time updates.',
  },
];

const techStack = [
  {
    category: 'Frontend',
    items: [
      '• Next.js 15 - React framework',
      '• Tailwind CSS - Utility-first CSS',
      '• Shadcn/ui - Component library',
      '• tRPC - Type-safe API layer',
    ],
  },
  {
    category: 'Backend',
    items: [
      '• Prisma - Database ORM',
      '• PostgreSQL - Database',
      '• NextAuth.js - Authentication',
      '• Vercel - Hosting',
    ],
  },
];

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">About Task App</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A modern task management application built with Next.js, tRPC, and Prisma. Designed for
            teams who want to stay organized and productive.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div>{feature.icon}</div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Technology Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {techStack.map((section) => (
                <div key={section.category}>
                  <h3 className="font-bold text-lg mb-3">{section.category}</h3>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="text-sm text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
