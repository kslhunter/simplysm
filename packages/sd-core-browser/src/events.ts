export interface SdResizeEvent extends Event {
  readonly prevWidth: number;
  readonly newWidth: number;
  readonly prevHeight: number;
  readonly newHeight: number;
  readonly relatedTarget: EventTarget;
}

export interface SdMutationEvent extends Event {
  readonly mutations: MutationRecord[];
  readonly relatedTarget: EventTarget;
}
