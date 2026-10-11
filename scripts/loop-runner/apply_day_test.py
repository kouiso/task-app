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


class MustReviewFixes(unittest.TestCase):
    """Codex MUST 指摘の回帰テスト。"""

    def test_merge_consumes_immediate_next_part(self):
        # `(` / `42` / `);` の3連フェンス: 直後の断片を読み飛ばすと
        # `(` + `);` が誤結合され、中身の `42` が失われる
        cur = ["export const a = 1;"]
        base = cur + ["export const value = (", "  42", ");"]
        parts = [
            ad.Part(cont=False, body="export const value = (", kansei=False,
                    unmarked=False, prose="", directive=None),
            ad.Part(cont=False, body="  42", kansei=False,
                    unmarked=False, prose="", directive=None),
            ad.Part(cont=False, body=");", kansei=False,
                    unmarked=False, prose="", directive=None),
        ]
        new, gaps = ad.splice_parts(cur, parts, base, "src/a.ts", "d1")
        self.assertIsNotNone(new, gaps)
        joined = "\n".join(new)
        self.assertIn("42", joined)
        # 消費した断片が二重適用されないこと（`);` は1箇所だけ）
        self.assertEqual(joined.count("42"), 1)

    def test_element_end_multiline_open_tag(self):
        # <Tag\n  attr\n/> の終了位置は最終行。開始行を返すと要素置換範囲を誤る
        lines = ["<TaskCard", "  task={t}", "/>", "<div />"]
        self.assertEqual(ad.element_end(lines, 0), 2)

    def test_snapshot_keeps_first_backup_and_created_state(self):
        with tempfile.TemporaryDirectory() as td:
            root, target = Path(td) / "bk", Path(td) / "app"
            target.mkdir()
            f = write(target, "src/a.ts", "original\n")
            ad.snapshot_file(root, "d1", "src/a.ts", f)
            f.write_text("second run\n", encoding="utf-8")
            ad.snapshot_file(root, "d1", "src/a.ts", f)
            ad.restore_day(root, "d1", target)
            self.assertEqual(f.read_text(), "original\n")
            # created に記録された新規ファイルは restore で消える
            g = target / "src/new.ts"
            ad.snapshot_file(root, "d2", "src/new.ts", g)  # 書き込み前 = created
            g.write_text("new\n", encoding="utf-8")
            ad.snapshot_file(root, "d2", "src/new.ts", g)  # 再実行でも created のまま
            ad.restore_day(root, "d2", target)
            self.assertFalse(g.exists())

    def test_mv_is_snapshotted_and_restored(self):
        with tempfile.TemporaryDirectory() as td:
            root, target = Path(td) / "bk", Path(td) / "app"
            target.mkdir()
            write(target, "src/old.ts", "body\n")
            w, s = ad.apply_safe_shell_ops("mv src/old.ts src/new.ts",
                                           target, root, "d1")
            self.assertFalse((target / "src/old.ts").exists())
            self.assertTrue((target / "src/new.ts").exists())
            ad.restore_day(root, "d1", target)
            self.assertTrue((target / "src/old.ts").exists())
            self.assertFalse((target / "src/new.ts").exists())

    def test_mv_then_recreate_keeps_modified_state(self):
        # mv old→new の後に同名 old.ts を再作成しても、old.ts は
        # modified のまま（created へ二重登録されない）。restore は
        # 原本を復元して削除しない。
        with tempfile.TemporaryDirectory() as td:
            root, target = Path(td) / "bk", Path(td) / "app"
            target.mkdir()
            write(target, "src/old.ts", "original\n")
            ad.apply_safe_shell_ops("mv src/old.ts src/new.ts",
                                    target, root, "d1")
            g = target / "src/old.ts"
            ad.snapshot_file(root, "d1", "src/old.ts", g)  # 書き込み前
            g.write_text("recreated\n", encoding="utf-8")
            ad.restore_day(root, "d1", target)
            self.assertEqual(g.read_text(), "original\n")
            self.assertFalse((target / "src/new.ts").exists())

    def test_kansei_label_not_written_or_inserted(self):
        # 完成版ラベル行はファイルへ混入させない
        parts = [ad.Part(
            cont=False, body="// 完成版: ファイル全体\nexport const a = 1;",
            kansei=True, unmarked=False, prose="", directive=None)]
        outs = list(ad.candidates(parts))
        self.assertTrue(outs)
        self.assertNotIn("完成版:", outs[0][1])

    def test_blob_locate_absorbs_line_folds(self):
        # 断片と oracle で行折り返しが違っても一致を拾う
        base = ["const a =", "  foo(", "    1", "  )", "const b = 2;"]
        frag = ["const a = foo(", "  1)"]
        self.assertEqual(ad._blob_locate(ad._norm_blob(base), frag), 0)

    def test_suffix_fragment_not_promoted_to_write(self):
        # ファイル末尾と一致するだけの小断片が全量リスティング扱いで
        # WRITE されると、既存の宣言が静かに消える
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target = root / "app"
            oracle = root / "oracle"
            target.mkdir(); oracle.mkdir()
            write(target, "src/a.ts",
                  "export const a = 1;\nexport const b = 2;\nexport const c = 3;\n")
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts
export const d = 4;
```

```typescript
// filepath: src/a.ts
export const b = 2;
export const c = 3;
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertIn("export const a = 1;", body)

    def test_directive_rewrite_not_swallowed_by_blob(self):
        # 'ab' → 'a b' の指示つき書き直しが、空白吸収ブロブの冪等判定で
        # 「適用済み」と誤認されない
        cur = ["export const label = 'ab';", "export const x = 1;"]
        parts = [ad.Part(
            cont=False, body="export const label = 'a b';",
            kansei=False, unmarked=False, prose="",
            directive=ad.Directive("replace_decl", ("label",)))]
        new, _gaps = ad.splice_parts(cur, parts, cur, "src/a.ts", "d1")
        self.assertIsNotNone(new)
        self.assertIn("export const label = 'a b';", new)

    def test_snapshot_key_no_underscore_slash_collision(self):
        # `src/a/b.ts` と `src/a__b.ts`、`src/a_/b.ts` と `src/a/_b.ts` の
        # バックアップが同一キーに潰れない
        with tempfile.TemporaryDirectory() as td:
            root, target = Path(td) / "bk", Path(td) / "app"
            target.mkdir()
            f1 = write(target, "src/a/b.ts", "A_SLASH_B\n")
            f2 = write(target, "src/a__b.ts", "A__B\n")
            f3 = write(target, "src/a_/b.ts", "A__SLASH_B\n")
            f4 = write(target, "src/a/_b.ts", "A_SLASH__B\n")
            for rel, f in (("src/a/b.ts", f1), ("src/a__b.ts", f2),
                           ("src/a_/b.ts", f3), ("src/a/_b.ts", f4)):
                ad.snapshot_file(root, "d1", rel, f)
            for f in (f1, f2, f3, f4):
                f.write_text("changed\n", encoding="utf-8")
            ad.restore_day(root, "d1", target)
            self.assertEqual(f1.read_text(), "A_SLASH_B\n")
            self.assertEqual(f2.read_text(), "A__B\n")
            self.assertEqual(f3.read_text(), "A__SLASH_B\n")
            self.assertEqual(f4.read_text(), "A_SLASH__B\n")

    def test_array_append_inserts_inside_single_line_array(self):
        # `const second = [];` のような1行配列への array_append は
        # 宣言の外ではなく括弧の内側へ挿入する
        cur = ['const first = ["x"];', 'const second = [];']
        parts = [ad.Part(
            cont=False, body='  "x",',
            kansei=False, unmarked=False, prose="",
            directive=ad.Directive("array_append", ("second",)))]
        new, _gaps = ad.splice_parts(cur, parts, cur, "src/a.ts", "d1")
        self.assertIsNotNone(new)
        joined = "\n".join(new)
        self.assertIn('"x"', joined)
        # 宣言行の前に裸の要素が置かれていないこと
        self.assertEqual(new[0], 'const first = ["x"];')
        self.assertTrue(new[1].startswith("const second = ["))

    def test_array_append_skips_bracket_in_string_literal(self):
        # `const x = [']'];` の文字列内 `]` を閉じ括弧と誤認しない。
        # 入れ子配列 `[[1]]` では外側の配列を対象にする
        cur = ["const x = [']'];", "const y = [[1]];"]
        parts = [ad.Part(
            cont=False, body='  2,',
            kansei=False, unmarked=False, prose="",
            directive=ad.Directive("array_append", ("x",)))]
        new, _gaps = ad.splice_parts(cur, parts, cur, "src/a.ts", "d1")
        self.assertIsNotNone(new)
        joined = "\n".join(new)
        # 閉じ `]` は行末 `];` に残り、要素 `2,` が括弧内に入る
        self.assertTrue(new[0].endswith(","))
        self.assertIn("  2,", joined)
        self.assertIn("];", joined)
        parts2 = [ad.Part(
            cont=False, body='  2,',
            kansei=False, unmarked=False, prose="",
            directive=ad.Directive("array_append", ("y",)))]
        new2, _ = ad.splice_parts(cur, parts2, cur, "src/a.ts", "d1")
        self.assertIsNotNone(new2)
        self.assertIn("const y = [[1],", "\n".join(new2))

    def test_array_append_targets_property_array_not_outer_return(self):
        # day30 `headers の配列に追加`: `async headers()` 関数の return 配列
        # ではなく、内側の `headers: [...]` プロパティ配列へ入れる
        cur = [
            "const nextConfig = {",
            "  async headers() {",
            "    return [",
            "      {",
            "        source: '/(.*)',",
            "        headers: [",
            "          { key: 'A', value: 'a' },",
            "        ],",
            "      },",
            "    ];",
            "  },",
            "};",
        ]
        parts = [ad.Part(
            cont=False, body="          { key: 'B', value: 'b' },",
            kansei=False, unmarked=False, prose="",
            directive=ad.Directive("array_append", ("headers",)))]
        new, _gaps = ad.splice_parts(cur, parts, cur, "next.config.ts", "d30")
        self.assertIsNotNone(new)
        joined = "\n".join(new)
        # 内側 headers 配列の `],` 直前に要素が入る（外側 return 配列ではない）
        b_idx = joined.index("{ key: 'B', value: 'b' },")
        a_idx = joined.index("{ key: 'A', value: 'a' },")
        close_idx = joined.index("        ],")
        self.assertTrue(a_idx < b_idx < close_idx)

    def test_splice_strips_kansei_label_lines(self):
        # codex SUGGEST: SPLICE 経路でも `// 完成版:` ラベル行が
        # 挿入ペイロードに混入しないことを固定する
        cur = ["export const taskRouter = router({",
               "  getAll: publicProcedure.query(() => []),",
               "});"]
        parts = [ad.Part(
            cont=False, body="// 完成版: 追加分\n  del: publicProcedure.mutation(() => null),",
            kansei=True, unmarked=False, prose="",
            directive=ad.Directive("append_end", ()))]
        new, _gaps = ad.splice_parts(cur, parts, cur, "src/a.ts", "d1")
        self.assertIsNotNone(new)
        self.assertNotIn("完成版", "\n".join(new))


class ApplyExpectRoleTest(unittest.TestCase):
    """```lang apply path=... / ```lang expect path=... 役割タグ記法。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.target = root / "app"
        self.oracle = root / "oracle"
        self.ledger = root / "ledger.jsonl"
        self.target.mkdir(); self.oracle.mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def _run(self, md: str):
        md_path = write(Path(self.tmp.name), "dayX.md", md)
        return ad.apply_day(md_path, self.target, oracle_dir=self.oracle,
                            tag="dayX", ledger_path=self.ledger)

    def test_apply_role_tag_with_path(self):
        written, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
```
""")
        self.assertFalse(skipped, skipped)
        self.assertTrue(written)
        self.assertEqual((self.target / "src/a.ts").read_text(),
                         "export const a = 1;\n")

    def test_expect_ok_is_recorded(self):
        written, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
```

```typescript expect path=src/a.ts
export const a = 1;
```
""")
        self.assertFalse(skipped, skipped)
        rec = json.loads(self.ledger.read_text().splitlines()[-1])
        self.assertIn({"path": "src/a.ts", "mode": "expect-ok"},
                      rec["applied"])

    def test_expect_mismatch_restores_baseline(self):
        write(self.target, "src/a.ts", "export const a = 1;\n")
        write(self.oracle, "src/a.ts", "export const a = 2;\n")
        written, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
export const b = 2;
```

```typescript expect path=src/a.ts
export const a = 1;
export const b = 99;
```
""")
        # 不一致 = そのファイルは適用前状態へ戻り、skip として記録される
        self.assertEqual((self.target / "src/a.ts").read_text(),
                         "export const a = 1;\n")
        self.assertTrue(any("expect mismatch" in s for s in skipped), skipped)

    def test_expect_without_apply_is_flagged(self):
        _w, skipped = self._run("""```typescript expect path=src/a.ts
export const a = 1;
```
""")
        self.assertTrue(any("expect without apply" in s for s in skipped),
                        skipped)

    def test_apply_expect_combined_writes_and_verifies(self):
        # ` ```lang apply expect ` は全量リスティングを適用し、かつ
        # 同一本文を最終状態の検算にも使う（day28 完成版リスティングの形）。
        written, skipped = self._run("""```typescript apply expect path=src/a.ts
export const a = 1;
```
""")
        self.assertFalse(skipped, skipped)
        self.assertEqual((self.target / "src/a.ts").read_text(),
                         "export const a = 1;\n")
        rec = json.loads(self.ledger.read_text().splitlines()[-1])
        self.assertIn({"path": "src/a.ts", "mode": "expect-ok"},
                      rec["applied"])

    def test_new_file_listing_must_include_first_fragment_head(self):
        # day13型: 「完成版: 途中から」の再掲が kansei-run として選ばれると
        # 先頭断片の 'use client' / import が静かに欠ける。
        # 先頭断片の冒頭行を含まない候補は新規ファイルでは採用しない。
        md = """```typescript
// filepath: src/a.ts
'use client';
import { A } from './a';
```

```typescript
// filepath: src/a.ts
// 完成版: 途中から
export const b = 2;
```
"""
        md_path = write(Path(self.tmp.name), "dayY.md", md)
        ad.apply_day(md_path, self.target, oracle_dir=self.oracle, tag="d1")
        body = (self.target / "src/a.ts").read_text()
        self.assertTrue(body.startswith("'use client';"), body[:120])

    def test_new_file_starting_with_bare_function(self):
        # day11型: query-error.ts は 'use client' も import も無い
        # `function ...` 宣言で始まる正規のファイル。先頭行の白リストが
        # import/export/コメント系だけだと正当な新規ファイルを拒否する。
        written, skipped = self._run("""```typescript
// filepath: src/lib/q.ts
function isRecord(v: unknown): boolean {
  return typeof v === 'object';
}
export function useIt(v: unknown): boolean {
  return isRecord(v);
}
```
""")
        self.assertFalse(skipped, skipped)
        self.assertTrue((self.target / "src/lib/q.ts").exists())

    def test_path_value_does_not_bleed_into_role(self):
        # `path=src/expect.ts` の値中の "expect" を役割と誤認すると、
        # apply 断片が検算オラクルに化けて別ファイルを壊す（codex 指摘）。
        written, skipped = self._run("""```typescript apply path=src/expect.ts
export const a = 1;
```
""")
        self.assertFalse(skipped, skipped)
        self.assertTrue((self.target / "src/expect.ts").exists())
        rec = json.loads(self.ledger.read_text().splitlines()[-1])
        self.assertNotIn({"path": "src/expect.ts", "mode": "expect-ok"},
                         rec["applied"])

    def test_unsafe_apply_path_is_invalid_not_inherited(self):
        # `apply path=src/../../evil.ts` を直前フェンスの続きとして
        # 前のファイルへ混入させない（codex 指摘）。
        written, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
```

```typescript apply path=src/../../evil.ts
const injected = true;
```
""")
        self.assertFalse((self.target / "src/a.ts")
                         .read_text().__contains__("injected"))
        self.assertTrue(any("invalid tagged fence" in s for s in skipped),
                        skipped)

    def test_expect_only_fence_needs_info_path(self):
        # expect の検算先は info の path= のみ。本文の // filepath: では
        # 契約対象にならない（lint と同じ規則）。
        _w, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
```

```typescript expect
// filepath: src/a.ts
export const a = 1;
```
""")
        self.assertTrue(any("invalid tagged fence" in s for s in skipped),
                        skipped)

    def test_expect_compares_blank_lines(self):
        # norm() は空行を吸収するが完成版契約は厳密。空行を落とした
        # 生成物は oracle と一致しない（codex 指摘）。
        (self.target / "src").mkdir(parents=True, exist_ok=True)
        (self.target / "src/a.ts").write_text(
            "export const a = 1;\nexport const b = 2;\n")
        _w, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
export const b = 2;
```

```typescript expect path=src/a.ts
export const a = 1;

export const b = 2;
```
""")
        self.assertTrue(any("expect mismatch" in s for s in skipped),
                        skipped)

    def test_multiple_expects_all_verified(self):
        # 同一対象の expect が2本あれば全件に一致する必要がある。
        # 後勝ち上書きだと矛盾する契約が黙って通る（codex 指摘）。
        (self.target / "src").mkdir(parents=True, exist_ok=True)
        (self.target / "src/a.ts").write_text("export const a = 1;\n")
        _w, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
```

```typescript expect path=src/a.ts
export const a = 1;
```

```typescript expect path=src/a.ts
export const a = 2;
```
""")
        self.assertTrue(any("expect mismatch" in s for s in skipped),
                        skipped)

    def test_string_literal_filepath_survives(self):
        # 文字列リテラル中の "filepath: ..." は目印ではない。
        # 行を消すと適用側・オラクル側の両方でコードが欠落し、
        # expect が欠落を検出できなくなる（codex 指摘）。
        _w, skipped = self._run("""```typescript apply expect path=src/a.ts
export const marker = "filepath: src/other.ts";
export const a = 1;
```
""")
        self.assertFalse(skipped, skipped)
        self.assertIn('marker = "filepath: src/other.ts"',
                      (self.target / "src/a.ts").read_text())

    def test_splice_keeps_existing_blank_lines_for_expect(self):
        # splice の行列は空行を落とすが、既存ファイルの空行は
        # 出力に復元する。落としたままだと厳密 expect が正当な
        # 断片更新まで巻き戻す（codex 指摘）。
        (self.target / "src").mkdir(parents=True, exist_ok=True)
        (self.target / "src/a.ts").write_text(
            "export const a = 1;\n\nexport const b = 2;\n")
        _w, skipped = self._run("""```typescript apply path=src/a.ts
export const b = 3;
```

```typescript expect path=src/a.ts
export const a = 1;

export const b = 3;
```
""")
        self.assertFalse(skipped, skipped)
        self.assertEqual("export const a = 1;\n\nexport const b = 3;\n",
                         (self.target / "src/a.ts").read_text())

    def test_apply_expect_final_overrides_fragment_for_new_file(self):
        # 新規ファイルで `apply` 断片の先頭行を `apply expect` の
        # 最終版が書き換えるのは正当。先頭行ゲートで弾くと
        # 中間版しか採れず契約不一致で消える（codex 指摘）。
        _w, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
```

```typescript apply expect path=src/a.ts
export const a = 2;
```
""")
        self.assertFalse(skipped, skipped)
        self.assertEqual("export const a = 2;\n",
                         (self.target / "src/a.ts").read_text())

    def test_template_literal_filepath_preserved(self):
        # テンプレートリテラル内の `// filepath:` 行は文字列の中身。
        # 剥がすと成果物の実行時値が変わるのにオラクル側も同じ行が
        # 消えて expect をすり抜ける（codex 指摘）。
        _w, skipped = self._run('''```typescript apply expect path=src/a.ts
export const message = `
// filepath: src/example.ts
hello
`;
```
''')
        self.assertFalse(skipped, skipped)
        self.assertIn("// filepath: src/example.ts",
                      (self.target / "src/a.ts").read_text())

    def test_apply_expect_replaces_existing_file(self):
        # 既存ファイルへの `apply expect` は全量置換が正当。
        # 断片用の包含率ゲートで弾くと正当な完成版が exit 3 になる
        #（codex 指摘）。
        (self.target / "src").mkdir(parents=True, exist_ok=True)
        (self.target / "src/a.ts").write_text("export const a = 1;\n")
        _w, skipped = self._run("""```typescript apply expect path=src/a.ts
export const b = 2;
```
""")
        self.assertFalse(skipped, skipped)
        self.assertEqual("export const b = 2;\n",
                         (self.target / "src/a.ts").read_text())

    def test_apply_expect_may_drop_import(self):
        # 完成版が import を削る差分も正当（最終状態の宣言なので）。
        (self.target / "src").mkdir(parents=True, exist_ok=True)
        (self.target / "src/a.ts").write_text(
            'import { x } from "./x";\n\nexport const a = 1;\n')
        _w, skipped = self._run("""```typescript apply expect path=src/a.ts
export const b = 2;
```
""")
        self.assertFalse(skipped, skipped)
        self.assertEqual("export const b = 2;\n",
                         (self.target / "src/a.ts").read_text())

    def test_backtick_inside_normal_string_does_not_open_template(self):
        # 通常の文字列内のバッククォート（`"`"`）はテンプレート開始では
        # ない。それで内側判定がずれると、本物のテンプレート内にある
        # 目印風行が剥がれて検算をすり抜ける（codex 指摘）。
        _w, skipped = self._run('''```typescript apply expect path=src/a.ts
export const tick = "`";
export const message = `
// filepath: src/example.ts
hello
`;
```
''')
        self.assertFalse(skipped, skipped)
        self.assertIn("// filepath: src/example.ts",
                      (self.target / "src/a.ts").read_text())

    def test_kansei_label_inside_template_preserved(self):
        # テンプレート内の `// 完成版:` 行も文字列の中身。
        # 剥がすと成果物が変わるのにオラクル側も同じ行が消える
        #（codex 指摘）。
        _w, skipped = self._run('''```typescript apply expect path=src/a.ts
export const message = `
// 完成版: keep this text
hello
`;
```
''')
        self.assertFalse(skipped, skipped)
        self.assertIn("// 完成版: keep this text",
                      (self.target / "src/a.ts").read_text())

    def test_tilde_fence_expect_is_verified(self):
        # `~~~` フェンスも lint と同じく契約として解釈する。
        # runner だけが読み落とすと不一致の契約が検算も記録も
        # されない（codex 指摘）。
        (self.target / "src").mkdir(parents=True, exist_ok=True)
        (self.target / "src/a.ts").write_text("export const a = 1;\n")
        _w, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
```

~~~typescript expect path=src/a.ts
export const a = 99;
~~~
""")
        self.assertTrue(any("expect mismatch" in s for s in skipped),
                        skipped)

    def test_triple_quoted_string_marker_preserved(self):
        # 三重引用符は通常引用符より先に判定する（先に " が掴まると
        # 残りの "" が別の文字列として消費されて外側判定がずれる）
        _w, skipped = self._run('''```python apply expect path=scripts/a.py
message = """
// filepath: src/example.ts
hello
"""
```
''')
        self.assertFalse(skipped, skipped)
        self.assertIn("// filepath: src/example.ts",
                      (self.target / "scripts/a.py").read_text())

    def test_backtick_inside_interp_string_keeps_template_open(self):
        # ${"..."} 内のバッククォートは外側テンプレートを閉じない
        body = 'export const m = `${"`"}\n// filepath: x\nhello\n`;'
        self.assertIn("// filepath: x", ad.strip_fp(body))
        self.assertIn("// filepath: x", ad._expect_body(body))

    def test_regex_backtick_does_not_open_template(self):
        # 正規表現リテラル内のバッククォートは区切りではない
        _w, skipped = self._run('''```typescript apply expect path=src/a.ts
export const tick = /`/;
export const message = `
// filepath: src/example.ts
hello
`;
```
''')
        self.assertFalse(skipped, skipped)
        self.assertIn("// filepath: src/example.ts",
                      (self.target / "src/a.ts").read_text())

    def test_slashslash_comment_with_backtick_keeps_string_markers(self):
        # 行途中コメント内のバッククォートで文字列状態が反転すると、
        # 実テンプレート内の // filepath: 行が本文とオラクルの両方から
        # 欠落したまま検算を通る（適用結果が静かに変わる）
        _w, skipped = self._run('''```tsx apply expect path=src/a.tsx
export const a = 1; // ` はテンプレートの区切り
export const message = `
// filepath: src/example.ts
hello
`;
```
''')
        self.assertFalse(skipped, skipped)
        self.assertIn("// filepath: src/example.ts",
                      (self.target / "src/a.tsx").read_text())

    def test_unclosed_expect_fence_is_still_verified(self):
        # 閉じないまま終端した expect フェンスも契約として扱う。
        # 捨てると不一致の契約が検算されずに通る
        (self.target / "src").mkdir(parents=True, exist_ok=True)
        (self.target / "src/a.ts").write_text("export const a = 1;\n")
        _w, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
```

~~~typescript expect path=src/a.ts
export const a = 99;
""")
        self.assertTrue(any("expect mismatch" in s for s in skipped),
                        skipped)

    def test_role_token_requires_standalone_word(self):
        # `meta=expect` のような属性値の語は役割ではない。
        # expect 扱いされると対象が契約として登録され、
        # apply なしの検算だけが残る
        parts, expects, invalid = ad.collect_parts(
            "```tsx meta=expect path=src/a.ts\n"
            "// filepath: src/a.ts\nexport const a = 1;\n```\n")
        self.assertEqual({}, expects)
        # path=src/expect.ts の値の中の語も役割ではない
        _p2, expects2, _i2 = ad.collect_parts(
            "```ts apply path=src/expect.ts\nexport const a = 1;\n```\n")
        self.assertEqual({}, expects2)

    def test_apply_without_target_is_not_appended_to_previous(self):
        # apply を名乗るのに対象を持たないフェンスは、
        # 直前ファイルへの追記扱いにすると別ファイルへ混入する
        parts, _e, invalid = ad.collect_parts(
            "```ts apply path=src/a.ts\nexport const a = 1;\n```\n\n"
            "```ts apply\nexport const leak = 2;\n```\n")
        self.assertEqual(
            ["export const a = 1;"],
            [p.body for p in parts["src/a.ts"]])
        self.assertTrue(invalid)

    def test_completed_listing_wins_when_first_part_is_continuation(self):
        # 先頭の part が続き注記の断片でも、完成版リスティングの頭を
        # ファイルの先頭として採用できる（続き断片の頭で弾かれない）
        _w, skipped = self._run("""```ts
// filepath: src/a.ts（続き）
export const mid = 2;
```

```ts apply path=src/a.ts
export const top = 1;
export const mid = 2;
```
""")
        self.assertFalse(skipped, skipped)
        self.assertEqual("export const top = 1;\nexport const mid = 2;\n",
                         (self.target / "src/a.ts").read_text())

    def test_backtick_inside_line_comment_does_not_open_template(self):
        # `// テンプレートは ` で始まります` のようなコメント中の
        # バッククォートでテンプレートが開いてしまうと、文字列内の
        # // filepath: 行まで消える
        self.assertEqual(
            "// テンプレートは ` で始まります\n"
            "const a = `\n// filepath: x\n`;",
            ad.strip_fp(
                "// テンプレートは ` で始まります\n"
                "const a = `\n// filepath: x\n`;"))

    def test_expect_body_strips_marker_lines(self):
        # expect 本体の // filepath: / // 完成版: 行は比較対象から外れる
        _w, skipped = self._run("""```typescript apply path=src/a.ts
export const a = 1;
```

```typescript expect path=src/a.ts
// filepath: src/a.ts
// 完成版: ファイル全体
export const a = 1;
```
""")
        self.assertFalse(skipped, skipped)


class CliExitCodeTest(unittest.TestCase):
    """codex SUGGEST: CLI 終了コードを直接検証する（部分適用 = 非ゼロ）。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.target = root / "app"
        self.oracle = root / "oracle"
        self.target.mkdir(); self.oracle.mkdir()
        self.script = Path(ad.__file__).resolve()

    def tearDown(self):
        self.tmp.cleanup()

    def _cli(self, md_body: str):
        md = write(Path(self.tmp.name), "day5.md", md_body)
        import subprocess
        return subprocess.run(
            [sys.executable, str(self.script), str(md), str(self.target),
             "--oracle", str(self.oracle)],
            capture_output=True, text=True)

    def test_exit_0_on_clean_apply(self):
        r = self._cli("""```typescript
// filepath: src/a.ts
export const a = 1;
```
""")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_exit_3_on_partial_apply(self):
        write(self.target, "src/a.ts", "export const a = 1;\n")
        r = self._cli("""```typescript
// filepath: src/a.ts
export const a = 1;
```

```typescript
// filepath: src/ghost.ts （router の中に追加）
const g = 1;
```
""")
        # src/ghost.ts は挿入位置指示つきの断片のみ → 新規作成不可で skip → exit 3
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)

    def test_exit_3_on_expect_mismatch(self):
        write(self.target, "src/a.ts", "export const a = 1;\n")
        r = self._cli("""```typescript apply path=src/a.ts
export const a = 1;
export const b = 2;
```

```typescript expect path=src/a.ts
export const a = 1;
export const b = 99;
```
""")
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)

    def test_exit_3_when_nothing_written_but_skips(self):
        # skipped が非空なら書き込み0件でも exit 3（codex 指摘:
        # 「0件書き込み+skip → exit 2」の順序では skip 扱いと矛盾する）。
        r = self._cli("""```typescript expect path=src/b.ts
export const b = 1;
```
""")
        # expect-without-apply のみ → 書き込み0 + skip非空 → 3
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)


        # splice 成功でも置けなかった kansei 断片が skipped に残り、
        # exit 判定と ledger から漏れない
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target = root / "app"
            oracle = root / "oracle"
            target.mkdir(); oracle.mkdir()
            write(target, "src/a.ts",
                  "export const a = 1;\nexport const b = 2;\n"
                  "export const c = 3;\nexport const d = 4;\n")
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts
// 完成版: 追加宣言
export const missing = 5;
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            self.assertTrue(any("kansei-listing-unplaced" in x for x in s), s)


if __name__ == "__main__":
    unittest.main()
