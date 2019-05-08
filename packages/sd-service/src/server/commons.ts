import * as http from "http";

export type NextHandleFunction = (req: http.IncomingMessage, res: http.ServerResponse, next: (err?: any) => void) => void;