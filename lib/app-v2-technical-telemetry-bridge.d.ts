export declare function runAppV2LiveAttemptWithTelemetry(input?: Readonly<{
  openTransport?: () => Promise<{
    deviceLabel?: string | null;
    sendUds: (payload: readonly number[], timeoutMs?: number) => Promise<readonly number[] | null>;
    close?: () => Promise<void> | void;
  } | null>;
  cryptoImpl?: {
    randomUUID: () => string;
    getRandomValues: (array: Uint8Array) => Uint8Array;
  };
  postTelemetry?: (events: readonly Readonly<Record<string, unknown>>[]) => Promise<Readonly<{
    status: string;
    accepted: number;
  }>>;
  now?: () => Date;
}>): Promise<Readonly<{
  status: string;
  session: Readonly<Record<string, any>>;
  telemetry: Readonly<Record<string, any>> | null;
  attemptCode: string | null;
  telemetryStatus: string;
  telemetryAcceptedCount: number | null;
  telemetryEventCount: number;
}>>;
