const _path = require('node:path');
const micromatch = require('micromatch');

module.exports = {
  '*': (allFiles) => {
    // Biomeが対応するファイル (.js, .jsx, .ts, .tsx, .json)
    const biomeFiles = micromatch(allFiles, [
      '**/*.js',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx',
      '**/*.json',
    ]);

    const stylelintFiles = micromatch(allFiles, ['**/*.(css|scss)']);

    const commands = [];

    // TypeScript compilation check
    commands.push('tsc --noEmit');

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
