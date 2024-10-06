export interface TServerWorkerType {
  methods: {
    listen: { params: [{ path: string } | { port: number }]; returnType: number };
    setPathProxy: { params: [Record<string, string | number>]; returnType: void };
    broadcastReload: { params: []; returnType: void };
  };
  events: {};
}
