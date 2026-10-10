# Day 09
```typescript
// filepath: src/server/api/routers/project.ts
import { createTRPCRouter, protectedProcedure } from '../trpc';
export const projectRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => []),
});
```
