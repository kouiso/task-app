#!/usr/bin/env python3
"""
ステップ長チェックスクリプト

各ステップのコードブロック行数と説明テキストの長さをチェックします。
- コードブロック上限: 25行
- 段落上限: 3文
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple


def count_sentences(text: str) -> int:
    """テキスト内の文の数をカウント"""
    # 句点で分割
    sentences = re.split(r'[。！？\n]', text)
    return len([s for s in sentences if s.strip()])

def check_code_blocks(content: str) -> List[Tuple[int, int, str]]:
    """
    コードブロックの行数をチェック

    Returns:
        [(開始行, 行数, ファイルパス), ...]
    """
    errors: List[Tuple[int, int, str]] = []
    lines = content.split('\n')

    in_code_block = False
    block_start = 0
    block_lines = []
    filepath = ""

    for line_num, line in enumerate(lines, 1):
        if line.strip().startswith('```'):
            if not in_code_block:
                in_code_block = True
                block_start = line_num
                block_lines = []
                # filepath: コメントを抽出
                if '// filepath:' in line or '# filepath:' in line:
                    filepath = line.split('filepath:')[1].strip() if 'filepath:' in line else "不明"
            else:
                # コードブロック終了
                in_code_block = False
                code_line_count = len([l for l in block_lines if l.strip()])

                if code_line_count > 25:
                    errors.append((block_start, code_line_count, filepath))
        elif in_code_block:
            block_lines.append(line)

    return errors

def check_paragraphs(content: str) -> List[Tuple[int, int]]:
    """
    段落内の文数をチェック

    Returns:
        [(開始行, 文数), ...]
    """
    errors: List[Tuple[int, int]] = []
    lines = content.split('\n')

    in_code_block = False
    in_list = False
    current_paragraph = ""
    paragraph_start = 0

    for line_num, line in enumerate(lines, 1):
        # コードブロックの判定
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue

        if in_code_block:
            continue

        # リストの判定
        if re.match(r'^[\s]*[-*+\d.]\s', line):
            in_list = True
            continue

        # 見出しで段落終了
        if line.strip().startswith('#'):
            if current_paragraph.strip():
                sentence_count = count_sentences(current_paragraph)
                if sentence_count > 3:
                    errors.append((paragraph_start, sentence_count))
            current_paragraph = ""
            in_list = False
            continue

        # 空行で段落終了
        if not line.strip():
            if current_paragraph.strip():
                sentence_count = count_sentences(current_paragraph)
                if sentence_count > 3:
                    errors.append((paragraph_start, sentence_count))
            current_paragraph = ""
            in_list = False
            continue

        # テーブルの判定（スキップ）
        if '|' in line:
            continue

        # 段落継続
        if not in_list and line.strip():
            if not current_paragraph:
                paragraph_start = line_num
            current_paragraph += line + " "

    return errors

def check_file(filepath: Path) -> Tuple[List[Tuple[int, int, str]], List[Tuple[int, int]]]:
    """ファイルをチェック"""
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ ファイル読込エラー: {filepath}")
        return [], []

    code_errors = check_code_blocks(content)
    paragraph_errors = check_paragraphs(content)

    return code_errors, paragraph_errors

def main():
    """メイン処理"""
    if len(sys.argv) < 2:
        print("使用法: python check_step_length.py <directory_or_file>")
        print("例: python check_step_length.py material/30days-curriculum/")
        sys.exit(1)

    target_path = Path(sys.argv[1])

    if not target_path.exists():
        print(f"❌ パスが見つかりません: {target_path}")
        sys.exit(1)

    # Markdownファイル取得
    if target_path.is_dir():
        md_files = sorted(target_path.glob('day*.md'))
    else:
        md_files = [target_path]

    if not md_files:
        print(f"⚠️  Markdownファイルが見つかりません: {target_path}")
        sys.exit(0)

    print("=" * 70)
    print("📏 ステップ長チェックスクリプト")
    print("=" * 70)
    print()

    total_code_errors = 0
    total_paragraph_errors = 0
    files_with_errors = 0

    for md_file in md_files:
        code_errors, para_errors = check_file(md_file)

        if code_errors or para_errors:
            files_with_errors += 1
            print(f"⚠️  {md_file.name}")

            if code_errors:
                total_code_errors += len(code_errors)
                print(f"   💻 コードブロック: {len(code_errors)}個が25行超過")
                for start_line, line_count, filepath in code_errors:
                    print(f"      L{start_line}: {line_count}行 ({filepath})")

            if para_errors:
                total_paragraph_errors += len(para_errors)
                print(f"   📄 段落: {len(para_errors)}個が3文超過")
                for start_line, sentence_count in para_errors:
                    print(f"      L{start_line}: {sentence_count}文")

            print()

    print("=" * 70)
    if total_code_errors == 0 and total_paragraph_errors == 0:
        print("✅ 全てのステップが適切な長さです！")
        print("=" * 70)
        sys.exit(0)
    else:
        print(f"⚠️  {files_with_errors}ファイルに問題が見つかりました")
        print(f"   コードブロック超過: {total_code_errors}個")
        print(f"   段落超過: {total_paragraph_errors}個")
        print("=" * 70)
        sys.exit(1)

if __name__ == '__main__':
    main()
