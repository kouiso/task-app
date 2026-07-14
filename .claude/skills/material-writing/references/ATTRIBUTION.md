# Attribution

## hana652/tech-writing-pack (CC BY 4.0)

Source: **hana652/tech-writing-pack** (CC BY 4.0)  
Files are vendored (directly embedded) into this repository.

Original repository: https://github.com/hana652/tech-writing-pack  
License: Creative Commons Attribution 4.0 International (CC BY 4.0)

### Vendored location

```
.claude/skills/material-writing/hana652-tech-writing-pack/
```

The guides are copied directly into this repository rather than tracked via git submodule,
because unattended clones/sessions never ran `git submodule update --init`, leaving the
directory empty and causing a real misreading incident (2026-07-14). Upstream improvements
must be picked up by manually re-copying changed files from the original repository.

### Guides used

| Submodule path | Content |
|---|---|
| `guides/04-collocation.md` | コロケーション — 偏愛語一覧・実体判定・語選択ミス表 |
| `guides/03-anti-ai.md` | AIっぽさの5つの不在 + 症状①〜⑮ |
| `guides/05-technical-writing.md` | 技術文章の基礎（一文一意・文長・主述近接 等） |

---

## Xamfonos/technical-writing-best-practices (MIT)

Source: **Xamfonos/technical-writing-best-practices** (MIT)  
Copyright (c) 2025 Henry Bassey  
Files are vendored (directly embedded) into this repository.

Original repository: https://github.com/Xamfonos/technical-writing-best-practices  
License: MIT License

### Vendored location

```
.claude/skills/material-writing/xamfonos-technical-writing-best-practices/
```

Vendored (not tracked as a git submodule) for the same reason as hana652 above: an
uninitialized submodule silently reads as empty, which is exactly what caused the
2026-07-14 misreading incident.

26原則・5ドメイン構成の開発者向けライティングスキル。教材レジスタでは開発者向けのトーン
（箇条書き禁止・ピアトーン）は採らず、以下3原則の考え方だけを「なぜを教える」節で使う。

### 原則の抜粋使用

| Submodule path | 原則 | 教材レジスタでの適用 |
|---|---|---|
| `SKILL.md:137` | Introduced Abstractions | 手続きの前に、その手続きが解く問題を示す |
| `SKILL.md:205` | Mental Model Anchoring | 新しい概念は既に知っている論理構造に結びつける |
| `SKILL.md:225` | Layered Insight | 段階的な洞察。1日で全部渡さず前の日の理解の上に積む |

他23原則（開発者向けトーンを前提とするもの）は未使用。
