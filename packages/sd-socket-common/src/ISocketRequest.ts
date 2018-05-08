import {Uuid} from "@simplism/sd-core";

export interface ISocketRequest {
  header: {
    id: Uuid;
    cmd: string;
    origin: string;
    [key: string]: any;
  };
  body?: any[];
}
