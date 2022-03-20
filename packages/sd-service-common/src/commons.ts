export interface ISdServiceRequest {
  clientName: string;
  uuid: string;
  command: string;
  params: any[];
}

export interface ISdServiceResponse {
  type: "error" | "response";
  body: any;
}

export class SdServiceEventBase<I, O> {
  public info!: I;
  public data!: O;
}

export interface ISdServiceSplitRequest {
  uuid: string;
  fullSize: number;
  index: number;
  body: string;
}