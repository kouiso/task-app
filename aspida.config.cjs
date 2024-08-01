// HACK: cjsにしないとtypescriptでエラーになる
/** @type {Partial<import('aspida/dist/getConfigs').AspidaConfig>} */
const aspidaConfig = {
  input: 'src/lib/aspida/',
  openapi: { inputFile: 'http://localhost:3002/swagger-json' }, // URLを直接指定
};

module.exports = aspidaConfig;
