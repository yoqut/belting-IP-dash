export type CallType = "Inbound" | "Outbound" | "Internal";
export type CallDisposition = "ANSWERED" | "NO ANSWER" | "BUSY" | "FAILED" | "VOICEMAIL";

export interface CDRRecord {
  uid: string;
  new_id: string;
  call_type: CallType;
  time: string; // "DD/MM/YYYY HH:mm:ss"
  timestamp: number;
  call_from: string; // "Name<number>"
  call_to: string;
  call_from_number: string;
  call_from_name: string;
  call_to_number: string;
  call_to_name: string;
  src_trunk: string;   // inbound trunk line
  dst_trunk: string;   // outbound trunk line
  dod_number: string;  // outbound caller ID
  did: string;
  did_number: string;  // inbound DID number
  did_name: string;
  duration: number;
  ring_duration: number;
  talk_duration: number;
  disposition: CallDisposition;
  rec_id?: number | null;
}

export interface CDRResponse {
  errcode: number;
  errmsg: string;
  total_number: number;
  data: CDRRecord[];
}

export interface CDRStats {
  all: number;
  inbound: number;
  answered: number;
  missed: number;
  no_answer: number;
  outbound: number;
  outbound_success: number;
  outbound_failed: number;
  internal: number;
}

export type DateFilter = "today" | "week" | "month" | "year";
export type CallFilter =
  | "all"
  | "inbound"
  | "answered"
  | "missed"
  | "no_answer"
  | "outbound"
  | "outbound_success"
  | "outbound_failed"
  | "internal";
