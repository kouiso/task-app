#!/usr/bin/env python3
"""code_wrap の強制境界・縮小・意味保存の退行テスト。"""

from __future__ import annotations

import html
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from code_wrap import (  # noqa: E402
    SAFE_COLS,
    atoms,
    classify,
    unsafe_runs,
    wrap_code_in_html,
)
from inline_layout import annotate_inline_code  # noqa: E402


def pre(inner: str) -> str:
    return f'<pre class="language-tsx"><code>{inner}</code></pre>'


def copied_code(rendered: str) -> str:
    """生成HTMLをPDFでコピーした時の改行を模したコード文字列へ戻す。"""
    inner = rendered[rendered.index(">") + 1 : -len("</pre>")]
    inner = re.sub(r'<br class="cw-force">', "\n", inner)
    inner = inner.replace("<wbr>", "")
    return html.unescape(re.sub(r"<[^>]+>", "", inner))


def eval_js(source: str, expression: str):
    script = source + "\nprocess.stdout.write(JSON.stringify(" + expression + "));"
    result = subprocess.run(
        ["node", "-e", script], capture_output=True, text=True, check=True
    )
    return json.loads(result.stdout)


def ts_syntax_errors(source: str) -> list[str]:
    script = r"""
const ts = require('typescript');
const result = ts.transpileModule(process.argv[1], {
  reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
const errors = (result.diagnostics ?? [])
  .filter((item) => item.category === ts.DiagnosticCategory.Error)
  .map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n'));
process.stdout.write(JSON.stringify(errors));
"""
    result = subprocess.run(
        ["node", "-e", script, source], capture_output=True, text=True, check=True
    )
    return json.loads(result.stdout)


def ts_emit(source: str) -> str:
    """JSX子テキストを含むTypeScriptの出力値を比較する。"""
    script = r"""
const ts = require('typescript');
const result = ts.transpileModule(process.argv[1], {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
process.stdout.write(result.outputText);
"""
    result = subprocess.run(
        ["node", "-e", script, source], capture_output=True, text=True, check=True
    )
    return result.stdout


def main() -> int:
    failures: list[str] = []

    # 1. 短い行は無変換
    short = pre('<span class="token keyword">const</span> x = 1;')
    if wrap_code_in_html(short) != short:
        failures.append("短い行を書き換えてしまった")

    # 2. 長いJSX属性はclass語の間へ強制境界を入れる
    #    （vfm 出力では < は &lt; なのでテストも実体参照で書く）
    long_cls = ('&lt;div x' + 'x' * 30) + ' className="mx-auto flex ' \
        'min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10"'
    out = wrap_code_in_html(pre(long_cls))
    if '<br class="cw-force">' not in out:
        failures.append("長い className 行に折返し境界が入っていない")
    if unsafe_runs(out):
        failures.append(f"className 行に折返せないランが残る: {unsafe_runs(out)}")
    if 'f<br class="cw-force">lex' in out or 'mx<br class="cw-force">-auto' in out:
        failures.append("属性値内のclass語を分断した")

    # 3. TSのプレーン文字列は strict — 内側に強制境界を入れず縮小する
    url = 'DATABASE_URL="postgresql://user:password@localhost:25532/' \
        'taskapp?schema=public"'
    out = wrap_code_in_html(pre(url))
    if '<br class="cw-force">' in out:
        failures.append("strict な文字列の中に強制境界を入れた")
    if "cw-shrink" not in out:
        failures.append("strict な長行がフォント縮小されていない")
    if unsafe_runs(out):
        failures.append(f"URL 行に折返せないランが残る: {unsafe_runs(out)}")

    # .env は行単位ではなくブロック全体を最長行と同じ率で縮小する。
    # font-sizeが行ごとに変わるPDFではChromeコピー時に改行が消えた実測がある。
    env_source = (
        "TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskapp_test\n"
        "JWT_SECRET=test-secret\n"
        "NODE_ENV=test"
    )
    env_html = (
        '<pre class="language-env"><code>' + env_source + "</code></pre>"
    )
    env_out = wrap_code_in_html(env_html)
    if env_out.count("cw-block-shrink") != 1 or env_out.count("font-size:") != 1:
        failures.append("envブロックが最長行基準の単一font-sizeになっていない")
    if copied_code(env_out) != env_source:
        failures.append("envブロックの元改行が変化した")
    if unsafe_runs(env_out):
        failures.append(f"envブロック統一縮小をunsafeと誤判定した: {unsafe_runs(env_out)}")
    try:
        annotate_inline_code(env_out, "env-post-wrap")
    except ValueError as error:
        failures.append(f"envブロックの縮小タグが不正な入れ子になった: {error}")

    # Prism spanが改行を跨ぎ、その先頭行だけを縮小してもタグを交差させない。
    multiline_token_source = "x" * 70 + "\nshort"
    multiline_token = pre(
        '<span class="token string">' + multiline_token_source + "</span>"
    )
    multiline_out = wrap_code_in_html(multiline_token)
    if copied_code(multiline_out) != multiline_token_source:
        failures.append("複数行token spanの元textまたは改行が変化した")
    if 'class="cw-shrink" style="font-size:82%"' not in multiline_out:
        failures.append("複数行token spanの縮小率が変化した")
    if "</span>\n<span class=\"token string\">" not in multiline_out:
        failures.append("改行を跨ぐtoken spanを行境界で開き直していない")
    try:
        annotate_inline_code(multiline_out, "multiline-post-wrap")
    except ValueError as error:
        failures.append(f"複数行token spanの縮小タグが不正な入れ子になった: {error}")

    # 4. <span> 境界をまたぐ長い識別子は分断せず縮小する
    spanned = (
        '<span class="token">utils</span>'
        '<span class="token punctuation">.</span>'
        '<span class="token">project' + 'x' * 60 + '</span>'
    )
    out = wrap_code_in_html(pre(spanned))
    if '.<br class="cw-force">' in out:
        failures.append("長いメンバー名の途中へ強制境界を入れた")
    if "cw-shrink" not in out:
        failures.append("収まらないメンバーアクセス行が縮小されていない")

    # 5. 純粋な英数ランはコード領域で途中折れしない。60%未満なら残件報告
    run = "a" * (SAFE_COLS + 40)
    res_run: list[str] = []
    out = wrap_code_in_html(pre(run), res_run)
    if '<br class="cw-force">' in out:
        failures.append("英数ランの途中に強制境界を入れた")
    if not res_run:
        failures.append("縮小下限を割る英数ランが残件に挙がっていない")
    # 縮小で収まる長さなら cw-shrink になる
    run2 = "a" * (SAFE_COLS + 20)
    out2 = wrap_code_in_html(pre(run2))
    if "cw-shrink" not in out2:
        failures.append("縮小可能な英数ランが縮小されていない")

    # 6. 日本語を含む長行（2桁カウント）も unsafe にならない（コード中のWIDE）
    jp = "const x = " + "あ" * 40 + " + " + "b" * 30
    jp_res: list[str] = []
    out = wrap_code_in_html(pre(jp), jp_res)
    # 日本語もJS識別子に使える。演算子の手前で改行し、識別子自体は縮小して保つ。
    if jp_res or unsafe_runs(out) or "あ<br" in out:
        failures.append("長い日本語識別子の内部を分断した")
    # // 行コメントは strict：中で折れるとコピー時に尻尾がコード化するため、
    # 収まらなければ残件として報告される
    res: list[str] = []
    cmt = "    // " + "あ" * 60
    out = wrap_code_in_html(pre(cmt), res)
    if not res:
        failures.append("長い行コメントが残件に挙がっていない")

    # 7. 実体参照 &#x3C; を1文字として数える（桁を6倍に誤算しない）
    ent = "x" * 50 + " " + "&#x3C;" * 3 + "y"
    out = wrap_code_in_html(pre(ent))
    if unsafe_runs(out):
        failures.append(f"実体参照行に折返せないランが残る: {unsafe_runs(out)}")

    # 8. 複数行のうち長い行だけが処理され、短い行は触らない。
    #    折れ候補を持たない英数ランは縮小になる
    mixed = pre("const a = 1;\n" + "y" * 70 + "\nconst b = 2;")
    out = wrap_code_in_html(mixed)
    if "const a = 1;\n" not in out:
        failures.append("短い先行が失われた")
    if "const b = 2;" not in out:
        failures.append("短い後行が失われた")
    if "cw-shrink" not in out:
        failures.append("混在ブロックの長行が縮小されていない")

    # 9. pre 以外（本文中の <wbr> らしき文字列・code インライン）は触らない。
    #    pre 内の長い英数ランは縮小で処理される
    body = "<p>本文 <code>abc" + "d" * 70 + "</code> です</p>" + pre("e" * 70)
    out = wrap_code_in_html(body)
    if "cw-shrink" not in out:
        failures.append("pre ブロックの長行が縮小されていない")
    if "<code>abc" + "d" * 20 + "<wbr>" in out:
        failures.append("インライン code 内に <wbr> を入れてしまった")

    # 10. 波ダッシュ等の非ASCII記号は境界として扱う
    wave = "x" * 30 + " 〜〜〜〜 " + "y" * 40
    out = wrap_code_in_html(pre(wave))
    if unsafe_runs(out):
        failures.append(f"非ASCII記号行に折返せないランが残る: {unsafe_runs(out)}")

    # 11. atoms/classify の単位確認
    if atoms("a&#x3C;b") != ["a", "&#x3C;", "b"]:
        failures.append(f"atoms の分解がおかしい: {atoms('a&#x3C;b')}")
    if classify("&#x3C;") != "PUNCT":
        failures.append("&#x3C; が PUNCT と見なせていない")
    if classify("あ") != "WIDE":
        failures.append("日本語が WIDE と見なせていない")

    # 12. 改行を含む pre で行またぎの誤判定がない
    twoline = pre("short\n" + "z" * 70)
    out = wrap_code_in_html(twoline)
    if unsafe_runs(out):
        failures.append(f"2行ブロックに折返せないランが残る: {unsafe_runs(out)}")

    # 13. 複数行JSX：<div が前行にあっても className は属性値と判定される
    jsx = pre(
        "&lt;div\n"
        '  className="flex items-center gap-3 rounded-md px-3 py-2 '
        'text-sm transition-colors hover:bg-accent"'
    )
    out = wrap_code_in_html(jsx)
    if unsafe_runs(out):
        failures.append(f"複数行JSXに折返せないランが残る: {unsafe_runs(out)}")
    if "cw-shrink" in out:
        failures.append("複数行JSX属性が縮小扱いになってしまった")

    # 14. {/* */} ブロックコメントは空白・CJK位置で折れる（strictにしない）
    bcom = pre(
        "x = 1\n"
        "    {/* filepath: src/component/task/task-detail-dialog.tsx"
        "（同じファイルの続き。ここに長い説明が続く） */}"
    )
    res2: list[str] = []
    out = wrap_code_in_html(bcom, res2)
    if res2:
        failures.append(f"ブロックコメントが残件化した: {res2}")
    if unsafe_runs(out):
        failures.append(f"ブロックコメントに折返せないランが残る: {unsafe_runs(out)}")

    # 15. テンプレート本文は実改行で値が変わるため、強制改行しない
    tpl = pre(
        "      ? `${formatDateOnly(reportData.startDate)}"
        " - ${formatDateOnly(reportData.endDate)}`"
    )
    res3: list[str] = []
    out = wrap_code_in_html(tpl, res3)
    if "alpha<br" in out or "formatDateOnly<br" in out:
        failures.append("テンプレート本文へ強制改行を入れた")

    # 16. bash は行指向：行内に強制境界を入れず、長行は縮小で収める
    bash_pre = (
        '<pre class="language-bash"><code>'
        'git remote add origin https://github.com/your-user/task-app.git'
        "</code></pre>"
    )
    out = wrap_code_in_html(bash_pre)
    if '<br class="cw-force">' in out:
        failures.append("bash 行内に強制境界を入れた")
    if "cw-shrink" not in out:
        failures.append("bash 長行が縮小されていない")
    if unsafe_runs(out):
        failures.append(f"bash 行に折返せないランが残る: {unsafe_runs(out)}")

    # 17. ASI: `return`・`throw` とoperandの間へ強制境界を入れない。
    #    `return\nexpr` は ASI で `return; expr` になり意味が変わる
    asi = pre(
        "      return ctx.db.task.findMany({ where: { id: taskId }, "
        "include: { project: true } });"
    )
    out = wrap_code_in_html(asi)
    if 'return <br class="cw-force">' in out:
        failures.append("return 直後に強制境界が入った")
    if unsafe_runs(out):
        failures.append(f"return 行に折返せないランが残る: {unsafe_runs(out)}")
    thr = pre(
        '      throw new TRPCError({ code: "FORBIDDEN", message: '
        '"プロジェクトのメンバーではありません" });'
    )
    out = wrap_code_in_html(thr)
    if 'throw <br class="cw-force">' in out:
        failures.append("throw 直後に強制境界が入った")
    if unsafe_runs(out):
        failures.append(f"throw 行に折返せないランが残る: {unsafe_runs(out)}")
    # `foo.return` はメンバーアクセスなので ASI 対象外（折ってよい）
    mem = pre(
        "      const result = obj.return + "
        "somethingElse.veryLongPropertyNameAndMore"
    )
    out = wrap_code_in_html(mem)
    if unsafe_runs(out):
        failures.append(f"メンバー return 行に折返せないランが残る: {unsafe_runs(out)}")

    # 18. break-all は <wbr> を優先しない。CSS と JSX 属性値は実改行しても
    #     構文・値を保つ空白だけを強制境界にし、58桁超を残さない。
    css_line = (
        '<pre class="language-css"><code>'
        "  --color-destructive-foreground: hsl(var(--destructive-foreground));"
        "</code></pre>"
    )
    css_out = wrap_code_in_html(css_line)
    if '<br class="cw-force">' not in css_out or unsafe_runs(css_out):
        failures.append("CSS宣言が安全な空白で強制改行されていない")
    jsx_line = pre(
        '&lt;div className="mx-auto flex min-h-screen max-w-6xl flex-col '
        'px-6 py-8 lg:px-10 items-center justify-between"&gt;'
    )
    jsx_out = wrap_code_in_html(jsx_line)
    if '<br class="cw-force">' not in jsx_out or unsafe_runs(jsx_out):
        failures.append("JSX属性がclass語の間で強制改行されていない")
    if "items-<br" in jsx_out or "center<br" in jsx_out:
        failures.append("JSX class語の内部へ強制改行を入れた")

    # 19. <wbr> は強制境界ではないため、これだけで gate を通してはいけない。
    wbr_only = pre("a" * 30 + "<wbr>" + "b" * 30)
    if not unsafe_runs(wbr_only):
        failures.append("unsafe_runs が wbr を語中分断防止の保証と誤認した")

    # 20. 実改行で値・制御フローが変わる4反例。生成結果を実際に Node で評価する。
    value_cases = [
        (
            "template",
            "const s = `alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi`;",
            "s",
            "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi",
        ),
        (
            "template-expression",
            "const header = 'head'; const parts = ['x', 'body']; "
            "const replacement = 'R'; const signature = 'signature-value'; "
            "const s = `${header}.${parts[1]}.${replacement}${signature.slice(1)}`;",
            "s",
            "head.body.Rignature-value",
        ),
        (
            "regexp",
            "const r = /alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu/;",
            'r.test("alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu")',
            True,
        ),
        (
            "return-block-comment",
            "function f() { return /* alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu */ 7; }",
            "f()",
            7,
        ),
        (
            "return-consecutive-block-comments",
            "function f() { return /* short */ /* alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu */ 7; }",
            "f()",
            7,
        ),
        (
            "regexp-after-block-comment",
            "const r = /* short */ /alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu/;",
            'r.test("alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu")',
            True,
        ),
        (
            "return-tab",
            "function f() { return\t" + "x" * 60 + "; } const " + "x" * 60 + " = 7;",
            "f()",
            7,
        ),
        (
            "arrow",
            "const f = (aVeryLongParameterNameThatPushesTheArrowPastTheSafeColumn) "
            "=> aVeryLongParameterNameThatPushesTheArrowPastTheSafeColumn;",
            "f(7)",
            7,
        ),
        (
            "escaped-single",
            "const value = 'it\\'s alpha beta gamma delta epsilon zeta eta theta';",
            "value",
            "it's alpha beta gamma delta epsilon zeta eta theta",
        ),
        (
            "escaped-double",
            'const value = "a \\"quote\\" alpha beta gamma delta epsilon zeta eta theta";',
            "value",
            'a "quote" alpha beta gamma delta epsilon zeta eta theta',
        ),
        (
            "escaped-template",
            "const value = `a \\`literal\\` alpha beta gamma delta epsilon zeta eta theta`;",
            "value",
            "a `literal` alpha beta gamma delta epsilon zeta eta theta",
        ),
        (
            "postfix-increment",
            "let n = 1;" + " " * 45 + "n ++;",
            "n",
            2,
        ),
        (
            "postfix-decrement",
            "let n = 2;" + " " * 45 + "n --;",
            "n",
            1,
        ),
        (
            "return-adjacent-string",
            'function f() { return"alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu"; }',
            "f()",
            "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu",
        ),
        (
            "regexp-after-if",
            "let ok = false; if (true) /alpha beta gamma delta epsilon zeta eta theta iota kappa lambda/.test('x');",
            "ok",
            False,
        ),
        (
            "unicode-escaped-identifier",
            "const prefix = 1; const \\u0061VeryVeryVeryVeryVeryVeryVeryVeryVeryLongName = 7;",
            "aVeryVeryVeryVeryVeryVeryVeryVeryVeryLongName",
            7,
        ),
        (
            "postfix-after-comment",
            "let n = 1; n /* alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu */ ++;",
            "n",
            2,
        ),
        (
            "arrow-after-comment",
            "const f = (value) /* alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu */ => value;",
            "f(7)",
            7,
        ),
        (
            "numeric-exponent",
            "const n = 1e+" + "2" * 45 + ";",
            "n",
            None,
        ),
        (
            "hashbang",
            "#!/usr/bin/env node alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu\nconst n = 7;",
            "n",
            7,
        ),
    ]
    for name, source, expression, expected in value_cases:
        rendered = wrap_code_in_html(pre(source))
        try:
            actual = eval_js(copied_code(rendered), expression)
        except (subprocess.CalledProcessError, json.JSONDecodeError) as error:
            failures.append(f"{name} のコピー後コードを評価できない: {error}")
            continue
        if actual != expected:
            failures.append(f"{name} の実値が変化した: {actual!r} != {expected!r}")

    # 21. TypeScript固有のno-line-terminator位置を保つ。
    ts_cases = [
        "    const targetProjectId = isProjectChanging ? "
        "(data.projectId as string) : existingTask.projectId;",
        "const obj = { [field]: { contains: keyword, mode: 'insensitive' "
        "satisfies Prisma.QueryMode } };",
        "const n = 1;" + " " * 37 + "const y = n !;",
        "const n: number | undefined = 1; const y = n "
        "/* alpha beta gamma delta epsilon zeta eta theta */ !;",
        "class C { field /* alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu */ !: string; }",
    ]
    for source in ts_cases:
        rendered = wrap_code_in_html(pre(source))
        errors = ts_syntax_errors(copied_code(rendered))
        if errors:
            failures.append(f"TypeScript強制改行で構文が変化した: {errors}")

    # SQLは教材で未使用で、文字列文法を網羅していない。強制改行対象から外し、
    # E文字列・dollar quoteの値を変えず縮小または残余failへ倒す。
    for source in [
        "SELECT E'alpha beta gamma delta epsilon zeta eta theta iota kappa mu';",
        "SELECT $msg$alpha beta gamma delta epsilon zeta eta theta iota kappa mu$msg$;",
    ]:
        sql_html = f'<pre class="language-sql"><code>{html.escape(source)}</code></pre>'
        rendered = wrap_code_in_html(sql_html)
        if '<br class="cw-force">' in rendered or copied_code(rendered) != source:
            failures.append("未対応SQL文字列へ強制改行を入れた")

    # 22. JSX子テキストでは空白・改行が表示文字列を変える。実教材で起きた
    #     `/> 編集` の先頭空白消失と `URL（任意）` への空白混入を防ぐ。
    jsx_text_cases = [
        "                      <Pencil className=\"mr-2 h-4 w-4\" /> 編集",
        "                      <Label>アバターURL（任意）</Label>",
        """<Button>
  {archived ? (
    <>
      <ArchiveRestore className="mr-2 h-4 w-4" /> アーカイブ解除
    </>
  ) : null}
</Button>""",
    ]
    for index, source in enumerate(jsx_text_cases):
        language = "tsx" if index == 0 else "typescript"
        rendered = wrap_code_in_html(
            f'<pre class="language-{language}"><code>{html.escape(source)}</code></pre>'
        )
        copied = copied_code(rendered)
        if ts_emit(copied) != ts_emit(source):
            failures.append(f"JSX子テキストの実値が変化した: {copied!r}")

    strict_attribute = (
        'const value = <div title="alpha beta gamma delta epsilon zeta eta '
        'theta iota kappa lambda" />;'
    )
    rendered = wrap_code_in_html(pre(html.escape(strict_attribute)))
    if ts_emit(copied_code(rendered)) != ts_emit(strict_attribute):
        failures.append("className以外のJSX属性値へ実改行を入れた")

    # 23. JSX式属性の波括弧やtemplate補間でタグ状態を失わない。型引数の
    #     `<T,>` もJSX開始と誤認せず、後続classNameの安全な空白で折る。
    jsx_state = """const identity = <T,>(value: T) => value;
const view = (
  <div
    style={{ borderLeft: `3px solid ${identity(color)}` }}
  >
    <span className="flex items-center justify-center rounded-lg transition-colors text-muted-foreground">
      {identity(label)}
    </span>
  </div>
);"""
    residuals: list[str] = []
    rendered = wrap_code_in_html(pre(html.escape(jsx_state)), residuals)
    if residuals or unsafe_runs(rendered):
        failures.append(f"JSX属性式の後でタグ状態が漏れた: {residuals}")
    if (
        '<br class="cw-force">rounded-lg transition-colors' not in rendered
    ):
        failures.append("JSX属性式の後続classNameを安全な空白で折れなかった")

    if failures:
        print(f"❌ {len(failures)} 件失敗")
        for failure in failures:
            print(f"  {failure}")
        return 1
    print("✅ code_wrap 全回帰ケース通過")
    return 0


if __name__ == "__main__":
    sys.exit(main())
