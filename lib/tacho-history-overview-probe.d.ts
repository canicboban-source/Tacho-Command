export const DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION: readonly number[];
export const DDP_REQUEST_GEN2V2_OVERVIEW: readonly number[];

export type DdpClassification = Readonly<{
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

export type DdpTransferAssembler = {
  expectedTrep: number;
  multipart: boolean;
  expectedCounter: number;
  submessages: number;
  payloadBytes: number;
  complete: boolean;
};

export type DdpTransferPushResult = Readonly<{
  status: "pending" | "complete" | "response-pending" | "negative" | "invalid" | "ignored";
  reason: string | null;
  ack: readonly number[] | null;
  negativeResponseCode: number | null;
  submessages: number;
  payloadBytes: number;
}>;

export function classifyDdpResponse(
  message: readonly number[],
  requestSid: number,
  expectedTrep?: number | null,
): DdpClassification;

export function parseDownloadInterfaceVersion(message: readonly number[]): Readonly<{
  valid: boolean;
  generation: number | null;
  version: number | null;
}>;

export function buildDdpSubMessageAck(nextCounter: number): readonly number[];
export function createDdpTransferAssembler(expectedTrep: number): DdpTransferAssembler;
export function pushDdpTransferMessage(
  assembler: DdpTransferAssembler,
  message: readonly number[],
): DdpTransferPushResult;
