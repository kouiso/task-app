/* eslint-disable */
/**
 * huskyでpost-merge | post-checkoutされたときにpackage.jsonの変更があったらyarn installする、
 */
const { execSync } = require('child_process')

try {
  const stdout = execSync("git diff 'HEAD@{1}' --name-only").toString('utf-8')
  const changedFiles = stdout
    .trim()
    .split('\n')
    .filter((name) => ['package.json'].includes(name))
  // 他のファイル、たとえば `api.yaml` もチェックしたいなら配列に追加する

  if (changedFiles.length > 0) {
    execSync('yarn install', { stdio: 'inherit' })
  }
} catch (e) {
  console.warn(e)
  console.log('you need yarn install.')
}

process.exit(0)
