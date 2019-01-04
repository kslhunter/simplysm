import * as child_process from "child_process";
import {Logger} from "@simplism/core";
import {SocketServiceBase} from "@simplism/socket-server";
import * as fs from "fs-extra";
import * as path from "path";

export interface IKtCallManagerApiMessage {
  type: "error" | "event" | "return";
  name: string;
  code: number;
}

export class KtCallManagerApiService extends SocketServiceBase {
  private readonly _logger: Logger = new Logger("@simplism/kt-call-manager-api-service");
  private static readonly _workers = new Map<number, child_process.ChildProcess>();

  public async createAsync(): Promise<number> {
    const workerPath = fs.existsSync(path.resolve(process.cwd(), "node_modules/@simplism/kt-call-manager-api-service/assets/worker.js"))
      ? path.resolve(process.cwd(), "node_modules/@simplism/kt-call-manager-api-service/assets/worker.js")
      : path.resolve(process.cwd(), "assets/worker.js");

    console.log(path.resolve(__dirname, "node_modules/@simplism/kt-call-manager-api-service/assets/worker.js"));

    const worker = child_process.fork(
      workerPath,
      undefined,
      {
        stdio: [0, 1, 2, "ipc"]
      }
    );

    worker.on("message", (msg: IKtCallManagerApiMessage) => {
      if (msg.type === "error") {
        const message = msg.code === -1
          ? "명령이 잘못되었습니다."
          : "처리되지 않은 오류";
        this._logger.error(message);
        this.server.emit(this.request.id, {name: "error", message});
      }
    });

    /*worker.on("message", msg => {
      if (!msg.type) {
        console.log(msg);
      }
    });*/

    worker.on("exit", code => {
      const message = `프로세스 종료 [PID: ${worker.pid}, CODE: ${code}]`;
      this._logger.warn(message);
      this.server.emit(this.request.id, {name: "exit", code});
    });

    const lastId = Array.from(KtCallManagerApiService._workers.keys()).max() || 0;
    const newId = lastId + 1;
    KtCallManagerApiService._workers.set(newId, worker);

    this._logger.info(`프로세스 시작 [PID: ${worker.pid}]`);

    return newId;
  }

  public async closeAsync(workerId: number): Promise<void> {
    const worker = KtCallManagerApiService._workers.get(workerId);
    if (!worker) {
      throw new Error("KT Call Manager API 프로세스가 생성되어있지 않습니다.");
    }

    worker.kill();
    KtCallManagerApiService._workers.delete(workerId);
  }

  public async loginAsync(workerId: number, isProduction: boolean, apiKey: string, loginId: string, password: string): Promise<void> {
    const worker = KtCallManagerApiService._workers.get(workerId);
    if (!worker) {
      throw new Error("KT Call Manager API 프로세스가 생성되어있지 않습니다.");
    }

    await new Promise<void>((resolve, reject) => {
      const listenerForReturn = (msg: IKtCallManagerApiMessage) => {
        if (msg.type === "return" && msg.name === "login") {
          worker.off("message", listenerForReturn);

          if (msg.code !== 200) {
            const error = new Error();
            error["code"] = msg.code;

            switch (msg.code) {
              case 301:
                error.message = "다른 위치에서 로그인";
                break;
              case 401:
                error.message = "미등록 아이디로 로그인";
                break;
              case 402:
                error.message = "비밀번호 오류 횟수 초과(5회 제한).";
                break;
              case 403 :
                error.message = "임시비밀번호 로그인, 비밀번호 변경 창 표시";
                break;
              case 404 :
                error.message = "임시비밀번호 설정.";
                break;
              case 405 :
                error.message = "비밀번호 오류.";
                break;
              case 407 :
                error.message = "접속 IP 오류.";
                break;
              case 408 :
                error.message = "미등록 PC.";
                break;
              case 409 :
                error.message = "비밀번호 유효성 오류, 비밀번호 변경 창 표시";
                break;
              case 410 :
                error.message = "비밀번호 기간만료(비밀번호 변경창 표시)";
                break;
              case 411 :
                error.message = "비밀번호 기간만료(비밀번호 변경창 표시하지 않음, 설정 > 내정보에서 비밀번호 변경 안내 필요)";
                break;
              case 413 :
                error.message = "임시비밀번호 로그인후 비밀번호 변경";
                break;
              case 419 :
                error.message = "비밀번호 유효성 오류로 인해 비밀번호 변경";
                break;
              case 420 :
                error.message = "비밀번호 기간만료(사용자가 신규 비밀번호 변경)";
                break;
              case 500 :
                error.message = "기타(HTTPS/HTTP 요청 실패)";
                break;
              case 1000 :
                error.message = "이미 로그인 중";
                break;
              case 1001 :
                error.message = "서버 타입 에러";
                break;
              case 1600 :
                error.message = "네트웍오류";
                break;
              case 1502 :
                error.message = "협정 만료일이 지났음";
                break;
              case 1503 :
                error.message = "인증키 유효기간이 지났음";
                break;
              case 1504 :
                error.message = "인증키 비활성";
                break;
              case 1505 :
                error.message = "인증키 타입이 틀릴 경우";
                break;
              case 1506 :
                error.message = "개발 서버이나 상용 인증키, 상용 Flag일 경우";
                break;
              case 1507 :
                error.message = "상용 서버이나 개발 인증키, 개발 Flag일 경우";
                break;
              case 1700 :
                error.message = "API 환경 정보 얻지 못함(실행되는 경로)";
                break;
              case 1701 :
                error.message = "KTA_API.dat / KTD_API.dat등의 data 파일 초기화 에러";
                break;
              case 1702 :
                error.message = "PC 메모리 부족(API 생성 에러)";
                break;
              default:
                error.message = "처리되지 않은 오류";
            }

            worker.off("message", listenerForEvent); //tslint:disable-line:no-use-before-declare
            reject(error);
          }
        }
      };
      worker.on("message", listenerForReturn);

      const listenerForEvent = (msg: IKtCallManagerApiMessage) => {
        if (msg.type === "event" && msg.name === "login") {
          worker.off("message", listenerForEvent);

          if (msg.code === 200) {
            resolve();
          }
          else {
            const error = new Error();
            error["code"] = msg.code;

            switch (msg.code) {
              case 300:
                error.message = "로그아웃(네트웍장애 등)";
                break;
              case 400:
                error.message = "강제 로그아웃";
                break;
              case 401:
                error.message = "CP 강제 로그아웃(인증키 차단)";
                break;
              default:
                error.message = "처리되지 않은 오류";
            }

            worker.off("message", listenerForReturn);
            reject(error);
          }
        }
      };
      worker.on("message", listenerForEvent);

      // 로그인
      this._logger.log(`로그인 [PID: ${worker.pid}]`);
      worker.send(["login", isProduction, apiKey, loginId, password], err => {
        if (err) {
          worker.off("message", listenerForReturn);
          worker.off("message", listenerForEvent);
          reject(err);
        }
      });
    });
  }
}
