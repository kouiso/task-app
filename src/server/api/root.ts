import { chatRouter } from './routers/chat';
import { commentRouter } from './routers/comment';
import { projectRouter } from './routers/project';
import { taskRouter } from './routers/task';
import { userRouter } from './routers/user';
import { createCallerFactory, createTRPCRouter } from './trpc';

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  task: taskRouter,
  project: projectRouter,
  comment: commentRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
