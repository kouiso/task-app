#!/usr/bin/env python3
"""
教材品質チェックスクリプト
- コードブロック25行ルール
- ステップ連続性
- 視覚要素（表・図）の存在
- 禁止語チェック
"""

import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List


@dataclass
class CheckResult:
    """チェック結果"""
    passed: bool
    message: str
    line_number: int = 0


def check_code_block_length(content: str, max_lines: int = 25) -> List[CheckResult]:
    """コードブロックが25行以内かチェック"""
    results = []
    pattern = r'```[\w]*\n(.*?)```'

    for match in re.finditer(pattern, content, re.DOTALL):
        code = match.group(1)
        lines = code.strip().split('\n')
        line_count = len(lines)

        # コードブロックの開始行を計算
        start_pos = match.start()
        line_number = content[:start_pos].count('\n') + 1

        if line_count > max_lines:
            results.append(CheckResult(
                passed=False,
                message=f"コードブロックが{line_count}行（上限{max_lines}行）",
                line_number=line_number
            ))
        else:
            results.append(CheckResult(
                passed=True,
                message=f"コードブロック {line_count}行 OK",
                line_number=line_number
            ))

    return results


def check_step_continuity(content: str) -> List[CheckResult]:
    """ステップが連続しているかチェック（Step 1, 2, 3...）"""
    results = []
    pattern = r'###\s*Step\s*(\d+)'

    matches = re.findall(pattern, content)
    step_numbers = [int(m) for m in matches]

    if not step_numbers:
        return [CheckResult(passed=True, message="ステップなし（スキップ）")]

    expected = 1
    for actual in step_numbers:
        if actual != expected:
            results.append(CheckResult(
                passed=False,
                message=f"Step {expected} が期待されるが Step {actual} が見つかった"
            ))
        expected = actual + 1

    if not results:
        results.append(CheckResult(
            passed=True,
            message=f"ステップ連続性 OK（Step 1〜{step_numbers[-1]}）"
        ))

    return results


def check_visual_elements(content: str) -> List[CheckResult]:
    """視覚要素（表・Mermaid図）が十分にあるかチェック"""
    results = []

    # テーブル数をカウント
    table_count = len(re.findall(r'^\|.*\|.*\|', content, re.MULTILINE))

    # Mermaid図をカウント
    mermaid_count = len(re.findall(r'```mermaid', content))

    # 画像をカウント
    image_count = len(re.findall(r'!\[.*?\]\(.*?\)', content))

    total_visual = table_count + mermaid_count + image_count

    if table_count < 4:
        results.append(CheckResult(
            passed=False,
            message=f"テーブル数 {table_count}（推奨: 4以上）"
        ))
    else:
        results.append(CheckResult(
            passed=True,
            message=f"テーブル数 {table_count} OK"
        ))

    # アーキテクチャ関連のDayではMermaid必須
    if 'アーキテクチャ' in content or '構造' in content or 'フロー' in content:
        if mermaid_count == 0:
            results.append(CheckResult(
                passed=False,
                message="アーキテクチャ説明にMermaid図がありません"
            ))

    return results


def check_forbidden_words(content: str) -> List[CheckResult]:
    """禁止語のチェック"""
    results = []
    forbidden = [
        ('同様に', '全コードを明示的に記述してください'),
        ('残りも', '全コードを明示的に記述してください'),
        ('以下略', '全コードを明示的に記述してください'),
        ('簡単です', '初心者には簡単ではない可能性があります'),
        ('ご存知の通り', '読者は知らない前提で書いてください'),
        ('当然ながら', '読者は知らない前提で書いてください'),
    ]

    for word, suggestion in forbidden:
        matches = list(re.finditer(re.escape(word), content))
        for match in matches:
            line_number = content[:match.start()].count('\n') + 1
            results.append(CheckResult(
                passed=False,
                message=f"禁止語「{word}」が見つかりました。{suggestion}",
                line_number=line_number
            ))

    if not any(not r.passed for r in results):
        results.append(CheckResult(passed=True, message="禁止語チェック OK"))

    return results


def check_filepath_comments(content: str) -> List[CheckResult]:
    """コードブロックにfilepathコメントがあるかチェック"""
    results = []
    pattern = r'```(typescript|tsx|javascript|jsx|python|prisma)\n(.*?)```'

    for match in re.finditer(pattern, content, re.DOTALL):
        code = match.group(2)
        start_pos = match.start()
        line_number = content[:start_pos].count('\n') + 1

        # filepath: または // src/ などのパスコメントをチェック
        has_filepath = bool(re.search(r'(//\s*filepath:|//\s*src/|//\s*prisma/|#\s*filepath:)', code))

        if not has_filepath:
            results.append(CheckResult(
                passed=False,
                message="コードブロックにfilepathコメントがありません",
                line_number=line_number
            ))

    if not any(not r.passed for r in results):
        results.append(CheckResult(passed=True, message="filepathコメント OK"))

    return results


def run_all_checks(filepath: str) -> bool:
    """全チェックを実行"""
    path = Path(filepath)
    if not path.exists():
        print(f"❌ ファイルが見つかりません: {filepath}")
        return False

    content = path.read_text(encoding='utf-8')

    print(f"\n{'='*60}")
    print(f"📋 品質チェック: {path.name}")
    print(f"{'='*60}\n")

    all_passed = True

    checks = [
        ("📏 コードブロック行数", check_code_block_length(content)),
        ("🔢 ステップ連続性", check_step_continuity(content)),
        ("🎨 視覚要素", check_visual_elements(content)),
        ("🚫 禁止語", check_forbidden_words(content)),
        ("📁 filepathコメント", check_filepath_comments(content)),
    ]

    for check_name, results in checks:
        print(f"\n{check_name}:")
        for result in results:
            icon = "✅" if result.passed else "❌"
            line_info = f" (L{result.line_number})" if result.line_number else ""
            print(f"  {icon} {result.message}{line_info}")
            if not result.passed:
                all_passed = False

    print(f"\n{'='*60}")
    if all_passed:
        print("🎉 全チェック合格！")
    else:
        print("⚠️  修正が必要な項目があります")
    print(f"{'='*60}\n")

    return all_passed


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使い方: python check_quality.py <markdown_file>")
        print("例: python check_quality.py material/30days-curriculum/day04_typescript基礎.md")
        sys.exit(1)

    filepath = sys.argv[1]
    success = run_all_checks(filepath)
    sys.exit(0 if success else 1)
