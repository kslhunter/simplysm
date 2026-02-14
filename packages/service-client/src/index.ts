// Types
export type { ServiceConnectionConfig } from "./types/connection-config";
export type { ServiceProgress, ServiceProgressState } from "./types/progress.types";

// Transport
export type { SocketProvider, SocketProviderEvents } from "./transport/socket-provider";
export { createSocketProvider } from "./transport/socket-provider";
export type { ServiceTransport, ServiceTransportEvents } from "./transport/service-transport";
export { createServiceTransport } from "./transport/service-transport";

// Protocol
export type { ClientProtocolWrapper } from "./protocol/client-protocol-wrapper";
export { createClientProtocolWrapper } from "./protocol/client-protocol-wrapper";

// Features
export type { EventClient } from "./features/event-client";
export { createEventClient } from "./features/event-client";
export type { FileClient } from "./features/file-client";
export { createFileClient } from "./features/file-client";
export type { OrmConnectConfig } from "./features/orm/orm-connect-config";
export type { OrmClientConnector } from "./features/orm/orm-client-connector";
export { createOrmClientConnector } from "./features/orm/orm-client-connector";
export { OrmClientDbContextExecutor } from "./features/orm/orm-client-db-context-executor";

// Main
export { ServiceClient, createServiceClient, type RemoteService } from "./service-client";
