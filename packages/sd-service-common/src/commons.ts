export type TSdServiceS2CMessage =
  ISdServiceClientReloadCommand
  | ISdServiceClientGetIdCommand
  | ISdServiceClientConnectedAlarm
  | ISdServiceResponse
  | ISdServiceEmittedEvent;

export type TSdServiceC2SMessage = ISdServiceClientGetIdResponse
  | ISdServiceRequest
  | ISdServiceSplitRequest;

interface ISdServiceClientReloadCommand {
  name: "client-reload";
}

interface ISdServiceClientGetIdCommand {
  name: "client-get-id";
}

interface ISdServiceClientGetIdResponse {
  name: "client-get-id-response";
  body: string;
}

interface ISdServiceClientConnectedAlarm {
  name: "connected";
}

export interface ISdServiceResponse {
  name: "response";
  reqUuid: string;
  state: "success" | "error";
  body: any;
}

export interface ISdServiceRequest {
  name: "request";
  clientName: string;
  uuid: string;
  command: string;
  params: any;
}

export interface ISdServiceSplitRequest {
  name: "request-split";
  uuid: string;
  fullSize: number;
  index: number;
  body: string;
}

interface ISdServiceEmittedEvent {
  name: "event";
  key: string;
  body: any;
}

export class SdServiceEventBase<I, O> {
  public info!: I;
  public data!: O;
}
