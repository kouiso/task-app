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

### Upstream revision

- Commit: `780f29a` (hana652/tech-writing-pack, "Update README.md")
- Retrieved: 2026-10-30 (`git archive 780f29a`, contents unmodified — no reformatting, so no
  CC BY change notice is required for the vendored files themselves)
- Verified by: `.github/ci/phase/vendor-files.sh` compares every file below with `sha256sum -c`.
  A file added, removed, or edited without updating this list fails CI.

<!-- BEGIN hana652-sha256 -->
```text
476374d5c07db69a9c3ed7382bdaa4dd7bc53100aa50fa129661a5a9b617da22  .gitignore
abc0909942b0904638bcf338a76c32d1d064b7b919c71dfea95a505b1afd9aae  LICENSE
235617539496033da39a906da94f7530dc0338b9609133f986373198e7c1aa4a  README.md
1769fd9e9d02c5909ea876b19b3a5451c5b6deafc2c20b6ac5ee9db3d3ce469f  checklist.md
654673c113be6936345da7d644001a2ade81f8e5a1fbeb130b7a00327f154dc4  examples/after.md
e53d93b9b3eac646f8470404dfa7761aae290dd69629fc9730791618634637e3  examples/before.md
5cbf9d11540fd60243485866b3d2f4f751025b4d751a1eaf7b4f29886f42ce58  examples/comparison.html
27be834465bb198dda31b63091d5fba789f49590f863f2fe56b7f25054199216  guides/01-seo-for-dev-blogs.md
f1a21cbc815168a2e69c5d926b46aff7b9b3bc8990174d68d1fd995b9507abf0  guides/02-article-structures.md
f33166e161cf31e53a9eacf930be59fb0a8a05605152c5eafe52da92c5edb382  guides/03-anti-ai.md
908617026efb5ae47e1508c677f1fac17e5b8d4e3748884346589e7984021c1a  guides/04-collocation.md
d0b0d9066990f267891b0b1d5a0874f9546a59a5db5e4c249f38c0efe2585703  guides/05-technical-writing.md
f316b45d1ce986cba064e9e47c71ddf50cf3a5b2240343e18bde9752fafb0fb0  guides/06-rewriting-prompts.md
b0c384c4c03417e8ea9d018b002f653e9b1a680ded9af8acd1e7f441da3b6d9f  guides/07-ai-buntai-laws.md
46a28272729e45c93b24fed058256f175e8fdf0e598843d22fe53f1602243325  guides/08-ai-buntai-ruleset.md
c9635efa65832b8571cd036f55a85628eb6d077c370355c951f54645ce6d463c  guides/09-ai-writing-manual.md
78f8520682b30b1f395864093690f57ec7eb8b0d225307c2159395f59faf55bc  guides/10-ai-buntai-handoff.md
77ca5fdb4204de5acf85dd7ac772a7a81ade84f20773338d72b1faccb89280b0  scripts/ai-smell-lint.py
b3511acbfc7062122d4bfb11dce2eba8140e78d4e5ddf3b87daf7aacfd550bbc  scripts/writing-lint.py
```
<!-- END hana652-sha256 -->

### Guides used

| Path | Content |
|---|---|
| `guides/04-collocation.md` | コロケーション — 偏愛語一覧・実体判定・語選択ミス表 |
| `guides/03-anti-ai.md` | AIっぽさの5つの不在 + 症状①〜⑮ |
| `guides/05-technical-writing.md` | 技術文章の基礎（一文一意・文長・主述近接 等） |
| `guides/07-ai-buntai-laws.md` | 密度の考え方（同じ技法も回数が増えると AI 臭になる） |
| `guides/08-ai-buntai-ruleset.md` | ルールセット。教材に効く項目だけを SKILL.md に採用（採否は SKILL.md の表） |
| `scripts/writing-lint.py` | `scripts/curriculum-qa/run_writing_lint.py` から呼ぶ（本体は無改変） |

Not used for curriculum writing: `guides/01` (SEO), `guides/02` (blog article structures),
`guides/09` (SEO/AIO manual), `guides/10` (handoff for blog drafting). Reasons are in SKILL.md.

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
