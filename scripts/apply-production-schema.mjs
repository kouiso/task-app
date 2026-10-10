// filepath: scripts/apply-production-schema.mjs

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { parse } from 'dotenv';

function readSecret(
  message = 'DB 管理画面の接続 URL を貼り付けて Enter（表示されません。Ctrl+C / Esc で取消）: ',
) {
  const input = process.stdin;
  if (!input.isTTY || !process.stdout.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error(
      '秘密値の入力には対話できる端末が必要です。パイプや出力転送を外して実行してください。',
    );
  }
  return new Promise((resolve, reject) => {
    const previousRaw = input.isRaw;
    const previousFlowing = input.readableFlowing;
    const decoder = new StringDecoder('utf8');
    let value = '';
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      input.removeListener('data', onData);
      input.removeListener('error', onFailure);
      input.removeListener('end', onFailure);
      input.removeListener('close', onFailure);
      process.removeListener('SIGINT', onCancel);
      try {
        input.setRawMode(previousRaw);
        if (previousFlowing) input.resume();
        else input.pause();
        process.stdout.write('\n');
      } catch {
        error = new Error('端末の入力状態を戻せませんでした。端末を開き直してください。');
      }
      if (error) reject(error);
      else resolve(value);
      value = '';
    };
    const onCancel = () => finish(new Error('DB への反映を中止しました。'));
    const onFailure = () =>
      finish(new Error('秘密値を読み取れませんでした。DB への反映を中止しました。'));
    const onData = (chunk) => {
      const text = typeof chunk === 'string' ? chunk : decoder.write(chunk);
      if (['\u0003', '\u0004', '\u001b'].some((key) => text.includes(key))) return onCancel();
      const newline = text.search(/[\r\n]/u);
      const body = newline < 0 ? text : text.slice(0, newline);
      if (newline >= 0 && !/^(?:\r\n|\r|\n)$/u.test(text.slice(newline))) {
        return finish(new Error('入力は1行だけにしてください。DB への反映を中止しました。'));
      }
      for (const character of body) {
        if (character === '\b' || character === '\u007f') value = [...value].slice(0, -1).join('');
        else if (character.codePointAt(0) < 32) return onFailure();
        else value += character;
      }
      if (value.length > 16384) return onFailure();
      if (newline >= 0) finish();
    };
    input.on('data', onData);
    input.on('error', onFailure);
    input.on('end', onFailure);
    input.on('close', onFailure);
    process.on('SIGINT', onCancel);
    try {
      input.setRawMode(true);
      input.resume();
      process.stdout.write(message);
    } catch {
      onFailure();
    }
  });
}

function run(args, env = process.env, stdio = 'inherit') {
  const result = spawnSync('npx', args, { stdio, env, shell: false });
  if (result.error || result.status !== 0) {
    throw new Error('コマンドが失敗しました。直前の表示を確認してください。');
  }
}

let directory;
try {
  if (process.platform === 'win32')
    throw new Error('Windows では WSL2 の Ubuntu ターミナルから実行してください。');
  run(['vercel', 'link']);
  // 作成した専用フォルダだけを最後に削除するためです。
  directory = mkdtempSync(join(tmpdir(), 'task-app-production-'));
  process.stdout.write(`一時フォルダ: ${directory}\n`);
  const file = join(directory, 'production.env');
  run(['vercel', 'env', 'pull', file, '--environment=production']);
  const values = parse(readFileSync(file));
  // 確認待ちや DB 反映中に中断しても、接続情報ファイルを残さないためです。
  rmSync(directory, { recursive: true, force: true });
  if (!values.DATABASE_URL?.trim()) {
    throw new Error('Production の DATABASE_URL がありません。Vercel の設定を確認してください。');
  }
  if (values.DATABASE_URL.trim() === '[SENSITIVE]') {
    process.stdout.write(
      'Vercel の Sensitive 設定は変更しません。DB 管理画面で教材用 DB の接続 URL を確認してください。\n',
    );
    values.DATABASE_URL = await readSecret();
  }
  let target;
  try {
    if (
      [...values.DATABASE_URL].some(
        (character) => character.codePointAt(0) < 32 || character === '\u007f',
      )
    )
      throw new Error();
    target = new URL(values.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL の形式を確認してください。値は共有しないでください。');
  }
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !target.hostname ||
    target.pathname.length < 2
  ) {
    throw new Error('PostgreSQL のホスト名と DB 名が必要です。');
  }
  process.stdout.write(`接続先ホスト: ${target.host} DB: ${target.pathname.slice(1)}\n`);
  // 接続 URL と一緒に貼り付けられた別の行を、反映の確認に使わないためです。
  const confirmation = `apply ${randomBytes(4).toString('hex')}`;
  const answer = await readSecret(
    `上のホスト・DB が教材用の新規・空の DB と確認できたら ${confirmation} と入力して Enter（表示されません。Ctrl+C / Esc で取消）: `,
  );
  if (answer !== confirmation) throw new Error('確認が一致しないため、DB への反映を中止しました。');
  // 親の接続先やローカル .env より、今回取得した接続先を優先するためです。
  const env = { ...process.env, DATABASE_URL: values.DATABASE_URL };
  delete env.DOTENV_CONFIG_OVERRIDE;
  // 未導入の Prisma の自動取得と、遅い入力によるデータ損失への同意を止めるためです。
  run(['--yes=false', 'prisma', 'db', 'push', '--skip-generate'], env, [
    'ignore',
    'inherit',
    'inherit',
  ]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (directory) rmSync(directory, { recursive: true, force: true });
}
