export interface ISdResizeEvent extends Event {
  readonly prevWidth: number;
  readonly newWidth: number;
  readonly prevHeight: number;
  readonly newHeight: number;
  readonly relatedTarget: EventTarget;
}

export interface ISdMutationEvent extends Event {
  readonly mutations: MutationRecord[];
  readonly relatedTarget: EventTarget;
}
