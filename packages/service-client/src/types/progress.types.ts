export interface IServiceProgress {
  request?: (s: IServiceProgressState) => void;
  response?: (s: IServiceProgressState) => void;
}

export interface IServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
