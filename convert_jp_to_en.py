#!/usr/bin/env python3
"""
Convert Japanese prompts to English with Japanese comments.
日本語プロンプトを英語に変換し、日本語訳をコメントとして付与します。
"""

import glob
import re
from pathlib import Path

# Files to process
prompt_files = glob.glob('edu-creator/prompt/**/*.py', recursive=True)

# Dictionary of replacements for each file
replacements = {
    'edu-creator/prompt/agent/content_pm.py': [
        {
            'old': '''CONTENT_PM_ROLE: str = "Content Project Manager"
"""
The Content PM's role in the crew.

コンテンツPMのクルー内での役割。
コンテンツプロジェクトマネージャー - 構成と流れの品質を担当。
"""''',
            'new': '''CONTENT_PM_ROLE: str = "Content Project Manager"
"""
The Content PM's role in the crew.

# コンテンツPMのクルー内での役割。
# コンテンツプロジェクトマネージャー - 構成と流れの品質を担当。
"""'''
        },
        {
            'old': '''CONTENT_PM_GOAL: str = "Ensure tutorial structure guides beginners smoothly from confusion to understanding"
"""
The Content PM's primary goal.

コンテンツPMの主目標。
チュートリアルの構成が初心者を混乱から理解へスムーズに導くことを保証する。
"""''',
            'new': '''CONTENT_PM_GOAL: str = "Ensure tutorial structure guides beginners smoothly from confusion to understanding"
"""
The Content PM's primary goal.

# コンテンツPMの主目標。
# チュートリアルの構成が初心者を混乱から理解へスムーズに導くことを保証する。
"""'''
        },
        {
            'old': 'The Content PM manages structure, flow, and storytelling of the tutorial.\nコンテンツPMはチュートリアルの構成、流れ、ストーリーテリングを管理する。',
            'new': 'The Content PM manages structure, flow, and storytelling of the tutorial.\n# コンテンツPMはチュートリアルの構成、流れ、ストーリーテリングを管理する。'
        },
    ]
}

def process_file(filepath):
    """Process a single file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if filepath in replacements:
        for replacement in replacements[filepath]:
            if replacement['old'] in content:
                content = content.replace(replacement['old'], replacement['new'])
                print(f"✓ Replaced in {filepath}")
            else:
                print(f"⚠ Could not find pattern in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filepath in prompt_files:
    if filepath in replacements:
        process_file(filepath)

print("✓ All replacements completed!")
