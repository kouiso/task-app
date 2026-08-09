#!/usr/bin/env python3
"""
ステップ連続性チェックスクリプト
- 各ステップに実装コードがあるか
- filepathコメントがあるか
- 確認ポイントがあるか
"""

import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from curriculum_blocks import (  # noqa: E402
    has_confirmation_point,
    has_filepath_marker,
    heading_scan_view,
    section_end,
)


# day01〜day04 は `## Step`、day05 以降は `### Step` で書かれている。h3 だけを
# 見ていた頃、h2 の日はステップ0件として素通りし「✅ 全0ステップが完全」と表示
# されていた。h4 まで広げるとステップ内の小見出しを二重に数えるので上限は h3。
STEP_HEADING = re.compile(r'^#{2,3} Step [\d.]+[^:\n]*:', re.MULTILINE)


def find_steps(content):
    """ステップ見出しから次の区切りまでを1ステップとして切り出す。

    見出しの探索はコードフェンスを潰した写しに対して行う。コード例の中の
    `## main` や `### Step 1: ...` を見出しとして拾うと、節が途中で切れたり
    存在しないステップが増えたりする。
    """
    view = heading_scan_view(content)
    heads = list(STEP_HEADING.finditer(view))
    steps = []
    for i, head in enumerate(heads):
        next_step = heads[i + 1].start() if i + 1 < len(heads) else len(content)
        # h2 のステップは自分の見出し自体が節の開始なので、本文以降から次の節を探す。
        steps.append(content[head.start():section_end(view, head.end(), next_step)])
    return steps


def check_step_completeness(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    steps = find_steps(content)

    print(f"検出されたステップ数: {len(steps)}")

    errors = []

    # GUIステップ判定キーワード（ブラウザ操作等、コードブロック不要）
    gui_keywords = ('ブラウザ', 'GUI', 'Webサイト', 'サイト上で', '画面で操作', 'Vercel', 'GitHubで', 'アカウントを作成', 'サインアップ', '動作確認', 'リポジトリを作成', 'リポジトリをインポート')

    for i, step in enumerate(steps, 1):
        step_errors = []

        # ステップ番号とタイトル抽出。番号は見出しから読む。並び順で採番すると、
        # Step 0 から始まる日で全部1つずれて、存在しない番号を指した報告になる。
        # 番号は小数も取る。day30 の `Step 2.5` を `2` として報告すると、
        # 手前の Step 2 に不備があるように読めてしまう。
        step_title_match = re.match(r'#{2,3} Step ([\d.]+).*?:(.*?)(?:\n|$)', step)
        step_number = step_title_match.group(1) if step_title_match else str(i)
        step_title = step_title_match.group(2).strip() if step_title_match else ''

        # GUI操作ステップはコードブロック不要（タイトルまたは本文冒頭200文字で判定）
        step_head = step[:500]
        is_gui_step = any(kw in step_title or kw in step_head for kw in gui_keywords)

        # コードブロックの有無（GUIステップは除外）
        if '```' not in step and not is_gui_step:
            step_errors.append("コードブロックなし")
        else:
            # filepathコメントの有無（TypeScript/JavaScript系のみ対象、bash/shell/mermaid等は除外）
            skip_langs = ('bash', 'shell', 'sh', 'zsh', 'mermaid')
            filepath_required_langs = ('typescript', 'javascript', 'tsx', 'jsx', 'ts', 'js')
            code_blocks = re.findall(r'```(\w+)?\n(.*?)```', step, re.DOTALL)
            needs_filepath = [
                (lang, code) for lang, code in code_blocks
                if lang and lang.lower() in filepath_required_langs
            ]
            if needs_filepath and not any(
                has_filepath_marker(code) for _, code in needs_filepath
            ):
                step_errors.append("filepathコメントなし")

        # 確認ポイントの有無。見出し行だけで合格しないよう本文だけを渡す。
        body = step.split("\n", 1)[1] if "\n" in step else ""
        if not has_confirmation_point(body):
            step_errors.append("確認ポイントなし")

        if step_errors:
            errors.append(f"❌ Step {step_number}: {', '.join(step_errors)}")

    if errors:
        print("\nステップ不備:")
        for error in errors:
            print(error)
        sys.exit(1)

    print(f"✅ 全{len(steps)}ステップが完全")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("使用法: python check_no_skip.py <filepath>")
        sys.exit(1)

    check_step_completeness(sys.argv[1])
