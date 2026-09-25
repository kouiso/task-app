#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const dotenv = require('dotenv');
const DISTRO_LABEL = 'io.taskapp.scaffold.wsl-distro';
const OWNER_LABEL = 'io.taskapp.scaffold.owner';
const OWNER_KEY = '_TASKAPP_SCAFFOLD_DB_OWNER';

function fail(message) {
  throw new Error(message);
}

function command(args) {
  try {
    return execFileSync('docker', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    });
  } catch {
    fail(
      'Docker の状態を確認できません。Docker Desktop と docker compose の起動状態を確認してください。',
    );
  }
}

function json(args) {
  try {
    return JSON.parse(command(args));
  } catch {
    fail('Docker の構成を読み取れないため、DB の自動変更を中止しました。');
  }
}

function composeArgs(directory, args) {
  return [
    'compose',
    '--project-directory',
    directory,
    '-f',
    path.join(directory, 'docker-compose.yml'),
    ...args,
  ];
}

function connection(config, serviceName) {
  const service = config.services?.[serviceName];
  const ports = service?.ports?.filter(
    (port) => Number(port.target) === 5432 && (port.protocol ?? 'tcp') === 'tcp',
  );
  if (!service || ports?.length !== 1 || !/^\d+$/.test(String(ports[0].published))) {
    fail('教材の PostgreSQL 公開ポートを特定できません。docker-compose.yml を確認してください。');
  }
  const port = Number(ports[0].published);
  if (port < 1 || port > 65535 || !['', '0.0.0.0', '127.0.0.1'].includes(ports[0].host_ip ?? '')) {
    fail('教材の PostgreSQL はこのパソコンのポートで起動してください。');
  }
  return { port, service };
}

function validateUrl(value, config) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('DATABASE_URL が正しくありません。教材の .env の設定を確認してください。');
  }
  const { port, service } = connection(config, 'db');
  const env = service.environment ?? {};
  if (
    !['postgresql:', 'postgres:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    Number(url.port || 5432) !== port ||
    decodeURIComponent(url.pathname.slice(1)) !== env.POSTGRES_DB ||
    decodeURIComponent(url.username) !== env.POSTGRES_USER ||
    decodeURIComponent(url.password) !== env.POSTGRES_PASSWORD ||
    url.hash ||
    [...url.searchParams].some(([key, item]) => key !== 'schema' || item !== 'public')
  ) {
    fail(
      'DATABASE_URL が今回起動する教材用 DB と一致しません。シェルの DATABASE_URL と .env の接続先・ポートを確認してください。別の DB は自動変更しません。',
    );
  }
  // localhost が別の IPv6 リスナーへ解決されないよう、検査する IPv4 接続先へ固定する。
  url.hostname = '127.0.0.1';
  return url.href;
}

function distroName(environment, kernelVersion) {
  const name = environment.WSL_DISTRO_NAME ?? '';
  if (/microsoft/i.test(kernelVersion) && !name) {
    fail(
      'WSL の Ubuntu 名を確認できません。Windows のスタートメニューから Ubuntu を開き直してください。',
    );
  }
  return name;
}

function readOwner(filename) {
  if (!fs.lstatSync(filename).isFile())
    fail('.env は今回の作業フォルダ内の通常ファイルにしてください。');
  const source = fs.readFileSync(filename, 'utf8');
  const count = (source.match(/^\s*(?:export\s+)?_TASKAPP_SCAFFOLD_DB_OWNER\s*(?:=|:\s)/gm) ?? [])
    .length;
  if (count > 1)
    fail(
      '.env の DB 所有印が複数あります。DB は変更しません。付録の「DB 所有印が複数ありますと表示された場合」に従って復旧してください。',
    );
  const owner = dotenv.parse(source)[OWNER_KEY];
  if (
    count === 1 &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(owner ?? '')
  ) {
    fail('.env の DB 所有印が正しくありません。既存 DB は変更しません。');
  }
  return owner;
}

function projectOwner(filename, environment) {
  let owner = readOwner(filename);
  if (Object.hasOwn(environment, OWNER_KEY) && environment[OWNER_KEY] !== owner) {
    fail(
      'DB の所有印が .env とターミナルで異なります。unset _TASKAPP_SCAFFOLD_DB_OWNER を実行してからやり直してください。',
    );
  }
  if (!owner) {
    const generated = randomUUID();
    // 再展開やWSL再導入後の同じパスを、以前のDBの所有者と誤認しないため保存する。
    fs.appendFileSync(filename, `\n${OWNER_KEY}=${generated}\n`);
    owner = readOwner(filename);
    if (owner !== generated)
      fail('DB 所有印の作成中に .env が変わりました。DB は変更していません。');
  }
  return owner;
}

function validateOwnership(
  directory,
  config,
  containers,
  volumes,
  distro = process.env.WSL_DISTRO_NAME ?? '',
  owner,
) {
  if (!owner) fail('今回の作業フォルダの DB 所有印がありません。');
  for (const name of ['db', 'test-db']) {
    if ((config.services?.[name]?.labels?.[DISTRO_LABEL] ?? '') !== distro) {
      fail(
        '教材用 Docker 設定と現在の Ubuntu 名が一致しません。配布 ZIP の docker-compose.yml を確認してください。',
      );
    }
    if (config.services?.[name]?.labels?.[OWNER_LABEL] !== owner) {
      fail(
        '教材用 Docker 設定の所有印が .env と一致しません。新しい配布物の Docker 設定を確認してください。',
      );
    }
  }
  for (const container of containers) {
    const labels = container.Config?.Labels ?? {};
    if (
      labels['com.docker.compose.project'] !== config.name ||
      labels['com.docker.compose.project.working_dir'] !== directory ||
      (labels[DISTRO_LABEL] ?? '') !== distro ||
      labels[OWNER_LABEL] !== owner
    ) {
      fail(
        '同じ Compose project 名を別のフォルダが使用しています。既存コンテナは変更しません。付録の「別フォルダの DB と衝突した場合」に従って名前とポートを分けてください。',
      );
    }
  }
  for (const [key, definition] of Object.entries(config.volumes ?? {})) {
    if (definition.labels?.[OWNER_LABEL] !== owner)
      fail('教材用 volume の所有印が .env と一致しません。');
    if ((definition.labels?.[DISTRO_LABEL] ?? '') !== distro) {
      fail(
        '教材用 volume の Ubuntu 名が現在の環境と一致しません。配布 ZIP の Docker 設定を確認してください。',
      );
    }
    if (definition.external)
      fail('外部 volume は自動初期化しません。教材用の docker-compose.yml を確認してください。');
    const volume = volumes.find((item) => item.Name === definition.name);
    if (!volume) continue;
    const labels = volume.Labels ?? {};
    const owned = containers.some(
      (container) =>
        container.Config?.Labels?.['com.docker.compose.service'] === 'db' &&
        container.Mounts?.some(
          (mount) => mount.Name === volume.Name && mount.Destination === '/var/lib/postgresql/data',
        ),
    );
    if (
      labels['com.docker.compose.project'] !== config.name ||
      labels['com.docker.compose.volume'] !== key ||
      !owned ||
      (labels[DISTRO_LABEL] ?? '') !== distro ||
      labels[OWNER_LABEL] !== owner
    ) {
      fail(
        '既存 volume がこの作業フォルダの DB に属することを確認できません。既存データは変更しません。付録の「別フォルダの DB と衝突した場合」を確認してください。',
      );
    }
  }
}

function inspect(directory) {
  // 別WSLの同一パスは別フォルダ実体なので、文字列の作業パスだけで同一視しない。
  const kernelVersion = fs.existsSync('/proc/version')
    ? fs.readFileSync('/proc/version', 'utf8')
    : '';
  const distro = distroName(process.env, kernelVersion);
  if (process.env.DOCKER_HOST && !/^(unix|npipe):\/\//.test(process.env.DOCKER_HOST)) {
    fail(
      '遠隔 Docker では DB を自動初期化しません。ローカルの Docker Desktop または Docker Engine を使ってください。',
    );
  }
  const context = command(['context', 'show']).trim();
  const endpoint = json(['context', 'inspect', context])[0]?.Endpoints?.docker?.Host;
  if (!/^(unix|npipe):\/\//.test(endpoint ?? ''))
    fail('ローカル Docker の接続先を確認できないため、DB の自動変更を中止しました。');
  const owner = projectOwner(path.join(directory, '.env'), process.env);
  const config = json(composeArgs(directory, ['config', '--format', 'json']));
  if (!config.name) fail('Compose project 名を確認できません。');
  connection(config, 'db');
  connection(config, 'test-db');
  const ids = command(['ps', '-aq', '--filter', `label=com.docker.compose.project=${config.name}`])
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const containers = ids.length ? json(['inspect', ...ids]) : [];
  const names = command(['volume', 'ls', '--format', '{{.Name}}']).trim().split('\n');
  const existing = Object.values(config.volumes ?? {})
    .map((item) => item.name)
    .filter((name) => names.includes(name));
  const volumes = existing.length ? json(['volume', 'inspect', ...existing]) : [];
  validateOwnership(directory, config, containers, volumes, distro, owner);
  if (
    process.env.DOTENV_CONFIG_PATH &&
    path.resolve(process.env.DOTENV_CONFIG_PATH) !== path.join(directory, '.env')
  ) {
    fail(
      '別の dotenv 設定ファイルを指定した状態では DB を自動変更しません。DOTENV_CONFIG_PATH を確認してください。',
    );
  }
  if (
    process.env.DOTENV_CONFIG_OVERRIDE ||
    process.env.DOTENV_KEY ||
    process.env.DOTENV_CONFIG_DOTENV_KEY ||
    (process.env.DOTENV_CONFIG_ENCODING && process.env.DOTENV_CONFIG_ENCODING !== 'utf8')
  ) {
    fail(
      'dotenv の読込方法が教材と異なるため DB を自動変更しません。DOTENV_CONFIG_OVERRIDE・DOTENV_KEY・DOTENV_CONFIG_DOTENV_KEY・DOTENV_CONFIG_ENCODING を確認してください。',
    );
  }
  const fileEnv = dotenv.parse(fs.readFileSync(path.join(directory, '.env')));
  const databaseUrl = validateUrl(process.env.DATABASE_URL ?? fileEnv.DATABASE_URL, config);
  return { config, containers, databaseUrl };
}

function validateRunning(config, containers) {
  const port = connection(config, 'db').port;
  const databases = containers.filter(
    (item) => item.Config?.Labels?.['com.docker.compose.service'] === 'db',
  );
  if (
    databases.length !== 1 ||
    !databases[0].State?.Running ||
    !databases[0].NetworkSettings?.Ports?.['5432/tcp']?.some(
      (item) => Number(item.HostPort) === port && ['0.0.0.0', '127.0.0.1'].includes(item.HostIp),
    )
  ) {
    fail(
      '教材用 DB コンテナが接続先ポートを公開していません。別の PostgreSQL へは書き込みません。',
    );
  }
}

function main(action, serviceName) {
  const directory = fs.realpathSync(process.cwd());
  const state = inspect(directory);
  if (action === 'preflight') return;
  if (action === 'port') {
    if (!['db', 'test-db'].includes(serviceName)) fail('DB サービス名が正しくありません。');
    process.stdout.write(String(connection(state.config, serviceName).port));
    return;
  }
  if (action !== 'initialize') fail('DB 検証の実行方法が正しくありません。');
  validateRunning(state.config, state.containers);
  // 検査後に dotenv の別経路から接続先が変わらないよう、子プロセスへ同じ値を渡す。
  const env = { ...process.env, DATABASE_URL: state.databaseUrl };
  const commands = [
    ['npx', ['prisma', 'db', 'push']],
    ['npx', ['prisma', 'generate']],
  ];
  if (fs.existsSync('src/command/seed.ts'))
    commands.push(['npm', ['run', 'db:seed', '--', '--yes']]);
  for (const [executable, args] of commands) {
    // 初期導入だけを自動化し、seed の --yes を非対話経路で明示的に使う。
    if (args[1] === 'db:seed')
      // stdout が pipe だと process.stdout.write は非同期で子プロセスの出力と
      // 入れ替わり得るため、fd へ直接書いて「投入しています」の先行を保証する。
      fs.writeSync(1, 'シードデータを投入しています...\n');
    const result = spawnSync(executable, args, { env, stdio: ['ignore', 'inherit', 'inherit'] });
    if (result.error || result.status !== 0)
      fail('DB セットアップに失敗しました。直前のエラーを確認してください。');
  }
}

module.exports = {
  connection,
  validateUrl,
  validateOwnership,
  validateRunning,
  composeArgs,
  distroName,
  projectOwner,
};
if (require.main === module) {
  try {
    main(process.argv[2], process.argv[3]);
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    process.exitCode = 1;
  }
}
