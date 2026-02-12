export interface LogEntry {
  level: "log" | "info" | "warn" | "error";
  message: string;
  timestamp: number;
}

export const LogAdapter: {
  write?: (entry: LogEntry) => void;
} = {};
