/* global process, fetch, URLSearchParams, setTimeout, module */
// Devin Slack 起動リレーの共通ロジック。
// devin-slack-trigger.yml (issues:labeled) と devin-slack-retry.yml (schedule) の両方から呼ばれる。
//
// 状態は issue コメント内のマーカー `<!-- devin-slack-triggered ts=.. status=.. tries=.. -->` と
// ラベル (devin-queued / devin-waiting / devin-failed) の二重管理。
// DEVIN_PROJECT_NUMBER が設定されていて issue がプロジェクトに含まれる場合は
// シングルセレクトフィールド `Devin` にも状態をミラーする。

const MARKER_RE = /<!-- devin-slack-triggered([^>]*)-->/;
const SESSION_URL_RE = /https:\/\/app\.devin\.ai\/sessions\/[0-9a-f]+/;
const FAILURE_RE = /Failed to create Devin|Failed to start|Failed to launch/i;
const MAX_TRIES = 36; // 10分間隔で約6時間

const STATUS_LABELS = {
  queued: 'Queued',
  pending: 'Retry pending',
  triggered: 'Running',
  done: 'Running',
  failed: 'Failed',
};

function env() {
  const e = process.env;
  return {
    slackToken: e.SLACK_BOT_TOKEN,
    slackChannel: e.SLACK_CHANNEL_ID,
    devinUserId: e.DEVIN_USER_ID,
    devinMode: e.DEVIN_MODE || '',
    triggerLabel: e.TRIGGER_LABEL || 'for-devin',
    queueLabel: e.QUEUE_LABEL || 'devin-queued',
    waitingLabel: e.WAITING_LABEL || 'devin-waiting',
    failedLabel: e.FAILED_LABEL || 'devin-failed',
    projectNumber: e.DEVIN_PROJECT_NUMBER || '',
    fieldName: e.DEVIN_FIELD_NAME || 'Devin',
  };
}

function parseMarker(body) {
  const m = MARKER_RE.exec(body || '');
  if (!m) return null;
  const attrs = {};
  for (const kv of m[1].matchAll(/(\w+)=(\S+)/g)) attrs[kv[1]] = kv[2];
  return {
    ts: attrs.ts !== undefined && attrs.ts !== '-' ? attrs.ts : null,
    status: attrs.status || 'triggered',
    tries: parseInt(attrs.tries || '0', 10),
  };
}

function buildMarker({ ts, status, tries }) {
  return `<!-- devin-slack-triggered ts=${ts || '-'} status=${status} tries=${tries || 0} -->`;
}

// `<@${DEVIN_USER_ID}>` + `!megaplan` + 任意モードコマンド。
// DEVIN_MODE は空白区切りで bang コマンド化（例: "ultra" → "!ultra"）。
// 未設定なら Devin 側のデフォルトエージェントが使われる。
function buildSlackMessage(cfg, issue) {
  const modeCmds = cfg.devinMode
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `!${t.replace(/^!+/, '')}`);
  const modeLine = modeCmds.length ? `\n${modeCmds.join(' ')}` : '';
  const safeTitle = (issue.title || '').replace(/</g, '＜').replace(/>/g, '＞');
  return `<@${cfg.devinUserId}>\n!megaplan${modeLine}\n${safeTitle}\n${issue.html_url}\nPlease handle this issue. Follow its description and comments carefully.`;
}

async function slackApi(cfg, method, params) {
  const resp = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.slackToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: cfg.slackChannel, ...params }),
  });
  return resp.json();
}

// threadTs があればスレッド返信。なければ新規トップレベル投稿。
// スレッド返信に失敗した場合は新規スレッドにフォールバックする。
async function postToSlack(cfg, text, threadTs) {
  let data;
  if (threadTs) {
    data = await slackApi(cfg, 'chat.postMessage', { text, thread_ts: threadTs });
    if (!data.ok) data = await slackApi(cfg, 'chat.postMessage', { text });
  } else {
    data = await slackApi(cfg, 'chat.postMessage', { text });
  }
  if (!data.ok) return { ok: false, error: data.error || 'unknown' };
  const pl = await slackApi(cfg, 'chat.getPermalink', { message_ts: data.ts });
  return { ok: true, ts: data.ts, permalink: pl.ok ? pl.permalink : '' };
}

async function slackReplies(cfg, ts) {
  const url = `https://slack.com/api/conversations.replies?${new URLSearchParams({
    channel: cfg.slackChannel,
    ts,
  })}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.slackToken}` },
  });
  const data = await resp.json();
  if (!data.ok) return { ok: false, error: data.error };
  return { ok: true, messages: (data.messages || []).slice(1) };
}

function inspectReplies(messages) {
  let sessionUrl = null;
  let failureText = null;
  for (const m of messages) {
    const blob = JSON.stringify(m);
    const s = SESSION_URL_RE.exec(blob);
    if (s) sessionUrl = s[0];
    if (!failureText && FAILURE_RE.test(blob)) {
      failureText = (m.text || blob).replace(/<[^>]+>/g, '').slice(0, 300);
    }
  }
  return { sessionUrl, failureText };
}

async function ensureLabel(github, repo, name, color, description) {
  try {
    await github.rest.issues.createLabel({
      owner: repo.owner,
      repo: repo.repo,
      name,
      color,
      description,
    });
  } catch (e) {
    if (e.status !== 422) throw e; // 既存なら 422
  }
}

const LABEL_DEFS = {
  'devin-queued': { color: '0e8a16', desc: 'Devin 起動を定期実行にキューイング' },
  'devin-waiting': { color: 'fbca04', desc: 'Devin 起動失敗。定期実行で再試行中' },
  'devin-failed': { color: 'd93f0b', desc: 'Devin 起動リトライ上限到達' },
};

async function syncLabels(github, repo, issueNumber, status, cfg) {
  const active =
    status === 'queued'
      ? cfg.queueLabel
      : status === 'pending'
        ? cfg.waitingLabel
        : status === 'failed'
          ? cfg.failedLabel
          : null;
  for (const name of [cfg.queueLabel, cfg.waitingLabel, cfg.failedLabel]) {
    if (name === active) continue;
    try {
      await github.rest.issues.removeLabel({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: issueNumber,
        name,
      });
    } catch {
      /* ラベル未付与なら無視 */
    }
  }
  if (active) {
    const def = LABEL_DEFS[active];
    if (def) await ensureLabel(github, repo, active, def.color, def.desc);
    try {
      await github.rest.issues.addLabels({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: issueNumber,
        labels: [active],
      });
    } catch {
      /* ignore */
    }
  }
}

function statusCommentBody({ permalink, sessionUrl, status, ts, tries, note }) {
  const statusJa = {
    queued: 'キュー済み（定期実行で起動）',
    triggered: '起動要求送信済み',
    pending: '失敗。定期実行で再試行中',
    done: 'Devin セッション起動済み',
    failed: '再試行上限到達。要手動対応',
  }[status];
  const lines = [
    ':robot_face: Devin 起動リレー',
    `- 状態: ${statusJa}`,
    `- Slack スレッド: ${permalink || 'なし'}`,
    `- Devin セッション: ${sessionUrl || '未起動'}`,
  ];
  if (note) lines.push(`- ${note}`);
  lines.push(buildMarker({ ts, status, tries }));
  return lines.join('\n');
}

async function upsertStatusComment(github, repo, issueNumber, body) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const existing = comments.find((c) => MARKER_RE.test(c.body || ''));
  if (existing) {
    await github.rest.issues.updateComment({
      owner: repo.owner,
      repo: repo.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issueNumber,
      body,
    });
  }
}

async function getMarkerEntry(github, repo, issueNumber) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const c = comments.find((x) => MARKER_RE.test(x.body || ''));
  if (!c) return null;
  const permalink = (/- Slack スレッド: (\S+)/.exec(c.body) || [])[1];
  const sessionUrl = (/- Devin セッション: (\S+)/.exec(c.body) || [])[1];
  return {
    ...parseMarker(c.body),
    permalink: permalink && permalink !== 'なし' ? permalink : null,
    sessionUrl: sessionUrl && sessionUrl !== '未起動' ? sessionUrl : null,
  };
}

// Projects V2 の Devin フィールドへ状態ミラー（ベストエフォート）。
// issue がプロジェクトに入っていない場合や権限不足は警告のみで継続。
async function mirrorProjectField(github, context, core, issueNumber, status, cfg) {
  if (!cfg.projectNumber) return;
  const option = STATUS_LABELS[status];
  if (!option) return;
  const { owner, repo } = context.repo;
  try {
    const q = `query($owner:String!,$repo:String!,$num:Int!){
      repository(owner:$owner,name:$repo){
        issue(number:$num){ projectItems(first:20){ nodes { project { id title number } id } } }
      }
      organization(login:$owner){ projectV2(number:${Number(cfg.projectNumber)}) { id
        field(name:"${cfg.fieldName}"){ ... on ProjectV2SingleSelectField { id options { id name } } }
      }}
    }`;
    const data = await github.graphql(q, { owner, repo, num: issueNumber });
    const project = data.organization?.projectV2;
    const field = project?.field;
    const item = data.repository.issue.projectItems.nodes.find((n) => n.project.id === project.id);
    if (!project || !field || !item) return; // プロジェクト非参加ならラベルのみ
    const opt = field.options.find((o) => o.name === option);
    if (!opt) return;
    await github.graphql(
      `mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){ updateProjectV2ItemFieldValue(input:{ projectId:$p itemId:$i fieldId:$f value:{ singleSelectOptionId:$o } }){ projectV2Item { id } } }`,
      { p: project.id, i: item.id, f: field.id, o: opt.id },
    );
  } catch (e) {
    core.warning(`project field mirror failed: ${e.message}`);
  }
}

// 前回のコメントからリンクを引き継いで更新する
async function finalize(github, context, core, issue, state, cfg, note) {
  const prev = await getMarkerEntry(github, context.repo, issue.number);
  const merged = {
    permalink: state.permalink || prev?.permalink,
    sessionUrl: state.sessionUrl || prev?.sessionUrl,
    ts: state.ts !== undefined ? state.ts : prev?.ts,
    status: state.status,
    tries: state.tries,
  };
  await syncLabels(github, context.repo, issue.number, merged.status, cfg);
  await upsertStatusComment(
    github,
    context.repo,
    issue.number,
    statusCommentBody({ ...merged, note }),
  );
  await mirrorProjectField(github, context, core, issue.number, merged.status, cfg);
}

// ---- トリガー側 ----

// labeled イベント時の処理。devin-queued は ack コメントのみ。
// trigger ラベルは: 重複チェック → Slack 投稿 → マーカー/status コメント。
// Slack 投稿失敗時は pending にして定期実行に引き継ぐ。
async function dispatch({ github, context, core }) {
  const cfg = env();
  const issue = context.payload.issue;
  const label = context.payload.label.name;
  const repo = context.repo;

  if (label === cfg.queueLabel) {
    await ensureLabel(
      github,
      repo,
      cfg.queueLabel,
      LABEL_DEFS[cfg.queueLabel].color,
      LABEL_DEFS[cfg.queueLabel].desc,
    );
    const prev = await getMarkerEntry(github, repo, issue.number);
    await finalize(github, context, core, issue, { ts: prev?.ts, status: 'queued', tries: 0 }, cfg);
    core.setOutput('queued', 'true');
    return;
  }

  const marker = await getMarkerEntry(github, repo, issue.number);
  // triggered のみスキップ（queued は手動で即実行へ昇格可能。pending は手動再試行）
  if (marker?.status === 'triggered') {
    core.info('already triggered; skipping');
    core.setOutput('skipped', 'true');
    return;
  }

  const res = await postToSlack(cfg, buildSlackMessage(cfg, issue), marker?.ts);
  if (!res.ok) {
    await finalize(
      github,
      context,
      core,
      issue,
      { ts: marker?.ts, status: 'pending', tries: marker?.tries || 0 },
      cfg,
      `Slack 投稿失敗 (${res.error})`,
    );
    try {
      await github.rest.issues.removeLabel({
        ...repo,
        issue_number: issue.number,
        name: cfg.triggerLabel,
      });
    } catch {
      /* ignore */
    }
    core.setOutput('thread_ts', '');
    return;
  }
  await finalize(
    github,
    context,
    core,
    issue,
    { ts: res.ts, permalink: res.permalink, status: 'triggered', tries: 0 },
    cfg,
  );
  core.setOutput('thread_ts', res.ts);
}

// 投稿後に Devin のスレッド返信を確認する。
// 失敗返信なら pending 化。セッション URL があれば done 化してリンクを記録する。
async function verify({ github, context, core }) {
  const cfg = env();
  const issue = context.payload.issue;
  const repo = context.repo;
  const marker = await getMarkerEntry(github, repo, issue.number);
  if (!marker?.ts || marker.status !== 'triggered') return;

  const r = await slackReplies(cfg, marker.ts);
  if (!r.ok) {
    core.warning(`conversations.replies failed: ${r.error}`);
    return; // 確認不能。定期実行側の sweep が拾う
  }
  const { sessionUrl, failureText } = inspectReplies(r.messages);
  if (failureText) {
    await finalize(
      github,
      context,
      core,
      issue,
      { ts: marker.ts, status: 'pending', tries: marker.tries },
      cfg,
      `Devin 起動失敗: ${failureText}`,
    );
    try {
      await github.rest.issues.removeLabel({
        ...repo,
        issue_number: issue.number,
        name: cfg.triggerLabel,
      });
    } catch {
      /* ignore */
    }
    return;
  }
  if (sessionUrl) {
    await finalize(
      github,
      context,
      core,
      issue,
      { ts: marker.ts, sessionUrl, status: 'done', tries: marker.tries },
      cfg,
    );
  }
}

// ---- 定期実行側 ----

// キュー済み issue の起動と triggered の遅延失敗検出と pending の再投稿を一括処理する。
async function sweep({ github, context, core }) {
  const cfg = env();
  const repo = context.repo;
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    ...repo,
    state: 'open',
    per_page: 100,
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const issue of issues) {
    if (issue.pull_request) continue;
    const labels = issue.labels.map((l) => (typeof l === 'string' ? l : l.name));
    const marker = await getMarkerEntry(github, repo, issue.number);

    if (labels.includes(cfg.queueLabel)) {
      // キューから起動: 新規スレッドへ投稿
      const res = await postToSlack(cfg, buildSlackMessage(cfg, issue), marker?.ts);
      if (res.ok) {
        await finalize(
          github,
          context,
          core,
          issue,
          { ts: res.ts, permalink: res.permalink, status: 'triggered', tries: 0 },
          cfg,
        );
        try {
          await github.rest.issues.addLabels({
            ...repo,
            issue_number: issue.number,
            labels: [cfg.triggerLabel],
          });
        } catch {
          /* ignore */
        }
      } else {
        await finalize(
          github,
          context,
          core,
          issue,
          { ts: marker?.ts, status: 'pending', tries: 0 },
          cfg,
          `Slack 投稿失敗 (${res.error})`,
        );
      }
      continue;
    }

    if (labels.includes(cfg.triggerLabel) && marker?.status === 'triggered' && marker?.ts) {
      // 遅延する Devin 応答を回収する。失敗なら pending。セッションURLなら done。
      const r = await slackReplies(cfg, marker.ts);
      if (!r.ok) continue;
      const { sessionUrl, failureText } = inspectReplies(r.messages);
      if (failureText) {
        await finalize(
          github,
          context,
          core,
          issue,
          { ts: marker.ts, status: 'pending', tries: marker.tries },
          cfg,
          `Devin 起動失敗: ${failureText}`,
        );
        try {
          await github.rest.issues.removeLabel({
            ...repo,
            issue_number: issue.number,
            name: cfg.triggerLabel,
          });
        } catch {
          /* ignore */
        }
      } else if (sessionUrl) {
        await finalize(
          github,
          context,
          core,
          issue,
          { ts: marker.ts, sessionUrl, status: 'done', tries: marker.tries },
          cfg,
        );
      }
      continue;
    }

    if (labels.includes(cfg.waitingLabel)) {
      const tries = marker?.tries || 0;
      // まず既存スレッドの返信を見る（再投稿前に Devin が応答済みかも）
      if (marker?.ts) {
        const r = await slackReplies(cfg, marker.ts);
        if (r.ok) {
          const { sessionUrl } = inspectReplies(r.messages);
          if (sessionUrl) {
            await finalize(
              github,
              context,
              core,
              issue,
              { ts: marker.ts, sessionUrl, status: 'done', tries },
              cfg,
            );
            try {
              await github.rest.issues.addLabels({
                ...repo,
                issue_number: issue.number,
                labels: [cfg.triggerLabel],
              });
            } catch {
              /* ignore */
            }
            continue;
          }
        }
      }
      if (tries >= MAX_TRIES) {
        await finalize(
          github,
          context,
          core,
          issue,
          { ts: marker?.ts, status: 'failed', tries },
          cfg,
          '再試行回数の上限に達しました',
        );
        continue;
      }
      // 再投稿する。既存スレッド優先で失敗時は新スレッドへ。
      const res = await postToSlack(cfg, buildSlackMessage(cfg, issue), marker?.ts);
      const next = {
        ts: (res.ok ? res.ts : undefined) || marker?.ts,
        status: 'pending',
        tries: tries + 1,
      };
      if (res.ok) next.permalink = res.permalink;
      await finalize(
        github,
        context,
        core,
        issue,
        next,
        cfg,
        res.ok ? undefined : `Slack 再投稿失敗 (${res.error})`,
      );
      await sleep(1000); // Slack レート対策
    }
  }
}

module.exports = { dispatch, verify, sweep };
