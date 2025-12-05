import { TSdServiceCommand } from "./command-v1.types";

/** @deprecated */
export type TSdServiceMessage = TSdServiceS2CMessage | TSdServiceC2SMessage;

/** @deprecated */
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

/** @deprecated */
export type TSdServiceC2SMessage =
  | ISdServiceClientGetIdResponse
  | ISdServiceClientPing
  | ISdServiceRequest
  | ISdServiceSplitRequest;

/** @deprecated */
interface ISdServiceClientReloadCommand {
  name: "client-reload";
  clientName: string | undefined;
  changedFileSet: Set<string>;
}

/** @deprecated */
interface ISdServiceClientGetIdCommand {
  name: "client-get-id";
}

/** @deprecated */
interface ISdServiceClientGetIdResponse {
  name: "client-get-id-response";
  body: string;
}

/** @deprecated */
interface ISdServiceClientConnectedAlarm {
  name: "connected";
}

/** @deprecated */
interface ISdServiceClientPing {
  name: "client-ping";
}

/** @deprecated */
interface ISdServiceClientPong {
  name: "client-pong";
}

/** @deprecated */
export type TSdServiceResponse = ISdServiceSuccessResponse | ISdServiceErrorResponse;

/** @deprecated */
export interface ISdServiceSuccessResponse {
  name: "response";
  reqUuid: string;

  state: "success";
  body: any;
}

/** @deprecated */
export interface ISdServiceErrorResponse {
  name: "response";
  reqUuid: string;

  state: "error";
  body: ISdServiceErrorBody;
}

/** @deprecated */
export interface ISdServiceErrorBody {
  message: string;
  code: string;
  stack?: string;
}

/** @deprecated */
export interface ISdServiceRequest {
  name: "request";
  clientName: string;
  uuid: string;

  command: TSdServiceCommand;
  params: any;
}

/** @deprecated */
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

/** @deprecated */
interface ISdServiceEmittedEvent {
  name: "event";
  key: string;
  body: any;
}
