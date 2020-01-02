// tslint:disable-next-line:interface-name
export interface ResizeEvent extends Event {
  readonly prevWidth: number;
  readonly newWidth: number;
  readonly prevHeight: number;
  readonly newHeight: number;
}

// tslint:disable-next-line:interface-name
export interface MutationEvent extends Event {
  readonly mutations: MutationRecord[];
}
