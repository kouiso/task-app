#!/usr/bin/env python3
"""apply_day.py の回帰テスト。python3 で直接実行する（unittest ベース）。

Gate B で実際に起きた2系統の破綻を固定する:
  - day16型: 「taskRouter の前に追加」が宣言ブロックの中へ誤挿入され
    use-before-declare を生む → 宣言の開始行の直前に置くこと
  - day28型: 直前の壊れた baseline 上で断片照合が全件不一致 →
    失敗時は書き換えずクリーン baseline を維持し、--restore で戻せること
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import apply_day as ad  # noqa: E402


def write(root: Path, rel: str, body: str) -> Path:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(body, encoding="utf-8")
    return p


TASK_TS_BEFORE = """import { z } from "zod";

export const taskRouter = router({
  getAll: publicProcedure.query(async () => {
    return [];
  }),

  delete: protectedProcedure.mutation(async () => {
    return null;
  }),
});
"""

ADD_TIME_FRAG = """addTime: protectedProcedure
  .input(taskTimeUpdateSchema)
  .mutation(async ({ input }) => {
    return input;
  }),"""

ADD_TIME_AFTER = """import { z } from "zod";

const taskTimeUpdateSchema = z.object({ id: z.string() });

export const taskRouter = router({
  getAll: publicProcedure.query(async () => {
    return [];
  }),

  delete: protectedProcedure.mutation(async () => {
    return null;
  }),

  addTime: protectedProcedure
    .input(taskTimeUpdateSchema)
    .mutation(async ({ input }) => {
      return input;
    }),
});
"""


class DirectiveParseTest(unittest.TestCase):
    def test_before_decl(self):
        d = ad.parse_directive("taskRouter の前に追加")
        self.assertEqual(d.kind, "before")
        self.assertEqual(d.arg, ("taskRouter",))

    def test_after_elem_treats_as_literal_name(self):
        d = ad.parse_directive('className="mt-4" の要素の直後に追加')
        self.assertEqual(d.kind, "after")
        self.assertEqual(d.arg, ('className="mt-4"',))

    def test_replace_prisma_import(self):
        d = ad.parse_directive("既存の Prisma import を置き換える")
        self.assertEqual(d.kind, "replace_auto")
        self.assertIn("import", d.arg[0])

    def test_skip_distributed(self):
        d = ad.parse_directive("配布済み・写経しません")
        self.assertEqual(d.kind, "skip")

    def test_edge_and_inside(self):
        self.assertEqual(ad.parse_directive("headers の配列に追加").kind, "array_append")
        self.assertEqual(ad.parse_directive("末尾に追加").kind, "append_end")

    def test_continuation_is_not_directive(self):
        self.assertIsNone(ad.parse_directive("同じファイルの続き"))


class DeclBoundaryTest(unittest.TestCase):
    """day16型: 宣言の開始行の直前に挿入し、ブロック内へは絶対入れない。"""

    def test_find_decl_start_prefers_shallowest(self):
        lines = TASK_TS_BEFORE.split("\n")
        i = ad.find_decl_start(lines, "taskRouter")
        self.assertEqual(i, 2)
        self.assertIn("export const taskRouter", lines[i])

    def test_decl_end_walks_call_chain(self):
        lines = TASK_TS_BEFORE.split("\n")
        si = ad.find_decl_start(lines, "taskRouter")
        ei = ad.find_decl_end(lines, si)
        self.assertEqual(lines[ei].strip(), "});")

    def test_member_decl_inside_router(self):
        lines = TASK_TS_BEFORE.split("\n")
        si = ad.find_decl_start(lines, "delete")
        self.assertIn("delete:", lines[si])
        ei = ad.find_decl_end(lines, si)
        self.assertIn("}),", lines[ei])

    def test_insert_before_decl_start_not_inside(self):
        # 実事故の再現: 「taskRouter の前に追加」の断片を taskRouter ブロック
        # の中（getAll や delete の内側）へ入れてはいけない。
        lines = ad.norm(TASK_TS_BEFORE.split("\n"))
        frag = ad.norm("const taskTimeUpdateSchema = z.object({});".split("\n"))
        res = ad.apply_directive(lines, ad.Directive("before", ("taskRouter",)), frag)
        self.assertIsNotNone(res)
        idx = res.index("const taskTimeUpdateSchema = z.object({});")
        router_idx = next(i for i, l in enumerate(res) if "taskRouter" in l)
        self.assertLess(idx, router_idx)
        # 宣言内への混入がない = depth 0 の位置に置かれている
        self.assertEqual(ad._code_depth_before(res, idx), 0)


class Day16TypeTest(unittest.TestCase):
    """実教材 day16 の形: task.ts への前置/直後指示が壊れず適用できる。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.target = root / "app"
        self.oracle = root / "oracle"
        self.target.mkdir()
        self.oracle.mkdir()
        write(self.target, "src/server/api/routers/task.ts", TASK_TS_BEFORE)
        # oracle(完成版) は day16 適用後の形を持つ
        write(self.oracle, "src/server/api/routers/task.ts", ADD_TIME_AFTER)

    def tearDown(self):
        self.tmp.cleanup()

    def test_schema_before_router_and_proc_after_delete(self):
        md = """# day16 テスト

```typescript
// filepath: src/server/api/routers/task.ts （taskRouter の前に追加）
const taskTimeUpdateSchema = z.object({ id: z.string() });
```

```typescript
// filepath: src/server/api/routers/task.ts （delete の直後に追加）
""" + ADD_TIME_FRAG + """
```
"""
        md_path = write(Path(self.tmp.name), "day16.md", md)
        written, skipped = ad.apply_day(
            md_path, self.target, oracle_dir=self.oracle, tag="day16")
        self.assertTrue(any("SPLICE" in w for w in written), skipped)
        out = (self.target / "src/server/api/routers/task.ts").read_text()
        schema_i = out.index("taskTimeUpdateSchema =")
        router_i = out.index("taskRouter =")
        self.assertLess(schema_i, router_i)  # use-before-declare を生まない
        add_i = out.index("addTime:")
        delete_i = out.index("delete:")
        self.assertGreater(add_i, delete_i)
        self.assertTrue(ad.structural_balance_ok(out))


class Day28TypeTest(unittest.TestCase):
    """day28型: 断片照合失敗時にファイルを壊さず、--restore で baseline へ戻せる。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.target = root / "app"
        self.oracle = root / "oracle"
        self.target.mkdir()
        self.oracle.mkdir()
        write(self.target, "src/server/api/routers/task.ts", TASK_TS_BEFORE)
        write(self.oracle, "src/server/api/routers/task.ts", ADD_TIME_AFTER)

    def tearDown(self):
        self.tmp.cleanup()

    def test_reject_keeps_baseline_and_restores(self):
        md = """# day28 テスト

```typescript
// filepath: src/server/api/routers/task.ts （delete の直後に追加）
""" + ADD_TIME_FRAG + """
```

```typescript
// filepath: src/server/api/routers/task.ts
oracle 上にも target 上にも存在しない完全に新規の断片
```
"""
        md_path = write(Path(self.tmp.name), "day28.md", md)
        backup_root = Path(self.tmp.name) / "backups"
        before = (self.target / "src/server/api/routers/task.ts").read_text()

        written, skipped = ad.apply_day(
            md_path, self.target, oracle_dir=self.oracle,
            backup_root=backup_root, tag="day28")

        # 1断片でも失敗したらそのファイルは一切書き換えない（連鎖崩壊を防ぐ）
        after = (self.target / "src/server/api/routers/task.ts").read_text()
        self.assertEqual(after, before)
        self.assertFalse(any("task.ts" in w for w in written))
        self.assertTrue(any("baseline kept" in s for s in skipped))

    def test_restore_reverts_successful_day(self):
        md = """# day28b

```typescript
// filepath: src/server/api/routers/task.ts （taskRouter の前に追加）
const taskTimeUpdateSchema = z.object({ id: z.string() });
```
"""
        md_path = write(Path(self.tmp.name), "day28b.md", md)
        backup_root = Path(self.tmp.name) / "backups"
        before = (self.target / "src/server/api/routers/task.ts").read_text()
        written, _ = ad.apply_day(
            md_path, self.target, oracle_dir=self.oracle,
            backup_root=backup_root, tag="day28")
        self.assertTrue(written)
        self.assertNotEqual(
            (self.target / "src/server/api/routers/task.ts").read_text(), before)

        # verify_day 失敗想定: 適用前スナップショットから正常 baseline を復元
        restored = ad.restore_day(backup_root, "day28", self.target)
        self.assertIn("src/server/api/routers/task.ts", restored)
        self.assertEqual(
            (self.target / "src/server/api/routers/task.ts").read_text(), before)

    def test_restore_removes_created_files(self):
        md = """# day29 新規ファイル

```typescript
// filepath: src/server/api/routers/user.ts
export const userRouter = router({});
```
"""
        md_path = write(Path(self.tmp.name), "day29.md", md)
        backup_root = Path(self.tmp.name) / "backups"
        written, _ = ad.apply_day(
            md_path, self.target, oracle_dir=self.oracle,
            backup_root=backup_root, tag="day29")
        self.assertTrue(any("user.ts" in w for w in written))
        self.assertTrue((self.target / "src/server/api/routers/user.ts").exists())

        ad.restore_day(backup_root, "day29", self.target)
        self.assertFalse((self.target / "src/server/api/routers/user.ts").exists())


class SafetyTest(unittest.TestCase):
    def test_unsafe_paths_still_rejected(self):
        self.assertFalse(ad.is_safe_rel_path("../x.ts"))
        self.assertFalse(ad.is_safe_rel_path("/etc/passwd"))
        self.assertFalse(ad.is_safe_rel_path("random/root.txt"))
        # 教材が指示するルート直下ファイルだけ許可される
        self.assertTrue(ad.is_safe_rel_path("next.config.ts"))
        self.assertTrue(ad.is_safe_rel_path(".env.example"))
        self.assertTrue(ad.is_safe_rel_path("src/app/page.tsx"))

    def test_ellipsis_fragment_rejected_as_listing(self):
        # 省略記号を含む本文は全量リスティングにならない（完成版扱いを防ぐ）
        self.assertTrue(ad.has_ellipsis("// ... 既存コード"))
        self.assertFalse(ad.has_ellipsis("...(isTest ? [] : headers)"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
