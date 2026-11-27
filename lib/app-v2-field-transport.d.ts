export type AppV2FieldTransport = Readonly<{
  deviceLabel: string;
  sendUds: (payload: readonly number[], timeoutMs?: number) => Promise<readonly number[] | null>;
  close: () => Promise<void>;
}>;

export declare function openAppV2FieldTransport(input?: Readonly<{
  bluetooth?: {
    requestDevice: (options: Readonly<{
      acceptAllDevices?: boolean;
      filters?: readonly ({ namePrefix: string } | { services: readonly string[] })[];
      optionalServices: readonly string[];
    }>) => Promise<unknown>;
  } | null;
  onStage?: (stage: string) => void;
  showAllDevices?: boolean;
  timeoutMs?: number;
  settleMs?: number;
  closeTimeoutMs?: number;
  signal?: AbortSignal;
  operationTimeoutMs?: number;
  writeTimeoutMs?: number;
}>): Promise<AppV2FieldTransport>;


export declare function openBrowserAppV2FieldTransport(input?: Readonly<{
  onStage?: (stage: string) => void;
  showAllDevices?: boolean;
  timeoutMs?: number;
  settleMs?: number;
  closeTimeoutMs?: number;
  signal?: AbortSignal;
  operationTimeoutMs?: number;
  writeTimeoutMs?: number;
}>): Promise<AppV2FieldTransport>;
