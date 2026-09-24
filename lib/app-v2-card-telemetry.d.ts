export declare function reportAppV2CardReadOutcome(input?: Readonly<{
  status?: string;
  cryptoImpl?: {
    randomUUID: () => string;
    getRandomValues: (array: Uint8Array) => Uint8Array;
  };
  postTelemetry?: (events: readonly Readonly<Record<string, unknown>>[]) => Promise<Readonly<{
    status: string;
    accepted: number;
  }>>;
}>): Promise<Readonly<{ status: string; attemptCode: string | null; accepted: number }>>;
