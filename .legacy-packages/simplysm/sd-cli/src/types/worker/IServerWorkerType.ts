export interface IServerWorkerType {
  methods: {
    listen: { params: [string | number]; returnType: number };
    setPathProxy: { params: [Record<string, string>]; returnType: void };
    broadcastReload: { params: [string | undefined, Set<string>]; returnType: void };
  };
  events: {};
}
