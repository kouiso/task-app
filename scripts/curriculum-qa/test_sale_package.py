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
import shlex
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
    """引用符と二重角括弧の外の `&&` `||` `;` でコマンドを分ける。"""
    parts: list[str] = []
    buf: list[str] = []
    quote = ""
    conditional = False
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
        if (
            text.startswith("[[", i)
            and (i + 2 == len(text) or text[i + 2].isspace())
            and re.fullmatch(r"\s*(?:(?:if|elif|then|else|while|until|do|!)\s+)*", "".join(buf))
        ):
            conditional = True
        elif text.startswith("]]", i) and conditional:
            conditional = False
        if not conditional and (text.startswith("&&", i) or text.startswith("||", i)):
            parts.append("".join(buf))
            buf = []
            i += 2
            continue
        if ch == ";" and not conditional:
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


def _heredocs_and_continuation(line: str) -> tuple[list[tuple[str, bool]], bool]:
    """引用符とエスケープの外にあるヒアドキュメントと行継続を拾う。"""
    delimiters: list[tuple[str, bool]] = []
    quote = ""
    index = 0
    continued = False
    arithmetic_closers: list[str] = []
    heredoc = re.compile(
        r'''(?<!<)<<(-?)(?!<)\s*((?:[^\s;&|<>()'"\\]|\\.|"(?:[^"\\]|\\.)*"|'[^']*')+)'''
    )
    while index < len(line):
        ch = line[index]
        if ch == "\\" and quote != "'":
            if index == len(line) - 1:
                return delimiters, True
            continued = False
            index += 2
            continue
        if quote:
            if ch == quote:
                quote = ""
            index += 1
            continue
        if ch in "'\"":
            quote = ch
            continued = False
            index += 1
            continue
        if arithmetic_closers:
            if ch == "(":
                arithmetic_closers.append(")")
            elif ch == arithmetic_closers[-1]:
                arithmetic_closers.pop()
            index += 1
            continue
        if ch == "#":
            break
        if line.startswith("((", index):
            arithmetic_closers = [")", ")"]
            continued = False
            index += 2
            continue
        if line.startswith("$[", index):
            arithmetic_closers = ["]"]
            continued = False
            index += 2
            continue
        match = heredoc.match(line, index)
        if match:
            delimiters.append((shlex.split(match.group(2))[0], match.group(1) == "-"))
            continued = False
            index = match.end()
        elif line.startswith(("||", "&&"), index):
            continued = True
            index += 2
        else:
            if not ch.isspace():
                continued = ch == "|"
            index += 1
    return delimiters, continued or bool(arithmetic_closers)


def _shell_lines(text: str) -> list[str]:
    """コメント行とヒアドキュメントの本文を除いたシェル行。"""
    lines: list[str] = []
    delimiters: list[tuple[str, bool]] = []
    pending = ""
    for line in text.splitlines():
        if delimiters:
            delimiter, strip_tabs = delimiters[0]
            # シェルは終端の行を完全一致でしか認めない。字下げした終端を終わりと見なすと、
            # その後ろの本文行が実行行として残ってしまう。`<<-` だけは先頭のタブを許す。
            if (line.lstrip("\t") if strip_tabs else line) == delimiter:
                delimiters.pop(0)
            continue
        if line.lstrip().startswith("#"):
            continue
        line = pending + line
        delimiters, continued = _heredocs_and_continuation(line)
        if continued:
            pending = (
                line[:-1] if line.endswith("\\") else _strip_unquoted_comment(line).rstrip() + " "
            )
            delimiters = []
            continue
        commands = _split_commands(_strip_unquoted_comment(line))
        if (
            commands
            and re.match(r"^\s*if(?:\s|$)", commands[0])
            and not any(re.match(r"^\s*then(?:\s|$)", command) for command in commands)
        ):
            pending = _strip_unquoted_comment(line).rstrip() + (
                " " if _tokenize(commands[-1]) == ["if"] else "; "
            )
            continue
        pending = ""
        lines.append(line)
    return lines


def _is_gate4_status_condition(line: str) -> bool:
    """Gate 4 の終了コードを判定する実際の `if` 条件だけを受け入れる。"""
    commands = _split_commands(_strip_unquoted_comment(line))
    if not commands or not re.match(r"^\s*if(?:\s|$)", commands[0]):
        return False
    for index, command in enumerate(commands):
        if re.match(r"^\s*then(?:\s|$)", command):
            break
        raw = re.sub(r"^\s*if\s+", "", command, count=1) if index == 0 else command
        condition = _tokenize(raw)
        if condition[:1] == ["["] and condition[-1:] == ["]"]:
            groups = [raw.strip().split(maxsplit=1)[1].rsplit(maxsplit=1)[0]]
        elif re.match(r"^\s*\[\[\s", raw) and condition[-1:] == ["]]"]:
            groups = _split_commands(raw.strip()[2:-2])
        elif condition[:1] == ["test"]:
            groups = [raw.strip().split(maxsplit=1)[1]] if len(condition) > 1 else []
        else:
            continue
        for group in groups:
            group = group.strip("() \t")
            if ["$salepkg_status", "-ne", "0"] == _tokenize(group) and re.search(
                r'(?:^|\s)(?:"\$salepkg_status"|\$salepkg_status)(?=\s)', group
            ):
                return True
    return False


# 本物の Gate 4 の起動。語の並びがこれと一致するときだけ配線が生きている。
_GATE4_WORKFLOW = ["bash", ".github/ci/run.sh", "material-corpus"]
_GATE4_PHASE = ["python3", "scripts/curriculum-qa/test_sale_package.py"]
_GATE4_STATUS = ["salepkg_status=$?"]


def wiring_problems(workflow: str, phase: str) -> list[str]:
    """workflow と phase スクリプトの配線の不備を返す。空なら配線は生きている。"""
    problems: list[str] = []
    if not any(_GATE4_WORKFLOW in _argv(line) for line in active_lines(workflow)):
        problems.append("material-gate.yml が Gate 4（run.sh material-corpus）を呼んでいない")
    phase_lines = _shell_lines(phase)
    if not any(_GATE4_PHASE in _argv(line) and _GATE4_STATUS in _argv(line) for line in phase_lines):
        problems.append(
            "material-corpus.sh の Gate 4 が test_sale_package.py を呼び、終了コードを salepkg_status に受けていない"
        )
    if not any(_is_gate4_status_condition(line) for line in phase_lines):
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
        (
            "二重引用符の中のヒアドキュメント記号は合格",
            live_workflow,
            'echo "Use <<EOF for a heredoc"\n' + live_phase,
            0,
        ),
        (
            "単一引用符の中のヒアドキュメント記号は合格",
            live_workflow,
            "echo 'Use <<EOF for a heredoc'\n" + live_phase,
            0,
        ),
        (
            "エスケープしたヒアドキュメント記号は合格",
            live_workflow,
            "echo \\<\\<EOF\n" + live_phase,
            0,
        ),
        (
            "行継続した実ファイルの集計条件は合格",
            WORKFLOW.read_text(encoding="utf-8"),
            GATE4_PHASE.read_text(encoding="utf-8").replace(
                '[ "$salepkg_status" -ne 0 ]', '\\\n[ "$salepkg_status" -ne 0 ]'
            ),
            0,
        ),
        (
            "行継続した呼び出しと集計条件は合格",
            live_workflow,
            live_phase.replace(" || ", " \\\n|| ").replace(" -ne ", " \\\n-ne "),
            0,
        ),
        (
            "OR の後で暗黙に行継続した実ファイルの集計条件は合格",
            WORKFLOW.read_text(encoding="utf-8"),
            GATE4_PHASE.read_text(encoding="utf-8").replace(
                '|| [ "$salepkg_status" -ne 0 ]', '||\n  [ "$salepkg_status" -ne 0 ]'
            ),
            0,
        ),
        (
            "算術展開の左シフトはヒアドキュメントではない",
            live_workflow,
            'mask=$((1 << 2))\n' + live_phase,
            0,
        ),
        (
            "算術コマンドの左シフトはヒアドキュメントではない",
            live_workflow,
            '((mask = (1 << 2) << 1))\n' + live_phase,
            0,
        ),
        (
            "角括弧の算術展開の左シフトはヒアドキュメントではない",
            live_workflow,
            'mask=$[1 << 2]\n' + live_phase,
            0,
        ),
        (
            "複数行と基数指定を含む算術展開はヒアドキュメントではない",
            live_workflow,
            'mask=$((16#ff\n << 2))\n' + live_phase,
            0,
        ),
        (
            "if の後がタブでも実ファイルの集計条件は合格",
            WORKFLOW.read_text(encoding="utf-8"),
            GATE4_PHASE.read_text(encoding="utf-8").replace("if [", "if\t["),
            0,
        ),
        (
            "if の後が改行でも実ファイルの集計条件は合格",
            WORKFLOW.read_text(encoding="utf-8"),
            GATE4_PHASE.read_text(encoding="utf-8").replace("if [", "if\n["),
            0,
        ),
        (
            "then の前が改行でも実ファイルの集計条件は合格",
            WORKFLOW.read_text(encoding="utf-8"),
            GATE4_PHASE.read_text(encoding="utf-8").replace("; then", "\nthen"),
            0,
        ),
        (
            "引用した if と then は制御構文として受け入れない",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                '\'if\' [ "$salepkg_status" -ne 0 ]; \'then\'',
            ),
            1,
        ),
        (
            "条件中の引用した then は条件の終わりではない",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then',
                'if :; "then"; [ "$salepkg_status" -ne 0 ]; then',
            ),
            0,
        ),
        (
            "二重角括弧の複合条件でも集計を受け入れる",
            live_workflow,
            live_phase.replace('if [ "$salepkg_status" -ne 0 ]',
                'if [[ "$terms_status" -ne 0 || "$salepkg_status" -ne 0 ]]'),
            0,
        ),
        (
            "二重角括弧の括弧付き複合条件でも集計を受け入れる",
            live_workflow,
            live_phase.replace('if [ "$salepkg_status" -ne 0 ]',
                'if [[ ( "$terms_status" -ne 0 || "$salepkg_status" -ne 0 ) ]]'),
            0,
        ),
        (
            "複合条件中の単一引用符の変数は集計に数えない",
            live_workflow,
            live_phase.replace('if [ "$salepkg_status" -ne 0 ]',
                "if [[ '$salepkg_status' -ne 0 || x == \"$salepkg_status\" ]]"),
            1,
        ),
        (
            "引用した二重角括弧は条件構文ではない",
            live_workflow,
            live_phase.replace('if [ "$salepkg_status" -ne 0 ]',
                "if '[[' \"$salepkg_status\" -ne 0 ']]'"),
            1,
        ),
        (
            "コメントの後の then を集計に含める",
            WORKFLOW.read_text(encoding="utf-8"),
            GATE4_PHASE.read_text(encoding="utf-8").replace("; then", " # aggregate statuses\nthen"),
            0,
        ),
        (
            "if 直後のコメントも次の条件を隠さない",
            live_workflow,
            live_phase.replace('if [', 'if # aggregate statuses\n['),
            0,
        ),
        (
            "コメント付き OR の後で暗黙に行継続した呼び出しは合格",
            live_workflow,
            live_phase.replace(" || ", " || # collect status\n"),
            0,
        ),
        (
            "引用符内の OR は行継続にしない",
            live_workflow,
            'echo "||"\n' + live_phase,
            0,
        ),
        (
            "句点を含むヒアドキュメントの終端後の配線は合格",
            live_workflow,
            "cat <<EOF.txt\nexample output\nEOF.txt\n" + live_phase,
            0,
        ),
        (
            "引用符を混ぜたヒアドキュメントの終端後の配線は合格",
            live_workflow,
            'cat <<E"OF.txt"\nexample output\nEOF.txt\n' + live_phase,
            0,
        ),
        (
            "空白を含むヒアドキュメントの終端後の配線は合格",
            live_workflow,
            "cat <<'END OF FILE'\nexample output\nEND OF FILE\n" + live_phase,
            0,
        ),
        (
            "空のヒアドキュメント終端後の配線は合格",
            live_workflow,
            'cat <<""\nexample output\n\n' + live_phase,
            0,
        ),
        (
            "コメント記号で始まるヒアドキュメント終端後の配線は合格",
            live_workflow,
            "cat <<'#EOF'\nexample output\n#EOF\n" + live_phase,
            0,
        ),
        (
            "終端の接頭辞の後にあるヒアドキュメント本文は不合格",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'cat <<EOF.txt\nEOF\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\nEOF.txt',
            ),
            1,
        ),
        (
            "複数ヒアドキュメントの後ろの本文は不合格",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'cat <<EOF <<END\nEOF\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\nEND',
            ),
            1,
        ),
        (
            "then より後の比較は不合格",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'if true; then :; fi; [ "$salepkg_status" -ne 0 ] || :',
            ),
            1,
        ),
        (
            "展開されない単一引用符の比較は不合格",
            live_workflow,
            live_phase.replace('"$salepkg_status" -ne 0', "'$salepkg_status' -ne 0"),
            1,
        ),
        (
            "実ファイルの配線は合格",
            WORKFLOW.read_text(encoding="utf-8"),
            GATE4_PHASE.read_text(encoding="utf-8"),
            0,
        ),
        ("生きた配線は合格", live_workflow, live_phase, 0),
        (
            "二重角括弧の集計条件は合格",
            live_workflow,
            live_phase.replace('[ "$salepkg_status" -ne 0 ]', '[[ "$salepkg_status" -ne 0 ]]'),
            0,
        ),
        (
            "test コマンドの集計条件は合格",
            live_workflow,
            live_phase.replace('[ "$salepkg_status" -ne 0 ]', 'test "$salepkg_status" -ne 0'),
            0,
        ),
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
        (
            "集計条件を echo の引数に置いたら落ちる",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'echo \'"$salepkg_status" -ne 0\'',
            ),
            1,
        ),
        (
            "集計条件を printf の引数に置いたら落ちる",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'printf \'%s\' \'"$salepkg_status" -ne 0\'',
            ),
            1,
        ),
        (
            "集計条件を単一引用符の文字列に置いたら落ちる",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                ': \'"$salepkg_status" -ne 0\'',
            ),
            1,
        ),
        (
            "集計条件を二重引用符の文字列に置いたら落ちる",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                ': "\\"\\$salepkg_status\\" -ne 0"',
            ),
            1,
        ),
        (
            "集計条件をヒアドキュメントの本文に置いたら落ちる",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'cat <<\'EOF\'\n"$salepkg_status" -ne 0\nEOF',
            ),
            1,
        ),
        (
            "字下げした終端の後ろのヒアドキュメント本文に置いたら落ちる",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'cat <<EOF\n  EOF\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\nEOF',
            ),
            1,
        ),
        (
            "バックスラッシュ付きの開始のヒアドキュメント本文に置いたら落ちる",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'cat <<\\EOF\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi\nEOF',
            ),
            1,
        ),
        (
            "タブで字下げした <<- の終端の後ろの集計条件は合格",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'cat <<-EOF\n\tx\n\tEOF\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
            ),
            0,
        ),
        (
            "here-string の後ろの集計条件は合格",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                'cat <<< hi\nif [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
            ),
            0,
        ),
        (
            "集計条件をコメント化したら落ちる",
            live_workflow,
            live_phase.replace(
                'if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
                '# if [ "$salepkg_status" -ne 0 ]; then exit 1; fi',
            ),
            1,
        ),
    ]
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
