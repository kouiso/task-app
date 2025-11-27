const path = require('node:path');
const micromatch = require('micromatch');

const filterFilesByPattern = (files, patterns) => micromatch(files, patterns);

const getTypeScriptFiles = (files) => filterFilesByPattern(files, ['**/*.ts', '**/*.tsx']);
const getBiomeFiles = (files) =>
  filterFilesByPattern(files, ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.json']);
const getStylelintFiles = (files) => filterFilesByPattern(files, ['**/*.(css|scss)']);

const createTypeCheckCommand = (files) =>
  `npx tsc-files --noEmit ${files.map((f) => path.relative(process.cwd(), f)).join(' ')}`;

module.exports = {
  '*': (allFiles) => {
    const commands = [];

    const typeScriptFiles = getTypeScriptFiles(allFiles);
    const biomeFiles = getBiomeFiles(allFiles);
    const stylelintFiles = getStylelintFiles(allFiles);

    // TypeScript compilation check (変更ファイルのみ - 高速化)
    if (typeScriptFiles.length) {
      commands.push(createTypeCheckCommand(typeScriptFiles));
    }

    // Biome check (lint + format)
    if (biomeFiles.length) {
      commands.push(`biome check --write ${biomeFiles.join(' ')}`);
    }

    // Stylelint for CSS files (Biomeは現在CSSに対応していない)
    if (stylelintFiles.length) {
      commands.push(`stylelint --fix ${stylelintFiles.join(' ')}`);
    }

    return commands;
  },
};
