

export interface ISdServiceProgress {
  request?: (s: ISdServiceProgressState) => void;
  response?: (s: ISdServiceProgressState) => void;
}

export interface ISdServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}