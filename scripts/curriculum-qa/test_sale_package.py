#!/usr/bin/env python3
"""sale_package.py の退行テスト。

見張るのは1点。「scaffold が読者へ配るファイル」の一覧が、実際の配布物より
狭くなっていないこと。狭いと、読者の手元に確かに在るファイルを
check_zip_reference が「ZIP に無い照合先」として弾き、check_tag_balance が
配布済みの中身を無視して断片だけの収支を数える。どちらも誤検知になる。

一覧は build-zip.sh と scaffold-from-scratch.sh の2本から決まる。片方を触った人が
この表を直し忘れても、ここで止まる。

期待値は配布宣言そのもの（build-zip.sh の bash 配列と scaffold-from-scratch.sh の
`cp` 行）から組み立て直す。sale_package.py の対応表を読んで期待値を作ると、
表に載っていないコピー先は期待値にも現れないので、登録漏れが自分自身と一致して
合格する。既に登録済みのディレクトリへコピー先が1つ増えた場合がまさにそれで、
以前の書き方ではその増分をどこも見ていなかった。
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sale_package import (  # noqa: E402
    REPO_ROOT,
    comparable_src_paths,
    excluded_routers,
    scaffold_src_paths,
    uncovered_scaffold_dirs,
    zip_scaffold_dirs,
    zip_top_level,
)

SCRIPTS = REPO_ROOT / "scripts"
BUILD_ZIP = SCRIPTS / "build-zip.sh"
SCAFFOLD = SCRIPTS / "scaffold-from-scratch.sh"

# scaffold-from-scratch.sh の `cp` 行から配布先を読むための最小限の構文。
# 変数は `local x="${script_dir}/_dir"` の1形式しか使われていないので、
# その代入だけを覚えて `"$x"` `"${x}"` を差し戻す。
ASSIGN = re.compile(r'^\s*(?:local\s+)?([A-Za-z_]\w*)="(\$\{script_dir\}/[^"]+)"')
FOR_IN = re.compile(r'^\s*for\s+([A-Za-z_]\w*)\s+in\s+"([^"]+)"(/\S*)?\s*;\s*do')
SKIP_CASE = re.compile(r"^\s*([\w.|]+)\)\s*continue\s*;;")
CP_LINE = re.compile(r'^\s*cp\s+(?:-\w+\s+)*(\S+|"[^"]+")(/\S+)?\s+(\S+|"[^"]+")')
VAR_REF = re.compile(r'\$\{?([A-Za-z_]\w*)\}?')


def _unquote(s: str) -> str:
    return s[1:-1] if len(s) >= 2 and s[0] == '"' and s[-1] == '"' else s


def declared_copies() -> set[str]:
    """scaffold-from-scratch.sh の `cp` 行が置く配布先を、実ファイルへ展開して返す。

    build-zip.sh が ZIP へ入れないディレクトリと、除外指定のあるルーターは落とす。
    読者の手元へ届かないものは配布先ではないためである。
    配置先がリポジトリ直下になるもの（docker-compose.yml / prisma.config.ts）も落とす。
    `src/` `prisma/` 配下だけが scaffold_src_paths() の守備範囲である。
    """
    shipped = set(re.findall(r'"(_[\w-]+)"', BUILD_ZIP.read_text(encoding="utf-8")))
    excluded = set(re.findall(r'--exclude="([^"]+)"', BUILD_ZIP.read_text(encoding="utf-8")))

    text = SCAFFOLD.read_text(encoding="utf-8")
    sources: dict[str, str] = {}
    skips: set[str] = set()
    out: set[str] = set()

    def resolve(spec: str) -> str | None:
        """`${script_dir}/_dir` `$var` を `scripts/` からの相対パスへ直す。

        覚えていない変数が残る行は、配布物のコピーではない（一時退避など）ので落とす。
        """
        # `"${script_dir}/_dir"/*.ts` のように引用符がパスの途中で閉じる書き方がある。
        # 引用符は shell の区切りでしかないので、位置を問わず落とす。
        spec = spec.replace('"', "").replace("${script_dir}/", "").replace("$script_dir/", "")
        spec = VAR_REF.sub(lambda m: sources.get(m.group(1), "\x00"), spec)
        return None if "$" in spec or "\x00" in spec else spec

    for line in text.split("\n"):
        m = ASSIGN.match(line)
        if m:
            resolved = resolve(m.group(2))
            if resolved:
                sources[m.group(1)] = resolved
            continue
        m = FOR_IN.match(line)
        if m:
            resolved = resolve(m.group(2))
            if resolved:
                sources[m.group(1)] = resolved + (m.group(3) or "")
            continue
        m = SKIP_CASE.match(line)
        if m:
            skips.update(m.group(1).split("|"))
            continue
        m = CP_LINE.match(line)
        if not m:
            continue
        src_spec = resolve(m.group(1))
        if src_spec is None:
            continue
        src_spec += m.group(2) or ""
        dest = _unquote(m.group(3))
        directory = src_spec.split("/")[0]
        if directory not in shipped or not dest.startswith(("src/", "prisma/")):
            continue
        # 除外指定は `_server-routers` にだけ掛かる。build-zip.sh の `--exclude` も
        # scaffold の `case ... continue` も、この1ディレクトリの中で書かれている。
        drop = (excluded | skips) if directory == "_server-routers" else set()
        pattern = src_spec[len(directory) + 1 :] or "*"
        for f in sorted((SCRIPTS / directory).glob(pattern)):
            if not f.is_file() or f.name in drop:
                continue
            out.add(f"{dest}{f.name}" if dest.endswith("/") else dest)
    return out

# scaffold-from-scratch.sh が名指しでコピーしていて、以前は一覧から漏れていたもの。
# copy_server_base / copy_app_base / copy_prisma_files が置く。
MUST_CONTAIN = [
    "src/app/layout.tsx",
    "src/app/providers.tsx",
    "src/app/api/trpc/[trpc]/route.ts",
    "src/server/api/root.ts",
    "src/server/api/trpc.ts",
    "src/command/seed.ts",
    "prisma/schema.prisma",
    # ディレクトリ丸ごとコピーの側。こちらは元から入っていた。
    "src/server/api/routers/_helpers/select.ts",
]

# 読者が30日かけて自分で書くルーター。配らないので、一覧に入っていてはいけない。
MUST_NOT_CONTAIN = [
    "src/server/api/routers/project.ts",
    "src/server/api/routers/task.ts",
    "src/server/api/routers/user.ts",
]


WORKFLOW = REPO_ROOT / ".github/workflows/material-gate.yml"
# Gate 4 の本体は workflow から run.sh 経由で呼ばれる phase スクリプトに移った。
# workflow だけを見ると、呼び出しも集計もそこには無いので常に赤になる。
GATE4_PHASE = REPO_ROOT / ".github/ci/phase/material-corpus.sh"


def active_lines(text: str) -> list[str]:
    """コメント行を除いた行。行頭が `#` の呼び出しは実行されないので数えない。"""
    return [line for line in text.splitlines() if not line.lstrip().startswith("#")]


def _command_text(line: str) -> str:
    """workflow の `run:` より後ろをシェル本文として返す。シェル行はそのまま。"""
    marker = "run:"
    idx = line.find(marker)
    if idx == -1:
        return line
    return line[idx + len(marker) :]


def _strip_unquoted_comment(text: str) -> str:
    """引用符の外にある `#` 以降を落とす。

    `true # bash ...` は bash を実行しない。引用符の中の `#` は引数の文字なので残す。
    """
    out: list[str] = []
    quote = ""
    for ch in text:
        if quote:
            out.append(ch)
            if ch == quote:
                quote = ""
            continue
        if ch in "'\"":
            quote = ch
            out.append(ch)
            continue
        if ch == "#":
            break
        out.append(ch)
    return "".join(out)


def _split_commands(text: str) -> list[str]:
    """引用符の外の `&&` `||` `;` でコマンドを分ける。"""
    parts: list[str] = []
    buf: list[str] = []
    quote = ""
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            buf.append(ch)
            if ch == quote:
                quote = ""
            i += 1
            continue
        if ch in "'\"":
            quote = ch
            buf.append(ch)
            i += 1
            continue
        if text.startswith("&&", i) or text.startswith("||", i):
            parts.append("".join(buf))
            buf = []
            i += 2
            continue
        if ch == ";":
            parts.append("".join(buf))
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    parts.append("".join(buf))
    return parts


def _tokenize(command: str) -> list[str]:
    """空白で語に分け、囲みの引用符は外す。引用符の中の空白は区切らない。"""
    tokens: list[str] = []
    buf: list[str] = []
    quote = ""
    for ch in command:
        if quote:
            if ch == quote:
                quote = ""
            else:
                buf.append(ch)
            continue
        if ch in "'\"":
            quote = ch
            continue
        if ch.isspace():
            if buf:
                tokens.append("".join(buf))
                buf = []
            continue
        buf.append(ch)
    if buf:
        tokens.append("".join(buf))
    return tokens


def _argv(line: str) -> list[list[str]]:
    """その行で実行される各コマンドの、プログラムと引数。

    部分文字列では `echo` や `printf` の引数、行内コメントまで呼び出しに数えてしまう。
    実際に起動する語の並びだけを見る。
    """
    text = _strip_unquoted_comment(_command_text(line))
    return [_tokenize(command) for command in _split_commands(text)]


# 本物の Gate 4 の起動。語の並びがこれと一致するときだけ配線が生きている。
_GATE4_WORKFLOW = ["bash", ".github/ci/run.sh", "material-corpus"]
_GATE4_PHASE = ["python3", "scripts/curriculum-qa/test_sale_package.py"]
_GATE4_STATUS = ["salepkg_status=$?"]


def _has_status_condition(phase: str) -> bool:
    """引用・エスケープ・置換内の語を、外側の if の条件として数えない。

    対象は現在の角括弧テストと単純・複合 if。シェル全般の構文検査ではない。
    語を引用前後で分割すると表示文字列から if が現れるため、原文の語を保つ。
    """
    commands: list[list[str]] = [[]]
    word: list[str] = []
    # 置換の内部では、外側の引用状態と単語境界を引き継がない。
    contexts = [["", "", True]]
    i = 0
    while i < len(phase):
        ch = phase[i]
        quote, closing, boundary = contexts[-1]
        if quote == "'":
            word.append(ch)
            if ch == "'":
                contexts[-1][0] = ""
            i += 1
            continue
        if ch == "\\":
            if i + 1 == len(phase):
                return False
            if phase[i + 1] != "\n":
                word.extend(phase[i:i + 2])
                contexts[-1][2] = False
            i += 2
            continue
        if not quote and ch == "#" and boundary:
            end = phase.find("\n", i)
            i = len(phase) if end == -1 else end
            continue
        if closing and ch == closing and not quote:
            word.append(ch)
            contexts.pop()
            i += 1
            continue
        if phase.startswith("$(", i) or ch == "`" or (not quote and ch == "("):
            width = 2 if phase.startswith("$(", i) else 1
            word.extend(phase[i:i + width])
            contexts[-1][2] = False
            contexts.append(["", "`" if ch == "`" else ")", True])
            i += width
            continue
        if ch in "'\"" and (not quote or ch == quote):
            contexts[-1][0] = "" if quote else ch
            contexts[-1][2] = False
            word.append(ch)
        elif quote or len(contexts) > 1:
            word.append(ch)
            if not quote:
                contexts[-1][2] = ch.isspace() or ch in ";&|()"
        elif ch.isspace() or ch in ";&|":
            if word:
                commands[-1].append("".join(word))
                word = []
            if ch == "\n" or ch in ";&|":
                commands.append([])
            contexts[-1][2] = True
        else:
            word.append(ch)
            contexts[-1][2] = False
        i += 1
    if len(contexts) != 1 or contexts[0][0]:
        return False
    if word:
        commands[-1].append("".join(word))
    condition = ["[", '"$salepkg_status"', "-ne", "0", "]"]
    in_if = False
    found = False
    for command in commands:
        if not command:
            continue
        if command[0] == "if":
            in_if = True
            found = False
            command = command[1:]
        elif command[0] == "then":
            if in_if and found:
                return True
            in_if = False
        if in_if and command == condition:
            found = True
    return False


def wiring_problems(workflow: str, phase: str) -> list[str]:
    """workflow と phase スクリプトの配線の不備を返す。空なら配線は生きている。"""
    problems: list[str] = []
    if not any(_GATE4_WORKFLOW in _argv(line) for line in active_lines(workflow)):
        problems.append("material-gate.yml が Gate 4（run.sh material-corpus）を呼んでいない")
    phase_lines = active_lines(phase)
    if not any(_GATE4_PHASE in _argv(line) and _GATE4_STATUS in _argv(line) for line in phase_lines):
        problems.append(
            "material-corpus.sh の Gate 4 が test_sale_package.py を呼び、終了コードを salepkg_status に受けていない"
        )
    if not _has_status_condition(phase):
        problems.append("test_sale_package.py の終了コードが Gate 4 の集計に入っていない")
    return problems


def check_workflow_wiring() -> tuple[int, int]:
    """この自己テストが CI からも走ること。

    check_quality.sh からしか呼ばれていないと、手元で走らせた人しか結果を見ない。
    配布物の一覧がずれたまま PR がマージされる経路がそこに残る。
    実行するだけでは足りない。終了コードを最後の集計へ入れていないと、
    赤くなっても Gate 全体は緑のまま通る。
    コメント化された呼び出しは実行されないので、コメント行は数えない。
    引用符の外の `#` より後ろも実行されない。echo や printf の引数に呼び出しの
    文字列が入っていても、起動するプログラムと引数が本物と一致しなければ数えない。
    """
    failed = 0
    for problem in wiring_problems(
        WORKFLOW.read_text(encoding="utf-8"), GATE4_PHASE.read_text(encoding="utf-8")
    ):
        failed += 1
        print(f"  ❌ {problem}")

    live_workflow = "      - run: bash .github/ci/run.sh material-corpus\n"
    live_phase = (
        "python3 scripts/curriculum-qa/test_sale_package.py || salepkg_status=$?\n"
        'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi\n'
    )
    synthetic = [
        ("生きた配線は合格", live_workflow, live_phase, 0),
        ("workflow の呼び出しをコメント化したら落ちる", "# " + live_workflow, live_phase, 1),
        (
            "phase の呼び出しをコメント化したら落ちる",
            live_workflow,
            live_phase.replace("python3", "# python3", 1),
            1,
        ),
        (
            "集計の条件式をコメント化したら落ちる",
            live_workflow,
            live_phase.replace("if [", "# if [", 1),
            1,
        ),
        (
            "phase の呼び出しを echo に置き換えたら落ちる",
            live_workflow,
            live_phase.replace(
                "python3 scripts/curriculum-qa/test_sale_package.py",
                "echo python3 scripts/curriculum-qa/test_sale_package.py",
                1,
            ),
            1,
        ),
        (
            "workflow の呼び出しを echo に置き換えたら落ちる",
            live_workflow.replace(
                "bash .github/ci/run.sh material-corpus",
                "echo bash .github/ci/run.sh material-corpus",
                1,
            ),
            live_phase,
            1,
        ),
        (
            "workflow の呼び出しを行内コメントに置いたら落ちる",
            live_workflow.replace(
                "bash .github/ci/run.sh material-corpus",
                "true # bash .github/ci/run.sh material-corpus",
                1,
            ),
            live_phase,
            1,
        ),
        (
            "phase の呼び出しを行内コメントに置いたら落ちる",
            live_workflow,
            live_phase.replace(
                "python3 scripts/curriculum-qa/test_sale_package.py || salepkg_status=$?",
                "true # python3 scripts/curriculum-qa/test_sale_package.py || salepkg_status=$?",
                1,
            ),
            1,
        ),
        (
            "workflow の呼び出しを printf の引数に置いたら落ちる",
            live_workflow.replace(
                "bash .github/ci/run.sh material-corpus",
                "printf '%s' 'bash .github/ci/run.sh material-corpus'",
                1,
            ),
            live_phase,
            1,
        ),
        (
            "phase の呼び出しを printf の引数に置いたら落ちる",
            live_workflow,
            live_phase.replace(
                "python3 scripts/curriculum-qa/test_sale_package.py || salepkg_status=$?",
                "printf '%s' 'python3 scripts/curriculum-qa/test_sale_package.py || salepkg_status=$?'",
                1,
            ),
            1,
        ),
    ]
    status_test = '[ "$salepkg_status" -ne 0 ]'
    for name, condition, expected in (
        ("集計の条件式を echo の引数に置いたら落ちる", f"echo '{status_test}'", 1),
        ("集計の条件式を printf の引数に置いたら落ちる", f"printf '%s' '{status_test}'", 1),
        ("集計の条件式が引用文字列だけなら落ちる", f"'{status_test}'", 1),
        ("if 全体が引用文字列なら落ちる", f"'if {status_test}; then exit 1; fi'", 1),
        ("if 内でも echo の引数なら落ちる", f"if echo '{status_test}'; then exit 1; fi", 1),
        (
            "複合 if の本物の条件式は合格",
            f'if [ "$terms_status" -ne 0 ] || {status_test}; then exit 1; fi',
            0,
        ),
        (
            "複合 if 内の引用文字列なら落ちる",
            f'if [ "$terms_status" -ne 0 ] || echo \'{status_test}\'; then exit 1; fi',
            1,
        ),
        ("if の後の echo の引数なら落ちる", f"if true; then echo '{status_test}'; fi", 1),
        ("集計の条件式がコメントだけなら落ちる", f"true # if {status_test}; then exit 1; fi", 1),
        ("本物の if の行末コメントは合格", f"if {status_test}; then exit 1; fi # comment", 0),
        ("コメント内の片側引用符は無視する", f"# don't count this quote\nif {status_test}; then exit 1; fi", 0),
        ("行継続した本物の OR は合格", f'if [ "$terms_status" -ne 0 ] || \\\n  {status_test}; then exit 1; fi', 0),
        (
            "複合 OR の先頭にある本物の条件式は合格",
            f'if {status_test} || [ "$terms_status" -ne 0 ]; then exit 1; fi',
            0,
        ),
        ("複合 OR の printf 引数なら落ちる", f"if true || printf '%s' '{status_test}'; then exit 1; fi", 1),
        ("if の条件式全体が引用文字列なら落ちる", f"if '{status_test}'; then exit 1; fi", 1),
        ("ドル括弧の表示内容なら落ちる", f"if echo $(echo '{status_test}'); then exit 1; fi", 1),
        ("ドル括弧内の if なら落ちる", f"echo $(if {status_test}; then echo 1; fi)", 1),
        ("バッククォート内の if なら落ちる", f"echo `if {status_test}; then echo 1; fi`", 1),
        ("エスケープしたバッククォートの後の本物の if は合格", "echo " + chr(92) + "`\n" + f"if {status_test}; then exit 1; fi", 0),
        ("エスケープした開き括弧の後の本物の if は合格", "echo " + chr(92) + "(\n" + f"if {status_test}; then exit 1; fi", 0),
        ("引用文字列が複数行でも落ちる", f"echo 'message\nif {status_test}; then exit 1; fi'", 1),
        ("複数行の本物の if は合格", f"if\n  {status_test}\nthen\n  exit 1\nfi", 0),
        ("複数行の本物の OR は合格", f"if [ \"$terms_status\" -ne 0 ] ||\n  {status_test}; then exit 1; fi", 0),
        ("コマンド置換内の複数行 if なら落ちる", f"echo $(\nif {status_test}; then echo 1; fi\n)", 1),
        ("if 内のコマンド置換だけにある判定なら落ちる", f"if $(echo x ||\n{status_test}\n); then exit 1; fi", 1),
        ('敵対試験 double_escaped_quote_fake', 'echo "prefix \\"\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\nend"\n', 1),
        ('敵対試験 printf_double_escaped_quote_fake', 'printf "%s" "prefix \\"\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\nend"\n', 1),
        ('敵対試験 hash_inside_word_quoted_fake', 'echo prefix#\'\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\nend\'\n', 1),
        ('敵対試験 quoted_concat_real_if', 'echo pre\'fix\'\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\n', 0),
        ('敵対試験 hash_literal_then_real_if', 'echo prefix#suffix\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\n', 0),
        ('敵対試験 quoted_then_hash_unclosed', 'echo \'#\'\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\n', 0),
        ('敵対試験 single_if', 'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi\n', 0),
        ('敵対試験 compound_or', 'if [ "$terms_status" -ne 0 ] || [ "$salepkg_status" -ne 0 ]; then exit 1; fi\n', 0),
        ('敵対試験 real_escaped_backtick', 'echo \\`\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\n', 0),
        ('敵対試験 real_escaped_paren', 'echo \\(\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\n', 0),
    ):
        synthetic.append((
            name,
            live_workflow,
            live_phase.splitlines()[0] + "\n" + condition + "\n",
            expected,
        ))
    for name, workflow, phase, expected in synthetic:
        got = len(wiring_problems(workflow, phase))
        if got != expected:
            failed += 1
            print(f"  ❌ 配線検査 {name}: 期待 {expected} / 実際 {got}")
    return failed, 3 + len(synthetic)


def check_declared() -> tuple[int, int]:
    """配布宣言から組み立てた一覧と、sale_package.py の一覧を突き合わせる。

    片側だけに在るものを両方向とも挙げる。登録漏れ（配るのに一覧に無い）は
    正しい記述を赤くし、余り（一覧に在るのに配らない）は本物の欠陥を緑にする。
    """
    declared = declared_copies()
    provided = set(scaffold_src_paths())
    failed = 0
    missing = sorted(declared - provided)
    if missing:
        failed += 1
        print(f"  ❌ 配布宣言に在るのに一覧に無い: {missing}")
        print("     sale_package.py の EXTRA_COPY_MAP か SCAFFOLD_COPY_MAP に足してください。")
    extra = sorted(provided - declared)
    if extra:
        failed += 1
        print(f"  ❌ 一覧に在るのに配布宣言に無い: {extra}")
        print("     scaffold-from-scratch.sh か build-zip.sh が配るのをやめた分です。")
    return failed, 2


def check_immutable() -> tuple[int, int]:
    """畳んだ返り値を呼び出し側が書き換えられないこと。

    同じ物を配り回す以上、受け取った側の1回の変更が以降の全判定へ残る。
    型で塞いであるかをここで見る。合わせて、2回目の呼び出しが同じ物を返す
    （= 歩き直していない）ことも見る。
    """
    failed = 0
    for name, value in (
        ("scaffold_src_paths", scaffold_src_paths()),
        ("comparable_src_paths", comparable_src_paths()),
        ("uncovered_scaffold_dirs", uncovered_scaffold_dirs()),
        ("zip_top_level", zip_top_level()),
        ("zip_scaffold_dirs", zip_scaffold_dirs()),
        ("excluded_routers", excluded_routers()),
    ):
        if not isinstance(value, (frozenset, tuple)):
            failed += 1
            print(f"  ❌ 呼び出し側が書き換えられる型で返している: {name} -> {type(value).__name__}")
    for name, fn in (
        ("scaffold_src_paths", scaffold_src_paths),
        ("comparable_src_paths", comparable_src_paths),
        ("zip_top_level", zip_top_level),
    ):
        if fn() is not fn():
            failed += 1
            print(f"  ❌ 呼ぶたびに作り直している: {name}")
    return failed, 9


def main_test() -> int:
    failed = 0
    provided = scaffold_src_paths()

    for path in MUST_CONTAIN:
        if path not in provided:
            failed += 1
            print(f"  ❌ 配布物なのに一覧に無い: {path}")

    for path in MUST_NOT_CONTAIN:
        if path in provided:
            failed += 1
            print(f"  ❌ 配らないのに一覧に在る: {path}")

    # 「手元に在る」と「照合先として使える」は別。配る版とこのリポジトリの版が
    # 違うファイルを照合先として通すと、読者は持っていない版を見に行かされる。
    comparable = comparable_src_paths()
    if not comparable <= provided:
        failed += 1
        print(f"  ❌ 照合先が配布物の外にある: {sorted(comparable - provided)}")
    for path in ("prisma/schema.prisma", "src/server/api/root.ts"):
        if path not in provided:
            failed += 1
            print(f"  ❌ 配布物なのに一覧に無い: {path}")
        if path in comparable:
            failed += 1
            print(f"  ❌ 配る版と完成版が違うのに照合先として通している: {path}")
    if "src/server/api/routers/_helpers/select.ts" not in comparable:
        failed += 1
        print("  ❌ 中身まで一致する配布物を照合先として弾いている: _helpers/select.ts")

    uncovered = uncovered_scaffold_dirs()
    if uncovered:
        failed += 1
        print(f"  ❌ 置かれる先が分からない補助ディレクトリ: {sorted(uncovered)}")
        print("     sale_package.py の EXTRA_COPY_MAP か SCAFFOLD_COPY_MAP に足してください。")

    declared_failed, declared_total = check_declared()
    failed += declared_failed
    immutable_failed, immutable_total = check_immutable()
    failed += immutable_failed
    wiring_failed, wiring_total = check_workflow_wiring()
    failed += wiring_failed

    total = (
        len(MUST_CONTAIN)
        + len(MUST_NOT_CONTAIN)
        + 7
        + declared_total
        + immutable_total
        + wiring_total
    )
    if failed:
        print(f"❌ sale_package 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ sale_package 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
