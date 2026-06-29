export type CallDirection = "inbound" | "outbound" | "internal";
export type CallChannel = "pbx" | "sim";

export interface UnifiedCall {
  id: string;
  timeUnix: number;
  direction: CallDirection;
  employeeName: string;
  clientNumber: string;
  clientName: string;
  answered: boolean;
  duration: number;
  recordingUrl: string | null;
  recId?: number;
  channel: CallChannel;
  trunkLine?: string;
}

export interface UnifiedStats {
  all: number;
  inbound: number;
  answered: number;
  missed: number;
  outbound: number;
  outbound_success: number;
  outbound_failed: number;
  internal: number;
}

export interface EmployeeLink {
  displayName: string;
  mzEmail: string;
  yeastarExtName: string;
}

export interface AppSettings {
  employees: EmployeeLink[];
}
