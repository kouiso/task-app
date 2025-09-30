import { createTRPCRouter } from './trpc';
import { taskRouter } from './router/task';
import { commentRouter } from './router/comment';
import { projectRouter } from './router/project';
import { userRouter } from './router/user';

/**
 * This is the primary router for your server.
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  task: taskRouter,
  comment: commentRouter,
  project: projectRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
