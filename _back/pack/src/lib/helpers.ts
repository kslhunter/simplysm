import * as os from 'os';
import {Exception} from '@simplism/core';

export function host(host: string | string[]): string {
    if (typeof host === 'string' && !host.includes('*')) {
        return host;
    }

    if (typeof host === 'string') {
        host = [host];
    }

    for (const hostItem of host) {
        const hostRegExpString = hostItem.replace(/\./g, '\\.').replace(/\*/g, '[0-9]*');

        const ifaces = os.networkInterfaces();
        const result = Object.keys(ifaces)
            .map(key => ifaces[key].filter(item => item.family === 'IPv4' && !item.internal))
            .filter(item => item.length > 0).mapMany(item => item.map(item => item.address))
            .singleOr(undefined, addr => new RegExp(hostRegExpString).test(addr));
        if (!result) {
            continue;
        }
        return result;
    }

    throw new Exception(`"${host.join(`", "`)}"와 매칭되는 아이피 주소를 찾을 수 없습니다.`);
}
