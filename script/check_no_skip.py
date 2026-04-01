#!/usr/bin/env python3
"""
ステップ連続性チェックスクリプト
- 各ステップに実装コードがあるか
- filepathコメントがあるか
- 確認ポイントがあるか
"""

import sys
import re

def check_step_completeness(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # ステップセクションを抽出
    step_pattern = r'### Step \d+[^:\n]*:.*?(?=\n### Step \d+[^:\n]*:|\n## [^#]|\Z)'
    steps = re.findall(step_pattern, content, re.DOTALL)

    print(f"検出されたステップ数: {len(steps)}")

    errors = []

    # GUIステップ判定キーワード（ブラウザ操作等、コードブロック不要）
    gui_keywords = ('ブラウザ', 'GUI', 'Webサイト', 'サイト上で', '画面で操作', 'Vercel', 'GitHubで', 'アカウントを作成', 'サインアップ', '動作確認', 'リポジトリを作成', 'リポジトリをインポート')

    for i, step in enumerate(steps, 1):
        step_errors = []

        # ステップタイトル抽出
        step_title_match = re.match(r'### Step \d+.*?:(.*?)(?:\n|$)', step)
        step_title = step_title_match.group(1).strip() if step_title_match else ''

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
                '// filepath:' in code or '# filepath:' in code
                for _, code in needs_filepath
            ):
                step_errors.append("filepathコメントなし")

        # 確認ポイントの有無
        if '✅' not in step and '確認ポイント' not in step:
            step_errors.append("確認ポイントなし")

        if step_errors:
            errors.append(f"❌ Step {i}: {', '.join(step_errors)}")

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
