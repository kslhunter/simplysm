import { TSdServiceCommand } from "./command.types";

export type TSdServiceS2CMessage =
  | ISdServiceClientReloadCommand
  | ISdServiceClientGetIdCommand
  | ISdServiceClientConnectedAlarm
  | TSdServiceResponse
  | ISdServiceResponseForSplit
  | ISdServiceSplitResponse
  | ISdServiceEmittedEvent;

export type TSdServiceC2SMessage =
  | ISdServiceClientGetIdResponse
  | ISdServiceRequest
  | ISdServiceSplitRequest;

interface ISdServiceClientReloadCommand {
  name: "client-reload";
  clientName: string | undefined;
  changedFileSet: Set<string>;
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

export type TSdServiceResponse = ISdServiceSuccessResponse | ISdServiceErrorResponse;

export interface ISdServiceSuccessResponse {
  name: "response";
  reqUuid: string;
  state: "success";
  body: any;
}

export interface ISdServiceErrorResponse {
  name: "response";
  reqUuid: string;
  state: "error";
  body: ISdServiceErrorBody;
}

export interface ISdServiceErrorBody {
  message: string;
  code: string;
  stack?: string;
}

export interface ISdServiceRequest {
  name: "request";
  clientName: string;
  uuid: string;
  command: TSdServiceCommand;
  params: any;
}

export interface ISdServiceSplitRequest {
  name: "request-split";
  uuid: string;
  fullSize: number;
  index: number;
  body: string;
}

export interface ISdServiceResponseForSplit {
  name: "response-for-split";
  reqUuid: string;
  completedSize: number;
}

export interface ISdServiceSplitResponse {
  name: "response-split";
  reqUuid: string;
  fullSize: number;
  index: number;
  body: string;
}

interface ISdServiceEmittedEvent {
  name: "event";
  key: string;
  body: any;
}

export class SdServiceEventListenerBase<I, O> {
  info!: I;
  data!: O;
}
