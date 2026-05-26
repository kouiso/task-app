-- 既存の BLOCKED ステータスのタスクは未対応(TODO)に移行する
UPDATE "tasks" SET "status" = 'TODO' WHERE "status" = 'BLOCKED';

-- enum から BLOCKED を取り除く
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED');
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "TaskStatus" USING ("status"::text::"TaskStatus");
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'TODO';
DROP TYPE "TaskStatus_old";
