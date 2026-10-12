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
        _res, gaps = ad.splice_parts(cur, cur, parts, base, "src/a.ts", "d1")
        new = _res[1] if _res else None
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
        _res, _gaps = ad.splice_parts(cur, cur, parts, cur, "src/a.ts", "d1")
        new = _res[1] if _res else None
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
        _res, _gaps = ad.splice_parts(cur, cur, parts, cur, "src/a.ts", "d1")
        new = _res[1] if _res else None
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
        _res, _gaps = ad.splice_parts(cur, cur, parts, cur, "src/a.ts", "d1")
        new = _res[1] if _res else None
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
        _res2, _ = ad.splice_parts(cur, cur, parts2, cur, "src/a.ts", "d1")
        new2 = _res2[1] if _res2 else None
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
        _res, _gaps = ad.splice_parts(cur, cur, parts, cur, "next.config.ts", "d30")
        new = _res[1] if _res else None
        self.assertIsNotNone(new)
        joined = "\n".join(new)
        # 内側 headers 配列の `],` 直前に要素が入る（外側 return 配列ではない）
        b_idx = joined.index("{ key: 'B', value: 'b' },")
        a_idx = joined.index("{ key: 'A', value: 'a' },")
        close_idx = joined.index("        ],")
        self.assertTrue(a_idx < b_idx < close_idx)

    def test_splice_success_gaps_reach_skipped(self):
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


class Issue630Fixes(unittest.TestCase):
    def test_string_literal_ws_change_not_treated_as_applied(self):
        # "a b" → "ab" のように文字列リテラル内の空白差だけが違う断片を
        # ブロブ照合が適用済みと誤認しない
        cur = ["const msg = 'a b';"]
        parts = [ad.Part(
            cont=False, body="const msg = 'ab';",
            kansei=False, unmarked=False, prose="",
            directive=None)]
        _res, _gaps = ad.splice_parts(cur, cur, parts, cur, "src/a.ts", "d1")
        new = _res[1] if _res else None
        # oracle=cur なので oracle_anchor/positional_splice 等が置き換え経路を
        # 探す。適用済み誤認でスキップされなければ 'ab' が入る
        self.assertIsNotNone(new)
        self.assertIn("'ab'", "\n".join(new))

    def test_insert_past_multiline_import_not_inside(self):
        # `import {` が複数行に跨る時、その途中ではなく文の末尾へ挿入する
        cur = [
            "import {",
            "  A,",
            "  B,",
            "} from 'lib';",
            "",
            "export const x = 1;",
        ]
        fl = ["import { C } from 'other';"]
        new = ad.replace_import(cur, fl)
        joined = "\n".join(new)
        imp_idx = joined.index("import { C } from 'other';")
        from_idx = joined.index("} from 'lib';")
        self.assertTrue(imp_idx > from_idx)

    def test_splice_writes_verbatim_fragment(self):
        # 書き込みは正規化行ではなく教材原文を使う。
        # テンプレート内の空行・行末空白が消えないこと
        body = "const t = `head\n\n  indented line  \ntail`;"
        parts = [ad.Part(
            cont=False, body=body,
            kansei=False, unmarked=False, prose="",
            directive=ad.Directive("append_end", ()))]
        _res, _gaps = ad.splice_parts(["const a = 1;"], ["const a = 1;"], parts,
                                     ["const a = 1;"], "src/a.ts", "d1")
        new = _res[1] if _res else None
        self.assertIsNotNone(new)
        joined = "\n".join(new)
        self.assertIn("head\n\n  indented line  \ntail", joined)

    def test_blob_keeps_multiline_template_whitespace(self):
        # テンプレートリテラルは行を跨ぐ。行ごとに引用状態をリセットすると
        # 継続行の空白が潰れて「適用済み」を誤認する（issue #630）
        lines = ["const t = `head", "  a   b  ", "tail`;", "const x = 1;"]
        blob = ad._norm_blob(lines)
        # テンプレート内の改行も中身なので行末に残る
        self.assertEqual(blob[1], "  a   b  \n")
        self.assertEqual(blob[3], "constx=1;")

    def test_insert_past_comment_semicolon_in_import(self):
        # 複数行 import 内の `// keep A;` のようなコメント末尾の ';' で
        # 文末判定を誤ってはいけない
        cur = [
            "import {",
            "  A,",
            "  // keep A;",
            "} from 'lib';",
            "",
            "export const x = 1;",
        ]
        fl = ["import { C } from 'other';"]
        new = ad.replace_import(cur, fl)
        joined = "\n".join(new)
        self.assertTrue(
            joined.index("import { C } from 'other';")
            > joined.index("} from 'lib';"))

    def test_insert_past_import_attribute_block(self):
        # `import ... from 'x' with { ... };` の属性ブロック途中にも入らない
        cur = [
            "import data from './d.json' with {",
            "  type: 'json'",
            "};",
            "export const x = 1;",
        ]
        fl = ["import { C } from 'other';"]
        new = ad.replace_import(cur, fl)
        joined = "\n".join(new)
        self.assertTrue(
            joined.index("import { C } from 'other';") > joined.index("};"))

    def test_apply_day_preserves_existing_whitespace(self):
        # splice は無関係な箇所の空行・行末空白・テンプレート内空白を
        # 原文のまま残す（issue #630）
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            oracle_body = "export const a = 1;\nexport const b = 2;"
            write(oracle, "src/a.ts", oracle_body + "\n")
            dest_body = (
                "export const a = 1;\n"
                "\n"
                "export const t = `head\n"
                "\n"
                "  indented line  \n"
                "tail`;\n"
                "export const b = 2;   \n")
            write(target, "src/a.ts", dest_body)
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts（末尾に追加）
export const c = 3;
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertIn("export const c = 3;", body)
            self.assertIn("export const a = 1;\n\nexport const t = `head\n\n  indented line  \ntail`;\nexport const b = 2;   \n", body)

    def test_verbatim_different_fragment_repairs_baseline(self):
        # 正規化済みでは一致するが原文が違う断片（空行の欠落等）は
        # 「適用済み」とせず原文へ修復する（issue #630）
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            oracle_body = "export const a = 1;\n\nexport const b = 2;"
            write(oracle, "src/a.ts", oracle_body + "\n")
            write(target, "src/a.ts", "export const a = 1;\nexport const b = 2;\n")
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts
export const a = 1;

export const b = 2;
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertIn("export const a = 1;\n\nexport const b = 2;", body)
            self.assertEqual(body.count("export const b = 2;"), 1)

    def test_squash_keeps_literal_whitespace(self):
        # _squash はコード側の空白だけ潰し、リテラル中身は保持する。
        # _oracle_pos 等の照合でリテラル入り行が oracle と不一致になるのを防ぐ
        self.assertEqual(ad._squash("  x = 'a b';"), "x='a b';")
        self.assertEqual(ad._squash("if (a && b)"), "if(a&&b)")
        self.assertEqual(ad._squash(""), "")

    def test_oracle_pos_matches_wrapped_fragment_line(self):
        # oracle が1行表記・断片が複数行表記でも、断片行が oracle 行の
        # 部分文字列として見つかれば位置を返す（day20 app-layout 型）
        base = ad.norm("""export function L() {
  const menuItems = [
    { text: 'a', icon: <A className="h-5 w-5" />, path: '/a' },
    { text: '検索', icon: <Search className="h-5 w-5" />, path: '/search' },
  ];
}
""".split("\n"))
        fl = ["  {", "    text: '検索',",
              '    icon: <Search className="h-5 w-5" />,',
              "    path: '/search',", "  },"]
        self.assertGreaterEqual(ad._oracle_pos(base, fl), 0)

    def test_literal_fragment_insert_needs_expression_container(self):
        # 裸 `{...}` 断片の文レベル挿入は構文エラーになるため拒否する
        cur = ad.norm("""interface MenuItem {
  text: string;
}
const menuItems = [
  { text: 'a' },
];
""".split("\n"))
        frag = ["{", "  text: '検索',", "},"]
        # interface 直後の文位置（index 3）は拒否
        self.assertFalse(ad._literal_fragment_insert_ok(cur, frag, 3))
        # 配列内（index 5）は許可
        self.assertTrue(ad._literal_fragment_insert_ok(cur, frag, 5))

    def test_literal_fragment_insert_ok_inside_implicit_return_jsx(self):
        # `() => <div>` のような括弧なし暗黙 return JSX の内側では、
        # `{` 始まり断片は式コンテナに入るので許可する（issue #630）
        cur = ad.norm("""export function Item() {
  return <div>
    <span>x</span>
  </div>;
}
""".split("\n"))
        frag = ["{ flag && <b>y</b> }"]
        self.assertTrue(ad._literal_fragment_insert_ok(cur, frag, 3))


class Issue630ReviewFixes(unittest.TestCase):
    """PR#635 レビュー指摘の回帰テスト。

    splice_parts の直叩きではなく apply_day の実経路（md → 既存ファイル →
    ledger/skip 判定）を通す。実経路でなければ norm/raw の分離が
    担保できない（issue #630 レビュー指摘）。
    """

    def test_import_insert_ends_at_code_semicolon(self):
        # 複数行 import 内のコメント `// keep A;` や文字列内の `;`、
        # 動的 `import(` を終端と誤認しない
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts",
                  "import { A } from 'lib';\nexport const x = 1;\n")
            write(target, "src/a.ts", (
                "import {\n"
                "  A,\n"
                "  // keep A;\n"
                "  B,\n"
                "} from 'lib';\n"
                "\n"
                "export const v = import('./lazy');\n"
                "export const x = 1;\n"))
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts（import群に追加）
import { C } from 'other';
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            # `} from 'lib';` の後かつ動的 import 行より前に入る
            self.assertTrue(
                body.index("import { C } from 'other';")
                > body.index("} from 'lib';"), body)
            self.assertTrue(
                body.index("import { C } from 'other';")
                < body.index("export const v"), body)
            self.assertIn("// keep A;", body)

    def test_import_insert_after_require_without_semicolon(self):
        # `import x = require('y')` は ';' が無くてもその行が文の終端。
        # EOF まで読み進めて次の文の後へ入ったり gap 化したりしない
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts", "import x = require('y');\n")
            write(target, "src/a.ts", "import x = require('y')\n")
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts（import群に追加）
import { C } from 'other';
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertEqual(
                body, "import x = require('y')\n"
                      "import { C } from 'other';\n", body)

    def test_import_insert_unclosed_import_is_gap(self):
        # 閉じない複数行 import が末尾にある時、終端をでっち上げず
        # gap 扱いにしてファイルを書き換えない
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts", "import { A } from 'lib';\n")
            write(target, "src/a.ts",
                  "import { A } from 'lib';\nimport {\n  B,\n")
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts（import群に追加）
import { C } from 'other';
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertNotIn("import { C }", body)
            self.assertEqual(
                body, "import { A } from 'lib';\nimport {\n  B,\n")

    def test_fragment_inside_block_comment_not_treated_as_applied(self):
        # /* */ 内に置かれた断片と同じ行があっても「適用済み」とせず、
        # 実際のコード位置へ書き込む
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts", "export const x = 0;\n")
            write(target, "src/a.ts", (
                "/* 完成版サンプル\n"
                "export const a = 1;\n"
                "export const b = 2;\n"
                "*/\n"
                "export const x = 0;\n"))
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts（末尾に追加）
export const a = 1;
export const b = 2;
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            # コメント内の1件 + 実際に適用された1件
            self.assertEqual(body.count("export const a = 1;"), 2, body)
            self.assertTrue(
                body.rindex("export const a = 1;")
                > body.index("export const x = 0;"), body)

    def test_interstitial_blank_lines_preserved_on_insert(self):
        # 維持される行と行の間にある空行が、断片挿入で消えない
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts",
                  "export const a = 1;\n\nexport const b = 2;\n")
            write(target, "src/a.ts", (
                "export const a = 1;\n"
                "\n"
                "\n"
                "export const b = 2;\n"))
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts（export const a = 1 の直後に追加）
export const c = 3;
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertIn(
                "export const a = 1;\nexport const c = 3;\n\n\n"
                "export const b = 2;", body)

    def test_closers_fragment_lands_after_written_fragment(self):
        # last_end は「書き込んだ側」の行数で進める。norm 後の長さを使うと
        # 断片内部の空行分ずれて閉じ断片が断片途中へ入る（issue #630）
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts", "export const a = 1;\n")
            # 前日までの適用途中で `}` がまだ閉じていない中間状態
            write(target, "src/a.ts", (
                "export const a = 1;\n"
                "export function f() {\n"
                "  return 1;\n"))
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts（末尾に追加）
  // note

  const z = 1;
```
```typescript
// filepath: src/a.ts
}
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertIn(
                "// note\n\n  const z = 1;\n}", body)

    def test_splice_inside_template_preserves_blank_lines(self):
        # テンプレートリテラルの中身（空行・行末空白）はコード行ではないため、
        # その直前に断片が挿入されても原文を保つ
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts",
                  "export const a = 1;\nexport const b = 2;\n")
            write(target, "src/a.ts", (
                "export const a = 1;\n"
                "export const t = `head\n"
                "\n"
                "  spaced   \n"
                "tail`;\n"
                "export const b = 2;\n"))
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts（export const a = 1 の直後に追加）
export const c = 3;
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertIn(
                "export const a = 1;\nexport const c = 3;\n"
                "export const t = `head\n\n  spaced   \ntail`;\n"
                "export const b = 2;", body)

    def test_blob_keeps_template_state_across_interpolated_string(self):
        # `${"a b"}` の内側の文字列が閉じた後も外側のテンプレート状態を保つ。
        # 失うと残りのテンプレート文字列の空白がコード扱いで潰れる
        blob = ad._norm_blob(['const t = `head ${"a b"} x y`;'])
        self.assertEqual(blob, ['constt=`head ${"a b"} x y`;'])
        blob = ad._norm_blob(["const t = `a ${f(`in ${'q r'} s`)} t u`;"])
        self.assertEqual(blob, ["constt=`a ${f(`in ${'q r'} s`)} t u`;"])

    def test_template_text_change_after_interpolation_is_applied(self):
        # 補間内の文字列の後ろにあるテンプレート文字列の空白差を
        # 「適用済み」と誤認して書き換えを飛ばさない
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts", "export const a = 1;\n")
            write(target, "src/a.ts", (
                "export const a = 1;\n"
                'export const t = `head ${"a b"} x y`;\n'))
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts
export const t = `head ${"a b"} xy`;
```
""")
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertIn('export const t = `head ${"a b"} xy`;', body)
            self.assertNotIn("x y`", body)

    def test_replace_keeps_fragment_raw_after_unchanged_first_line(self):
        # 先頭行が既存宣言と同じでも、後続の変更行は断片原文
        # （テンプレート内の空行・行末空白）で書き込む
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts", "export const a = 1;\n")
            write(target, "src/a.ts", (
                "export const a = 1;\n"
                "export const t = `head\n"
                "old\n"
                "tail`;\n"))
            md = write(root, "day.md", (
                "```typescript\n"
                "// filepath: src/a.ts\n"
                "export const t = `head\n"
                "\n"
                "  new  \n"
                "tail`;\n"
                "```\n"))
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertEqual(
                body, "export const a = 1;\n"
                      "export const t = `head\n\n  new  \ntail`;\n", body)

    def test_replace_does_not_double_blank_lines_inside_fragment(self):
        # 置き換えで消える既存行の前の空行と断片側の空行を重ねて書かない。
        # 重ねるとテンプレート文字列に改行が増える
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts", "export const a = 1;\n")
            write(target, "src/a.ts", (
                "export const a = 1;\n"
                "export const t = `head\n"
                "\n"
                "old\n"
                "tail`;\n"))
            md = write(root, "day.md", (
                "```typescript\n"
                "// filepath: src/a.ts\n"
                "export const t = `head\n"
                "\n"
                "  new  \n"
                "tail`;\n"
                "```\n"))
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertEqual(
                body, "export const a = 1;\n"
                      "export const t = `head\n\n  new  \ntail`;\n", body)

    def test_template_newline_change_is_applied(self):
        # テンプレート内の改行の有無は文字列の中身の違い。
        # 空白無視ブロブ照合で「適用済み」として飛ばさない
        self.assertNotEqual(
            "".join(ad._norm_blob(["const t = `a", "b`;"])),
            "".join(ad._norm_blob(["const t = `ab`;"])))
        self.assertNotEqual(
            "".join(ad._norm_blob(["const t = `a", "", "b`;"])),
            "".join(ad._norm_blob(["const t = `a", "b`;"])))
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            write(oracle, "src/a.ts", "export const a = 1;\n")
            write(target, "src/a.ts",
                  "export const a = 1;\nexport const t = `ab`;\n")
            md = write(root, "day.md", (
                "```typescript\n"
                "// filepath: src/a.ts\n"
                "export const t = `a\n"
                "b`;\n"
                "```\n"))
            _w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            body = (target / "src/a.ts").read_text()
            self.assertEqual(
                body, "export const a = 1;\nexport const t = `a\nb`;\n", body)

    def test_core_match_repair_does_not_insert_meta_comment(self):
        # 先頭の位置指示コメントを除いた本体が既存と一致する修復経路では、
        # 教材用のコメント行をファイルへ持ち込まない
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            target, oracle = root / "app", root / "oracle"
            # 断片がファイル全体を覆うと listing 書き込みになるため、
            # splice 経路を通すよう断片外の行を置く
            rest = "export function helper() {\n  return 42;\n}\n"
            write(oracle, "src/a.ts",
                  "export const a = 1;\n\nexport const b = 2;\n" + rest)
            write(target, "src/a.ts",
                  "export const a = 1;\nexport const b = 2;\n" + rest)
            md = write(root, "day.md", """```typescript
// filepath: src/a.ts
// b を a の直後に追加
export const a = 1;

export const b = 2;
```
""")
            w, s = ad.apply_day(md, target, oracle_dir=oracle, tag="d1")
            self.assertEqual(w, ["SPLICE src/a.ts (1 parts)"])
            body = (target / "src/a.ts").read_text()
            self.assertEqual(
                body, "export const a = 1;\n\nexport const b = 2;\n" + rest,
                body)

    def test_element_region_maps_each_hit_to_one_line(self):
        # 一致行ごとに1つの oracle 行だけを記録する。以降の全行を
        # 記録すると領域終端がファイル末尾になり、無関係な祖先要素を選ぶ
        base = ad.norm("""export function L() {
  return (
    <ul>
      <li className="item-one-long-class">
        <span>first label text here</span>
      </li>
      <li className="item-two-long-class">
        <span>second label text here</span>
        <em>second extra text here</em>
      </li>
    </ul>
  );
}
export const trailingDeclarationOne = 1;
export const trailingDeclarationTwo = 2;
""".split("\n"))
        cur = ad.norm("""export function L() {
  return (
    <ul>
      <li className="item-one-long-class">
        <span>first label text here</span>
      </li>
      <li className="item-two-long-class">
        <span>second label text here</span>
        <em>old extra text</em>
      </li>
    </ul>
  );
}
export const trailingDeclarationOne = 1;
export const trailingDeclarationTwo = 2;
""".split("\n"))
        fl = ad.norm("""      <li className="item-two-long-class">
        <span>second label text here</span>
        <em>second extra text here</em>
      </li>""".split("\n"))
        res = ad.element_region_replace(cur, base, fl)
        self.assertEqual(res, base)


if __name__ == "__main__":
    unittest.main()
