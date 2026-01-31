export interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
}

export interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
