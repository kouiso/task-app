const path = require('path');
const micromatch = require('micromatch');

const buildEslintCommand = (filenames) =>
  `next lint --fix --file ${filenames.map((f) => path.relative(process.cwd(), f)).join(' --file ')}`;

const buildStylelintCommand = (filenames) => `stylelint --fix ${filenames.join(' ')}`;

module.exports = {
  '*': (allFiles) => {
    console.log('Checking files...', allFiles);
    const eslintFiles = micromatch(allFiles, ['**/*.ts', '**/*.tsx']);
    const prettierFiles = micromatch(allFiles, ['**/*.(js|json|ts|tsx)']);
    const stylelintFiles = micromatch(allFiles, ['**/*.(css|scss)']);

    const commands = [];

    // Add TypeScript compilation check
    commands.push('tsc --noEmit');

    // Add ESLint command if there are ESLint files
    if (eslintFiles.length) {
      commands.push(buildEslintCommand(eslintFiles));
    }

    // Add Prettier command if there are Prettier files
    if (prettierFiles.length) {
      commands.push(`prettier --write ${prettierFiles.join(' ')}`);
    }

    // Add Stylelint command if there are Stylelint files
    if (stylelintFiles.length) {
      commands.push(buildStylelintCommand(stylelintFiles));
    }

    return commands;
  },
};
