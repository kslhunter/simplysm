export class SdServiceEventListenerBase<I, O> {
  info!: I;
  data!: O;
}

export interface ISdServiceUploadResult {
  path: string;
  filename: string;
  size: number;
}
