export type DriverActivity = "rest" | "availability" | "work" | "driving" | null;
export type LegalProfile = "unknown" | "eu-561-standard" | "regular-passenger-le-50km" | "at-regional-passenger-le-50km";

export interface ActivitySegmentInput {
  readonly startMinute: number;
  readonly endMinute: number;
  readonly activity: DriverActivity;
}

export interface ActivityDayInput {
  readonly date: string;
  readonly segments: readonly ActivitySegmentInput[];
}

export interface DrivingThresholdAlert {
  readonly kind: "continuous-driving-warning" | "continuous-driving-exceeded";
  readonly atDate: string;
  readonly atMinute: number;
  readonly accumulatedDrivingMinutes: number;
}

export interface DriverSafetyEvaluation {
  readonly legalProfile: LegalProfile;
  readonly operationalAlerts: readonly DrivingThresholdAlert[];
  readonly legalAlerts: readonly unknown[];
  readonly scopeAlerts: readonly unknown[];
  readonly continuousDriving: Readonly<{
    breakProfile: "eu-561" | "at-regional-passenger-le-50km";
    warningAtMinutes: number;
    legalLimitMinutes: number;
    currentDrivingSinceQualifyingBreakMinutes: number;
    warningActive: boolean;
    exceeded: boolean;
    splitBreakArmed: boolean;
    atRegionalBreakProgress: Readonly<{
      qualifying15MinuteParts: number;
      qualifying20MinuteParts: number;
    }> | null;
    alerts: readonly DrivingThresholdAlert[];
    resets: readonly unknown[];
  }>;
  readonly weeklyDriving: readonly Readonly<{
    weekStartDate: string;
    weekEndDate: string;
    drivingMinutes: number;
  }>[];
  readonly limits: Readonly<Record<string, number>>;
}

export const LEGAL_PROFILES: Readonly<{
  UNKNOWN: "unknown";
  EU_561_STANDARD: "eu-561-standard";
  REGULAR_PASSENGER_LE_50KM: "regular-passenger-le-50km";
  AT_REGIONAL_PASSENGER_LE_50KM: "at-regional-passenger-le-50km";
}>;

export function flattenActivityDays(days: readonly ActivityDayInput[]): readonly unknown[];
export function analyzeContinuousDriving(days: readonly ActivityDayInput[], options?: {
  readonly warningAtMinutes?: number;
  readonly legalLimitMinutes?: number;
  readonly breakProfile?: "eu-561" | "at-regional-passenger-le-50km";
}): Readonly<{
  breakProfile: "eu-561" | "at-regional-passenger-le-50km";
  warningAtMinutes: number;
  legalLimitMinutes: number;
  currentDrivingSinceQualifyingBreakMinutes: number;
  warningActive: boolean;
  exceeded: boolean;
  splitBreakArmed: boolean;
  atRegionalBreakProgress: Readonly<{
    qualifying15MinuteParts: number;
    qualifying20MinuteParts: number;
  }> | null;
  alerts: readonly DrivingThresholdAlert[];
  resets: readonly unknown[];
}>;
export function summarizeCalendarDriving(days: readonly ActivityDayInput[]): readonly Readonly<{date:string; drivingMinutes:number}>[];
export function summarizeWeeklyDriving(days: readonly ActivityDayInput[]): readonly Readonly<{weekStartDate:string; weekEndDate:string; drivingMinutes:number}>[];
export function evaluateEu561WeeklyDriving(days: readonly ActivityDayInput[]): Readonly<{weeks: readonly unknown[]; alerts: readonly unknown[]}>;
export function evaluateDriverSafety(days: readonly ActivityDayInput[], options?: {
  readonly legalProfile?: LegalProfile;
  readonly warningAtMinutes?: number;
  readonly legalLimitMinutes?: number;
}): DriverSafetyEvaluation;
