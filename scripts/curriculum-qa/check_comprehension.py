#!/usr/bin/env python3
"""
理解度チェック: 初心者向け教材の機械的品質チェック
beginner-review/SKILL.md の数値基準をコード化

チェック項目:
1. 注釈なし専門用語の初出 (カリキュラム全体で未注釈なら1件でもFAIL。
   より前のdayで注釈済みの再出用語はグレー扱いでWARNINGに留める)
2. 「当然」「簡単」「ググってください」等の禁止表現
3. 各Stepに確認ポイント(✅)が存在するか
"""

import re
import sys
from pathlib import Path

# 機械チェック対象の専門用語 (初出時に注釈が期待されるもの)
TECH_TERMS = [
    # Framework / ツール
    "Next.js", "React", "TypeScript", "Prisma", "tRPC", "Tailwind",
    "shadcn", "Supabase", "PostgreSQL", "Docker", "Vercel",
    # 概念
    "SSR", "SSG", "ISR", "CSR", "API", "ORM", "CLI",
    "CRUD", "JWT", "OAuth", "CDN", "DNS",
    "コンポーネント", "ミドルウェア", "スキーマ", "マイグレーション",
    "デプロイ", "レンダリング", "ルーティング", "スキャフォールド",
    # React/TS 固有
    "useState", "useEffect", "useMemo", "useCallback",
    "Props", "型定義", "型推論", "ジェネリクス", "インターフェース",
    # DB
    "外部キー", "トランザクション", "インデックス", "リレーション",
]

# 注釈パターン: （説明）「説明」: 説明 が直後にある
ANNOTATION_PATTERNS = [
    r'[（(][^）)]{3,}[）)]',      # （...）
    r'「[^」]{3,}」',              # 「...」
    r'：[^\n]{5,}',               # ：説明
    r':\s*[A-Za-z\s]{5,}',       # : explanation
    r'[とはとは]、[^\n。]{5,}',    # Xとは、...
    r'[とは][^\n。]{5,}[。]',     # Xとは...。
]

FORBIDDEN_PHRASES = [
    "当然",
    "ご存知",
    "ご存じ",
    "ここでは省略",
    "詳細は割愛",
    "ググってください",
    "検索してください",
    "自明",
    "言うまでもなく",
    "もちろん",
    "簡単にわかります",
]

BEGINNER_NEGATIVE = [
    "簡単です",
    "簡単に",
    "一目でわかる",
    "誰でもわかる",
]


def is_in_code_block(lines: list[str], line_idx: int) -> bool:
    """コードブロック内かどうか判定"""
    in_code = False
    for i, line in enumerate(lines):
        if line.strip().startswith("```"):
            in_code = not in_code
        if i == line_idx:
            return in_code
    return False


def has_annotation_nearby(content: str, term_start: int, window: int = 120) -> bool:
    """用語の前後window文字に注釈があるか"""
    start = max(0, term_start - 20)
    end = min(len(content), term_start + len(content[term_start:term_start+50]) + window)
    context = content[start:end]
    return any(re.search(p, context) for p in ANNOTATION_PATTERNS)


def check_unannotated_terms(content: str, lines: list[str]) -> list[dict]:
    """初出の専門用語で注釈がないものを列挙"""
    issues = []
    seen = set()

    for term in TECH_TERMS:
        pattern = re.compile(re.escape(term))
        for m in pattern.finditer(content):
            if term in seen:
                break  # 初出のみ

            line_idx = content[:m.start()].count('\n')
            if is_in_code_block(lines, line_idx):
                continue  # コードブロック内はスキップ

            seen.add(term)
            if not has_annotation_nearby(content, m.start()):
                issues.append({
                    "term": term,
                    "line": line_idx + 1,
                })
            break  # 初出チェック済み

    return issues


def curriculum_order_key(path: Path) -> tuple[int, str]:
    """カリキュラム内の読む順序 (目次/roadmap → day01..day30 → appendix)"""
    name = path.name
    m = re.match(r'day(\d+)_', name)
    if m:
        return (1000 + int(m.group(1)), name)
    if name.startswith("appendix"):
        return (9000, name)
    return (0, name)


def file_annotates_term(path: Path, term: str) -> bool:
    """そのファイル内の地の文初出箇所に注釈があるか"""
    try:
        content = path.read_text(encoding="utf-8")
    except OSError:
        return False
    lines = content.splitlines()
    for m in re.finditer(re.escape(term), content):
        line_idx = content[:m.start()].count('\n')
        if is_in_code_block(lines, line_idx):
            continue
        return has_annotation_nearby(content, m.start())
    return False


def find_prior_annotation(target: str, term: str) -> str | None:
    """カリキュラム上で target より前のファイルに注釈済み初出があれば、そのファイル名を返す"""
    target_path = Path(target)
    target_key = curriculum_order_key(target_path)
    siblings = sorted(target_path.parent.glob("*.md"), key=curriculum_order_key)
    for sib in siblings:
        if curriculum_order_key(sib) >= target_key:
            break
        if file_annotates_term(sib, term):
            return sib.name
    return None


def check_forbidden_phrases(content: str, lines: list[str]) -> list[dict]:
    """禁止表現チェック"""
    issues = []
    for phrase in FORBIDDEN_PHRASES + BEGINNER_NEGATIVE:
        for m in re.finditer(re.escape(phrase), content):
            line_idx = content[:m.start()].count('\n')
            if not is_in_code_block(lines, line_idx):
                issues.append({"phrase": phrase, "line": line_idx + 1})
    return issues


def check_confirmation_points(content: str) -> dict:
    """Stepごとの確認ポイント(✅)存在チェック"""
    # ## Step X: ... 形式のステップを抽出
    step_pattern = re.compile(r'^#{1,3}\s+(?:Step\s+\d+|ステップ\s*\d+|手順\s*\d+)', re.MULTILINE | re.IGNORECASE)
    steps = list(step_pattern.finditer(content))

    if not steps:
        return {"steps": 0, "without_checkpoints": 0}

    without_checkpoints = 0
    for i, step_match in enumerate(steps):
        start = step_match.start()
        end = steps[i + 1].start() if i + 1 < len(steps) else len(content)
        section = content[start:end]

        # ✅ または [ ] チェックボックスがあるか
        has_checkpoint = bool(
            re.search(r'✅', section) or
            re.search(r'- \[[ x]\]', section) or
            re.search(r'確認[：:]', section)
        )
        if not has_checkpoint:
            without_checkpoints += 1

    return {
        "steps": len(steps),
        "without_checkpoints": without_checkpoints,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print("使用法: python3 check_comprehension.py <file.md>")
        return 1

    target = sys.argv[1]
    try:
        with open(target, encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ ファイルが見つかりません: {target}")
        return 1

    lines = content.splitlines()
    failed = False

    # 1. 専門用語チェック
    # 閾値は0: カリキュラム全体で一度も注釈されていない用語は1件でもFAIL。
    # より前のday/appendixで注釈済みの「再出」はグレー扱いでWARNINGに留める。
    unannotated = check_unannotated_terms(content, lines)

    hard_issues = []
    gray_issues = []
    for issue in unannotated:
        prior = find_prior_annotation(target, issue["term"])
        if prior:
            gray_issues.append({**issue, "prior": prior})
        else:
            hard_issues.append(issue)

    if gray_issues:
        print(f"⚠️  既出用語の再出 (グレー): {len(gray_issues)} 件 → WARNING")
        for issue in gray_issues:
            print(f"   Line {issue['line']:4d}: 「{issue['term']}」 — このファイルに注釈はないが {issue['prior']} で注釈済み")
    if hard_issues:
        print(f"📚 注釈なし初出専門用語: {len(hard_issues)} 件")
        for issue in hard_issues:
            print(f"   Line {issue['line']:4d}: 「{issue['term']}」 — カリキュラム内のどのファイルでも未注釈")
        print(f"❌ カリキュラム内未注釈の専門用語があります ({len(hard_issues)} 件) → FAIL")
        failed = True
    if not gray_issues and not hard_issues:
        print("✅ 専門用語: 全ての初出用語に注釈あり（またはリストにない用語のみ）")

    # 2. 禁止表現チェック
    forbidden = check_forbidden_phrases(content, lines)
    if forbidden:
        print(f"🚫 禁止表現: {len(forbidden)} 件")
        for issue in forbidden:
            print(f"   Line {issue['line']:4d}: 「{issue['phrase']}」")
        print("❌ 禁止表現が含まれています → FAIL")
        failed = True
    else:
        print("✅ 禁止表現: なし")

    # 3. 確認ポイントチェック (Stepありの場合のみ)
    cp = check_confirmation_points(content)
    if cp["steps"] > 0:
        if cp["without_checkpoints"] > 0:
            print(f"⚠️  確認ポイント未設定のStep: {cp['without_checkpoints']}/{cp['steps']} 件 → WARNING")
        else:
            print(f"✅ 確認ポイント: 全 {cp['steps']} Stepに設定あり")
    else:
        print("ℹ️  確認ポイント: Step形式のセクションなし（チェックスキップ）")

    if failed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
