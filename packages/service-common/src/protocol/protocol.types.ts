// ----------------------------------------------------------------------
// Protocol Constants
// ----------------------------------------------------------------------

/** Service protocol configuration */
export const PROTOCOL_CONFIG = {
  /** Max message size (100MB) */
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,
  /** Chunking threshold (3MB) */
  SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024,
  /** Chunk size (300KB) */
  CHUNK_SIZE: 300 * 1024,
  /** GC interval (10s) */
  GC_INTERVAL: 10 * 1000,
  /** Incomplete message expiry time (60s) */
  EXPIRE_TIME: 60 * 1000,
} as const;

// ----------------------------------------------------------------------
// Message Types
// ----------------------------------------------------------------------

export type ServiceMessage =
  | ServiceReloadMessage
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceProgressMessage
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage
  | ServiceEventMessage;

export type ServiceServerMessage =
  | ServiceReloadMessage // Notification
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceEventMessage; // Notification

export type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage;

export type ServiceClientMessage =
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage;

// ----------------------------------------------------------------------
// System (common)
// ----------------------------------------------------------------------

/** Server: reload command to client */
export interface ServiceReloadMessage {
  name: "reload";
  body: {
    clientName: string | undefined; // Client name
    changedFileSet: Set<string>; // Changed file list
  };
}

/** Server: progress notification for received chunked message */
export interface ServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number; // Total size (bytes)
    completedSize: number; // Completed size (bytes)
  };
}

/** Server: error notification */
export interface ServiceErrorMessage {
  name: "error";
  body: {
    name: string;
    message: string;
    code: string;
    stack?: string;
    detail?: unknown;
    cause?: unknown;
  };
}

/** Client: authentication message */
export interface ServiceAuthMessage {
  name: "auth";
  body: string; // Token
}

// ----------------------------------------------------------------------
// Service.Method
// ----------------------------------------------------------------------

/** Client: service method request */
export interface ServiceRequestMessage {
  name: `${string}.${string}`; // ${service}.${method}
  body: unknown[]; // params
}

/** Server: service method response */
export interface ServiceResponseMessage {
  name: "response";
  body?: unknown; // result
}

// ----------------------------------------------------------------------
// Events
// ----------------------------------------------------------------------

/** Client: add event listener */
export interface ServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string; // Listener key (uuid) - needed for removeEventListener
    name: string; // Event name (Type.name)
    info: unknown; // Additional listener info for filtering when events fire
  };
}

/** Client: remove event listener */
export interface ServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string; // Listener key (uuid)
  };
}

/** Client: request event listener info list */
export interface ServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string; // Event name
  };
}

/** Client: emit event */
export interface ServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[]; // Listener key list
    data: unknown; // Data
  };
}

/** Server: event notification */
export interface ServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[]; // Listener key list
    data: unknown; // Data
  };
}
