export type TachoActivityName = "rest" | "availability" | "work" | "driving";

export interface DddTlvObject {
  readonly tag: string;
  readonly fileId: string;
  readonly suffix: string;
  readonly offset: number;
  readonly length: number;
  readonly value: Uint8Array;
}

export interface ActivityChangeInfo {
  readonly rawWord: number;
  readonly slot: "driver" | "co-driver";
  readonly cardStatus: "inserted" | "not-inserted";
  readonly drivingStatus: "single" | "crew" | null;
  readonly followingActivityStatus: "known" | "unknown" | null;
  readonly activityCode: number;
  readonly activity: TachoActivityName | null;
  readonly timeMinutes: number;
  readonly timeValid: boolean;
}

export interface CardActivityDailyRecord {
  readonly previousRecordLength: number;
  readonly recordLength: number;
  readonly recordDateEpochSeconds: number;
  readonly recordDate: string;
  readonly activityDailyPresenceCounter: number;
  readonly activityDayDistanceKm: number;
  readonly changes: readonly ActivityChangeInfo[];
}

export interface ParsedCardActivityDailyRecord extends CardActivityDailyRecord {
  readonly pointer: number;
}

export interface CardDriverActivity {
  readonly activityPointerOldestDayRecord: number;
  readonly activityPointerNewestRecord: number;
  readonly bufferLength: number;
  readonly records: readonly ParsedCardActivityDailyRecord[];
}

export interface ExtractedDriverActivity extends CardDriverActivity {
  readonly generation: "gen1" | "gen2";
  readonly tag: "050400" | "050402";
}

export interface ActivitySegment {
  readonly startMinute: number;
  readonly endMinute: number;
  readonly durationMinutes: number;
  readonly activity: TachoActivityName | null;
  readonly slot: "driver" | "co-driver";
  readonly cardStatus: "inserted" | "not-inserted";
  readonly drivingStatus: "single" | "crew" | null;
  readonly followingActivityStatus: "known" | "unknown" | null;
}

export interface ActivityMinuteTotals {
  readonly rest: number;
  readonly availability: number;
  readonly work: number;
  readonly driving: number;
  readonly unknown: number;
}

export interface CalendarWindowDay {
  readonly date: string;
  readonly record: ParsedCardActivityDailyRecord | null;
}

export interface CalendarWindow {
  readonly startDate: string;
  readonly endDate: string;
  readonly dayCount: number;
  readonly days: readonly CalendarWindowDay[];
}

export function parseDddTlv(input: ArrayBuffer | ArrayBufferView | readonly number[]): readonly DddTlvObject[];
export function parseActivityChangeInfo(input: number | ArrayBuffer | ArrayBufferView | readonly number[]): ActivityChangeInfo;
export function parseCardActivityDailyRecord(input: ArrayBuffer | ArrayBufferView | readonly number[]): CardActivityDailyRecord;
export function parseCardDriverActivity(input: ArrayBuffer | ArrayBufferView | readonly number[]): CardDriverActivity;
export function extractDriverActivity(
  input: ArrayBuffer | ArrayBufferView | readonly number[],
  generation?: "gen1" | "gen2",
): ExtractedDriverActivity;
export function buildActivitySegments(
  dailyRecord: CardActivityDailyRecord,
  endMinute?: number,
): readonly ActivitySegment[];
export function summarizeActivityMinutes(
  dailyRecord: CardActivityDailyRecord,
  endMinute?: number,
): ActivityMinuteTotals;
export function buildCalendarWindow(
  records: readonly ParsedCardActivityDailyRecord[],
  endDate: string,
  dayCount?: number,
): CalendarWindow;
