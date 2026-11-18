import path from 'path';

export interface UatRuntimeConfig {
  headedAllowed: boolean;
  videoEnabled: boolean;
  traceEnabled: boolean;
  slowMoMs: number;
  uatEvidenceDir: string;
  domSnapshotDir: string;
}

type EnvLike = Record<string, string | undefined>;

export function buildUatRuntimeConfig(env: EnvLike): UatRuntimeConfig {
  return {
    headedAllowed: env.HEADED_ALLOWED === 'true',
    videoEnabled: env.VIDEO !== 'false',
    traceEnabled: env.TRACE !== 'false',
    slowMoMs: Number.parseInt(env.SLOW_MO_MS || '0', 10) || 0,
    uatEvidenceDir: path.resolve(env.UAT_EVIDENCE_DIR || 'docs/product/evidence/uat'),
    domSnapshotDir: path.resolve(env.DOM_SNAPSHOT_DIR || 'docs/product/evidence/uat/dom'),
  };
}
