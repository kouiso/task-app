---
applyTo: "**/*.prisma,**/prisma/**/*,**/*.ts,**/*.tsx"
---

# Prisma規約

## インポートルール

- インポートパス: `@prismaClient`必須
- 他エイリアス禁止

## 型定義ルール

- Prisma生成型積極利用、独自型再定義回避
- 独自型定義 → Prisma型定義置換積極実施
- `$Enums`禁止、`@prismaClient`からEnum型import

## クエリルール

- 直接SQL禁止（embedding以外）、Prisma必須使用
