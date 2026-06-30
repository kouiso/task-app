#!/usr/bin/env python3
"""
文体チェックスクリプト
- 関西弁・タメ口語尾の混入検出
- AI典型構文（banned-phrases）検出
- 英語直訳調マーカー検出
"""

import re
import sys


def strip_code_blocks(content: str) -> list[tuple[int, str]]:
    """コードブロックとインラインコードを除外して、(行番号, 行テキスト) のリストを返す"""
    lines = content.split('\n')
    result = []
    in_code_block = False
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue
        # インラインコード (`...`) を空白に置換
        cleaned = re.sub(r'`[^`]+`', ' ', line)
        # URLを除外
        cleaned = re.sub(r'https?://\S+', ' ', cleaned)
        result.append((i, cleaned))
    return result


# Layer 1: 関西弁・タメ口語尾パターン
KANSAI_PATTERNS: list[tuple[str, str, str]] = [
    # (pattern, description, suggested fix)
    (r'やで[。！\n]', '関西弁語尾「やで」', '「です」「ました」に変更'),
    (r'やな[。！\n]', '関西弁語尾「やな」', '「ですね」「ましたね」に変更'),
    (r'やねん[。！\n]', '関西弁語尾「やねん」', '「なんです」「だからです」に変更'),
    (r'からや[。！\n]', '関西弁語尾「からや」', '「からです」「ためです」に変更'),
    (r'ちゃう[。！\n？か]', '関西弁「ちゃう」', '「ではありません」「違います」に変更'),
    (r'ええわけやない', '関西弁「ええわけやない」', '「ではありません」「よくありません」に変更'),
    (r'\bワイ\b', '関西弁一人称「ワイ」', '「私」「筆者」または削除'),
    (r'やんか[。！\n]', '関西弁「やんか」', '「じゃないですか」「ですよね」に変更'),
    (r'あかんで[。！\n]', '関西弁「あかんで」', '「いけません」「避けましょう」に変更'),
    (r'せやから', '関西弁「せやから」', '「だから」「なので」に変更'),
    (r'そやから', '関西弁「そやから」', '「だから」「なので」に変更'),
]

# Layer 2: AI典型構文（banned-phrases.md 教材向けサブセット）
AI_PHRASE_PATTERNS: list[tuple[str, str, str]] = [
    (r'することができます', 'AI構文「することができます」', '「できます」に変更'),
    (r'これにより', 'AI構文「これにより」', '「だから」「なので」「よって」に変更'),
    (r'と言えるでしょう', 'AI構文「と言えるでしょう」', '「です」「になります」に変更'),
    (r'ではないでしょうか[。、]', 'AI構文「ではないでしょうか」', '「ですよね」「だと思います」に変更'),
    (r'いかがでしたでしょうか', 'AI構文「いかがでしたでしょうか」', '削除する'),
    (r'ここでは.{0,20}について解説します', 'AI構文「ここでは〜について解説します」', '削除して本文から始める'),
    (r'さまざまな場面で', 'AI構文「さまざまな場面で」', '削除するか具体例を書く'),
    (r'言うまでもありません', 'AI構文「言うまでもありません」', '削除する'),
    (r'あらゆる観点から', 'AI構文「あらゆる観点から」', '削除するか具体項目を列挙'),
    (r'重要な示唆を与えて', 'AI構文「重要な示唆を与えて」', '「〜が分かります」に変更'),
    (r'浮き彫りにして', 'AI構文「浮き彫りにして」', '「〜が分かった」に変更'),
    (r'注目に値する', 'AI構文「注目に値する」', '削除する'),
]

# Layer 3: 英語直訳調マーカー（誤検出リスクの低いものだけ）
TRANSLATION_PATTERNS: list[tuple[str, str, str]] = [
    (r'することは可能です', '直訳調「することは可能です」', '「できます」に変更'),
    (r'について言及', '直訳調「について言及」', '「について」「を紹介」に変更'),
    (r'に関しても同様です', '直訳調「に関しても同様です」', '「も同じです」に変更'),
    (r'を実施することができます', '直訳調「を実施することができます」', '「できます」に変更'),
]


def check_tone(filepath: str) -> bool:
    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    plain_lines = strip_code_blocks(content)
    findings: list[tuple[int, str, str, str]] = []

    for lineno, line in plain_lines:
        # 引用行（> で始まる行）はスキップ
        if line.strip().startswith('>'):
            continue

        for pattern, description, fix in KANSAI_PATTERNS:
            if re.search(pattern, line):
                findings.append((lineno, description, fix, line.strip()))

        for pattern, description, fix in AI_PHRASE_PATTERNS:
            if re.search(pattern, line):
                findings.append((lineno, description, fix, line.strip()))

        for pattern, description, fix in TRANSLATION_PATTERNS:
            if re.search(pattern, line):
                findings.append((lineno, description, fix, line.strip()))

    if findings:
        print(f"❌ 文体チェックFAIL: {filepath}")
        print(f"  {len(findings)} 件の問題を検出")
        print()
        for lineno, description, fix, text in findings:
            preview = text[:60] + ('...' if len(text) > 60 else '')
            print(f"  行 {lineno}: [{description}]")
            print(f"    → 推奨: {fix}")
            print(f"    本文: {preview}")
            print()
        return False

    print(f"✅ 文体チェックPASS: {filepath}")
    return True


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("使用法: python3 script/check_tone.py <filepath>")
        sys.exit(1)

    success = check_tone(sys.argv[1])
    sys.exit(0 if success else 1)
