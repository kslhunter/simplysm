import * as net from "net";
import * as http from "http";
import * as sio from "socket.io";
import * as url from "url";
import * as path from "path";
import * as fs from "fs";
import * as mime from "mime";
import {SocketServiceBase} from "./SocketServiceBase";
import {CodeException, JsonConvert, Logger, Type, Uuid} from "@simplism/core";
import {ISocketEvent, ISocketRequest, ISocketResponse} from "@simplism/socket-common";
import {SocketFileResult} from "./SocketFileResult";
import * as semver from "semver";
import Socket = sio.Socket;
import Server = sio.Server;

export interface ISocketServerOption {
    port?: number;
    services: Type<SocketServiceBase>[];
    clientNames?: string[];
}

export class SocketServer {
    private _logger = Logger.getLogger(this);
    private _app?: net.Server;
    private _interval: any;
    private _preparedFileResults = new Map<string, SocketFileResult>();
    private _server?: Server;
    private _listeners: {
        socket: Socket;
        event: string;
        info: any;
        id: Uuid;
    }[] = [];

    constructor(private _option: ISocketServerOption) {
        this._interval = setInterval(() => {
            const keys = Array.from(this._preparedFileResults.keys())
                .filter(key => {
                    const fileResult = this._preparedFileResults.get(key);
                    return fileResult!.createdDateTime < new Date().addHours(-1);
                });

            for (const key of keys) {
                this._preparedFileResults.delete(key);
            }
        }, 3 * 60 * 1000);

        process.on("exit", async () => {
            if (this._server) {
                await this.close();
            }
        });
    }

    async start(): Promise<void> {
        return await new Promise<void>(resolve => {
            if (this._app && this._app.listening) {
                return;
            }

            //-- STATIC(ANGULAR) 서버
            this._app = http.createServer((req, res) => {
                this._webRequestHandler(req, res);
            });

            //-- SOCKET 서버
            this._server = sio(this._app, {
                serveClient: false,
                wsEngine: "ws"
            } as any);

            this._server.on("connection", socket => {
                this._socketConnectionHandler(socket);
            });

            //-- 서버 시작
            this._app.listen(this._option.port || process.env.SOCKET_SERVER_PORT || 80, () => {
                this._logger.info("시작되었습니다. [PORT: " + (this._option.port || process.env.SOCKET_SERVER_PORT || 80) + "]");
                resolve();
            });
        });
    }

    async close(): Promise<void> {
        return await new Promise<void>(resolve => {
            this._logger.log("닫기");
            clearInterval(this._interval);

            if (this._server) {
                for (const socket of Object.values(this._server.sockets.sockets)) {
                    socket.disconnect(true);
                }
            }

            if (this._server) {
                this._server.close(() => {
                    if (this._app) {
                        this._app.close(() => {
                            resolve();
                        });
                    }
                    else {
                        resolve();
                    }
                });
            }
        });
    }

    async emit<T extends ISocketEvent<any, any>>(eventType: Type<T>, listenerSelector: (info: T["info"]) => boolean, sender: () => (T["data"] | Promise<T["data"]>)): Promise<void> {
        const items = this._listeners
            .filter(item => item.event === eventType.name && listenerSelector(item.info));

        if (items.length > 0) {
            const data = await sender();
            for (const item of items) {
                if (item.socket.connected) {
                    item.socket.emit("on(" + eventType.name + ")", JsonConvert.stringify(data));
                }
                else {
                    this._listeners.remove(item);
                }
            }
        }
    }

    private _webRequestHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
        if (req.method !== "GET") {
            res.writeHead(405);
            res.end("요청이 잘못되었습니다." + (process.env.NODE_ENV === "production" ? "" : "(" + req.method!.toUpperCase() + ")"));
        }

        const urlObj = url.parse(req.url!, true, false);
        const urlPath = decodeURI(urlObj.pathname!.slice(1));

        //-- 클라이언트 설정없이 요청했다면, 첫번째 클라이언트로 REDIRECT
        if (!urlPath && this._option.clientNames) {
            res.writeHead(302, {
                Location: this._option.clientNames[0]
            });
            res.end();
        }

        //-- 다운로드 요청시
        else if (urlPath.startsWith("_download")) {
            const token = urlPath.split("/")[1];
            const fileResult = this._preparedFileResults.get(token);
            if (!fileResult) {
                res.writeHead(403);
                res.end("다운로드할 파일을 찾을 수 없습니다.");
                return;
            }

            res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
            res.setHeader("Content-Disposition", "attachment; filename=" + encodeURI(fileResult.name));
            res.setHeader("Content-Length", fileResult.size.toString());
            res.setHeader("Content-Type", mime.getType(fileResult.name)!);

            res.writeHead(200);
            fileResult.stream.pipe(res);
        }

        //-- 클라이언트 파일 전송
        else if (this._option.clientNames) {
            let filePath: string;
            // 직접파일을 선택한 것이 아니라면, ANGULAR 용 클라이언트 index.html 파일 사용
            if (!urlPath.split("/").lastOr("").includes(".")) {
                const clientName = urlPath.split("/")[0];
                filePath = path.resolve("www", clientName, "index.html");
            }

            // 직접 파일을 선택했다면 선택된 파일 사용
            else {
                filePath = path.resolve("www", urlPath);
            }

            // 파일이 없으면 404오류 발생
            if (!fs.existsSync(filePath)) {
                this._responseErrorHtml(res, 404, "파일을 찾을 수 없습니다." + process.env.NODE_ENV === "production" ? "" : " [" + filePath + "]");
                return;
            }

            const fileStream = fs.createReadStream(filePath);
            const indexFileSize = fs.lstatSync(filePath).size;

            res.setHeader("Content-Length", indexFileSize);
            res.setHeader("Content-Type", mime.getType(filePath)!);
            res.writeHead(200);
            fileStream.pipe(res);
        }
        //-- 나머지 경우 요청오류
        else {
            res.writeHead(400);
            res.end("요청이 잘못되었습니다.");
        }
    }

    private _socketConnectionHandler(socket: Socket): void {
        this._logger.log("연결      : " + socket.id);

        socket.on("request", async (requestJson: string) => {
            //-- Request 파싱
            const request: ISocketRequest = JsonConvert.parse(requestJson);
            this._logger.log("요청받음", JsonConvert.stringify(request, {
                space: 2,
                hideBuffer: true
            }));


            //-- 요청처리
            let response: ISocketResponse;
            try {
                //-- 이벤트 리스너 등록 명령 처리
                if (request.header.cmd === "addListener") {
                    const listenerId = Uuid.newUuid();
                    this._listeners.push({
                        socket,
                        event: request.body![0].event,
                        info: request.body![0].info,
                        id: listenerId
                    });
                    response = {
                        header: {success: true},
                        body: listenerId
                    };
                }

                //-- 이벤트 리스너 제거 명령 처리
                else if (request.header.cmd === "removeListener") {
                    const listenerId: Uuid = request.body![0];
                    const listener = this._listeners.singleOr(undefined, item => item.id.toString() === listenerId.toString());
                    if (listener) {
                        this._listeners.remove(listener);
                    }
                    response = {
                        header: {success: true}
                    };
                }

                //-- APK 다운로드
                else if (request.header.cmd === "downloadApk") {
                    const packageName: string = request.body![0];
                    const fileNames = fs.readdirSync(path.resolve(process.cwd(), "www", "files", packageName));
                    const versions = fileNames.map(item => item.match(/v([0-9.]*)\.apk$/)![1]);
                    const maxVersion = semver.maxSatisfying(versions, "*");
                    const fileName = fileNames.single(item => item.includes(maxVersion));
                    const filePath = path.resolve(process.cwd(), "www", "files", packageName, fileName);
                    const size = fs.lstatSync(filePath).size;
                    const pt = fs.createReadStream(filePath) as any;

                    const result: SocketFileResult = {
                        createdDateTime: new Date(),
                        name: fileName,
                        size,
                        stream: pt
                    };

                    const fileToken = Uuid.newUuid().toString();
                    this._preparedFileResults.set(fileToken.toString(), result);
                    response = {header: {success: true, fileToken}};
                }

                //-- 일반적인 명령인 경우
                else {
                    response = await this._socketRequestHandler(request);
                }
            }
            catch (err) {
                if (!(err instanceof CodeException)) {
                    this._logger.error(err);
                }
                response = {
                    header: {success: false},
                    body: err
                };
            }

            //-- 결과 전송
            this._logger.log("응답보냄", JsonConvert.stringify(response, {
                space: 2,
                hideBuffer: true
            }));
            const responseJson = JsonConvert.stringify(response);
            socket.emit(`response(${request.header.id})`, responseJson);
        });
    }

    private async _socketRequestHandler(request: ISocketRequest): Promise<ISocketResponse> {
        //-- COMMAND 분할
        const cmdSplit = request.header.cmd.split(".");
        const serviceName = cmdSplit[0];
        const methodName = cmdSplit[1];

        //-- 서비스 가져오기
        const serviceClass = this._option.services.singleOr(undefined, item => item.name === serviceName);
        if (!serviceClass) {
            throw new CodeException("ServiceNotFound", "서비스[" + serviceName + "]를 찾을 수 없습니다.");
        }
        const service = new serviceClass();
        service.request = request;
        service.server = this;

        //-- 메소드 가져오기
        const method = service[methodName];
        if (!method) {
            throw new CodeException("MethodNotFound", "메소드[" + serviceName + "." + methodName + "]를 찾을 수 없습니다.");
        }

        //-- 실행
        const result = await method.apply(service, request.body);
        if (result instanceof SocketFileResult) {
            const fileToken = Uuid.newUuid().toString();
            this._preparedFileResults.set(fileToken.toString(), result);
            return {
                header: {
                    success: true,
                    fileToken
                }
            };
        }
        else {
            return {
                header: {success: true},
                body: result
            };
        }
    }

    private _responseErrorHtml(res: http.ServerResponse, code: number, message: string): void {
        res.writeHead(code);
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>${code}: ${message}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
${code}: ${message}
</body>
</html>`);
    }
}
