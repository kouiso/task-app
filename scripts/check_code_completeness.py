#!/usr/bin/env python3
"""script/ 配下にあるコード完全性チェック本体を呼び出す互換ラッパー。"""

from pathlib import Path
import runpy

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "script" / "check_code_completeness.py"
runpy.run_path(str(SCRIPT_PATH), run_name="__main__")
