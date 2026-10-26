export interface TargetConfig {
  id: string;
  name: string;
  url: string;
  expectedTitle: RegExp;
  vitalSelector: string;
  slaLatencyMs: number;
}

export interface ProbeResult {
  targetId: string;
  url: string;
  status: number;
  ok: boolean;
  latencyMs: number;
  consoleErrors: string[];
  vitalElementFound: boolean;
  title: string;
}
