import {Uuid} from "../../../sd-core/src";

export interface ISocketRequest {
    header: {
        id: Uuid;
        cmd: string;
        origin: string;
        [key: string]: any;
    };
    body?: any[];
}
