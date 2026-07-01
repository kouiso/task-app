const path = require('node:path');
const micromatch = require('micromatch');

const filterFilesByPattern = (files, patterns) => micromatch(files, patterns);

const excludeDistribution = (files) =>
  micromatch.not(files, ['**/scripts/_**', '**/package-lock.json']);
const getTypeScriptFiles = (files) =>
  filterFilesByPattern(excludeDistribution(files), ['**/*.ts', '**/*.tsx']);
const getBiomeFiles = (files) =>
  filterFilesByPattern(excludeDistribution(files), [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '**/*.json',
  ]);
const getMaterialMdFiles = (files) => filterFilesByPattern(files, ['**/material/**/*.md']);
// check_quality.sh は tutorial ステップファイル(dayXX_*.md)のみ対象
const getMaterialDayFiles = (files) =>
  filterFilesByPattern(files, ['**/material/**/day[0-9][0-9]_*.md']);
const createTypeCheckCommand = (files) =>
  `npx tsc-files --noEmit ${files.map((f) => path.relative(process.cwd(), f)).join(' ')}`;

module.exports = {
  '*': (allFiles) => {
    const commands = [];

    const typeScriptFiles = getTypeScriptFiles(allFiles);
    const biomeFiles = getBiomeFiles(allFiles);
    const materialMdFiles = getMaterialMdFiles(allFiles);
    const materialDayFiles = getMaterialDayFiles(allFiles);

    // TypeScript compilation check (変更ファイルのみ - 高速化)
    if (typeScriptFiles.length) {
      commands.push(createTypeCheckCommand(typeScriptFiles));
    }

    // Biome check (lint + format)
    if (biomeFiles.length) {
      commands.push(`biome check --write ${biomeFiles.join(' ')}`);
    }

    // 教材品質ゲート
    // Gate 1: 文章衛生(textlint) — material/**/*.md 全体
    if (materialMdFiles.length) {
      commands.push(`npx textlint ${materialMdFiles.join(' ')}`);
    }
    // Gate 2: 品質チェック(check_quality.sh) — dayXX_*.md のみ (index/appendix は対象外)
    if (materialDayFiles.length) {
      for (const f of materialDayFiles) {
        commands.push(`bash scripts/curriculum-qa/check_quality.sh ${f}`);
      }
    }

    return commands;
  },
};
