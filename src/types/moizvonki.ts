export interface MZCall {
  direction: 0 | 1;        // 0 = kiruvchi, 1 = chiquvchi
  client_number: string;
  client_name?: string;
  answered: 0 | 1;
  duration: number;
  recording: string | null;
  start_time: number;      // Unix timestamp
  answer_time: number;
  end_time: number;
  db_call_id?: string;
  src_number?: string;
  upload_time?: number;
  user_account?: string;
  user_id?: number;
}

export interface MZStats {
  total: number;
  inbound: number;
  outbound: number;
  answered: number;
  missed: number;
}
