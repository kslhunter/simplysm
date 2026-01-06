export interface ISdWorkerType {
  methods: Record<
    string,
    {
      params: any[];
      returnType: any;
    }
  >;
  events: Record<string, any>;
}

export interface ISdWorkerRequest<T extends ISdWorkerType, K extends keyof T["methods"]> {
  id: string;
  method: K;
  params: T["methods"][K]["params"];
}

export type TSdWorkerResponse<T extends ISdWorkerType, K extends keyof T["methods"]> =
  | {
      request: ISdWorkerRequest<T, K>;
      type: "return";
      body?: T["methods"][K]["returnType"];
    }
  | {
      request: ISdWorkerRequest<T, K>;
      type: "error";
      body: Error;
    }
  | {
      type: "event";
      event: string;
      body?: any;
    }
  | {
      type: "log";
      body: string;
    };
