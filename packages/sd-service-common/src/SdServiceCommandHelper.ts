import { ISdServiceMethodCommandInfo, TSdServiceMethodCommand } from "./types/command.types";

export abstract class SdServiceCommandHelper {
  // 서비스 메소드 호출용 커맨드 빌더
  static buildMethodCommand(cmdInfo: ISdServiceMethodCommandInfo): TSdServiceMethodCommand {
    return `${cmdInfo.serviceName}.${cmdInfo.methodName}`;
  }

  // command 문자열이 "Service.method" 형식인지 검사 + 파싱
  static parseMethodCommand(command: string): ISdServiceMethodCommandInfo | undefined {
    const parts = command.split(".");
    if (parts.length !== 2) return undefined;

    const [serviceName, methodName] = parts;
    if (!serviceName || !methodName) return undefined;

    return { serviceName, methodName };
  }
}
