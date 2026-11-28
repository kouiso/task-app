const REQUEST_ID_HEADER = 'x-request-id';

type LogLevel = 'info' | 'warn' | 'error';

type StructuredLogFields = {
  level?: LogLevel;
  event: string;
  requestId?: string;
  path?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  [key: string]: string | number | boolean | undefined;
};

function fallbackRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? fallbackRequestId();
}

export function normalizeRequestId(value: string | null): string {
  if (!value) {
    return generateRequestId();
  }

  const normalized = value.trim();
  if (/^[a-zA-Z0-9._:-]{8,128}$/.test(normalized)) {
    return normalized;
  }

  return generateRequestId();
}

export function getRequestIdFromHeaders(headers: Headers): string {
  return normalizeRequestId(headers.get(REQUEST_ID_HEADER));
}

export function setRequestIdHeader(headers: Headers, requestId: string): void {
  headers.set(REQUEST_ID_HEADER, requestId);
}

export function shouldEmitStructuredLogs(): boolean {
  return process.env['NODE_ENV'] !== 'test' && process.env['OBSERVABILITY_LOGS'] !== 'off';
}

export function writeStructuredLog(fields: StructuredLogFields): void {
  if (!shouldEmitStructuredLogs()) {
    return;
  }

  const { level = 'info', ...payload } = fields;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    ...payload,
  });

  // 本番ビルドは next.config.ts の removeConsole で `console.*` の呼び出しを消す。構造化ログは
  // 本番で障害を追う唯一の手がかりなので、変数に受けた console から出して消されないようにする
  const sink = globalThis.console;
  if (level === 'error') {
    sink.error(line);
    return;
  }
  if (level === 'warn') {
    sink.warn(line);
    return;
  }
  sink.info(line);
}

export { REQUEST_ID_HEADER };
