import { TSdServiceCommand } from "./command-v1.types";

export type TSdServiceMessage = TSdServiceS2CMessage | TSdServiceC2SMessage;

export type TSdServiceS2CMessage =
  | ISdServiceClientReloadCommand
  | ISdServiceClientGetIdCommand
  | ISdServiceClientConnectedAlarm
  | ISdServiceClientPong
  | TSdServiceResponse
  | ISdServiceProgress
  | ISdServiceResponseForSplit
  | ISdServiceSplitResponse
  | ISdServiceEmittedEvent;

export type TSdServiceC2SMessage =
  | ISdServiceClientGetIdResponse
  | ISdServiceClientPing
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

interface ISdServiceClientPing {
  name: "client-ping";
}

interface ISdServiceClientPong {
  name: "client-pong";
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

export interface ISdServiceProgress {
  name: "progress";
  uuid: string;
  totalSize: number;
  receivedSize: number;
}

/**
 * @deprecated
 * 분할된 요청 (요청을 받는곳에서 합쳐야함)
 */
export interface ISdServiceSplitRequest {
  name: "request-split";
  uuid: string;

  fullSize: number;
  index: number;
  body: string;
}

/**
 * @deprecated
 * 분할된 요청에 대한 응답
 */
export interface ISdServiceResponseForSplit {
  name: "response-for-split";
  reqUuid: string;

  totalSize: number;
  completedSize: number;
}

/**
 * @deprecated
 * 분할된 응답 (응답을 받는곳에서 합쳐야함)
 */
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
