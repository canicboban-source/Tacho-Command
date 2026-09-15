export const DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION: readonly number[];

export function classifyDdpResponse(
  message: readonly number[],
  requestSid: number,
  expectedTrep?: number | null,
): Readonly<{
  valid: boolean;
  matches: boolean;
  positive: boolean;
  negative: boolean;
  responsePending: boolean;
  sid: number | null;
  trep: number | null;
  negativeResponseCode: number | null;
  reason: string | null;
}>;

export function parseDownloadInterfaceVersion(message: readonly number[]): Readonly<{
  valid: boolean;
  generation: number | null;
  version: number | null;
}>;
