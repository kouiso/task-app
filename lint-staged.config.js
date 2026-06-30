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
const createTypeCheckCommand = (files) =>
  `npx tsc-files --noEmit ${files.map((f) => path.relative(process.cwd(), f)).join(' ')}`;

module.exports = {
  '*': (allFiles) => {
    const commands = [];

    const typeScriptFiles = getTypeScriptFiles(allFiles);
    const biomeFiles = getBiomeFiles(allFiles);
    const materialMdFiles = getMaterialMdFiles(allFiles);

    // TypeScript compilation check (変更ファイルのみ - 高速化)
    if (typeScriptFiles.length) {
      commands.push(createTypeCheckCommand(typeScriptFiles));
    }

    // Biome check (lint + format)
    if (biomeFiles.length) {
      commands.push(`biome check --write ${biomeFiles.join(' ')}`);
    }

    // 教材品質ゲート: 文章衛生(textlint) + 品質チェック
    if (materialMdFiles.length) {
      commands.push(`npx textlint ${materialMdFiles.join(' ')}`);
      // check_quality.sh は単一ファイル引数のためperファイルで実行
      for (const f of materialMdFiles) {
        commands.push(`bash script/check_quality.sh ${f}`);
      }
    }

    return commands;
  },
};
