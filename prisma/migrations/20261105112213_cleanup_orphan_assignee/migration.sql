-- Issue #639: PR #634（removeMember で未完了タスクの担当を解除）のマージ以前に
-- プロジェクトを退会したユーザーが担当のまま残っている tasks 行を整理するデータ移行。
--
-- 対象: tasks.assignee_id が、そのタスクの属する project の project_members に
--       存在しない行のうち、未完了（status が DONE / CANCELLED 以外）のもの。
-- DONE / CANCELLED は removeMember と同じ方針で完了実績の担当者記録として保持する。
--
-- 棚卸しクエリ（適用前後の確認用）:
--   -- 未完了の orphan 担当（この migration で NULL 化される行数。適用後は 0 になること）
--   SELECT COUNT(*) AS orphan_open
--   FROM "tasks" t
--   WHERE t."assignee_id" IS NOT NULL
--     AND t."status" NOT IN ('DONE', 'CANCELLED')
--     AND NOT EXISTS (
--       SELECT 1 FROM "project_members" pm
--       WHERE pm."project_id" = t."project_id"
--         AND pm."user_id" = t."assignee_id"
--     );
--
--   -- 完了済みの orphan 担当（実績として残る行数。適用前後で変わらないこと）
--   SELECT COUNT(*) AS orphan_completed
--   FROM "tasks" t
--   WHERE t."assignee_id" IS NOT NULL
--     AND t."status" IN ('DONE', 'CANCELLED')
--     AND NOT EXISTS (
--       SELECT 1 FROM "project_members" pm
--       WHERE pm."project_id" = t."project_id"
--         AND pm."user_id" = t."assignee_id"
--     );
--
--   -- 全担当付きタスク数（適用前後で orphan_open 分だけ減ること）
--   SELECT COUNT(*) AS assigned_total FROM "tasks" WHERE "assignee_id" IS NOT NULL;

DO $$
DECLARE
  affected integer;
BEGIN
  UPDATE "tasks" t
  SET "assignee_id" = NULL
  WHERE t."assignee_id" IS NOT NULL
    AND t."status" NOT IN ('DONE', 'CANCELLED')
    AND NOT EXISTS (
      SELECT 1
      FROM "project_members" pm
      WHERE pm."project_id" = t."project_id"
        AND pm."user_id" = t."assignee_id"
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'cleanup_orphan_assignee: cleared assignee_id on % incomplete task(s)', affected;
END $$;
