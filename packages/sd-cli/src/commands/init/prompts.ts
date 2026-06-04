import { confirm, input, select } from "@inquirer/prompts";
import type { ClientInputSpec, ClientType, DbDialect, InitInput } from "./types";

const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const APPID_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;

export async function promptInit(workspaceNameDefault: string): Promise<InitInput> {
  const workspaceName = await input({
    message: "워크스페이스 이름 (영문 kebab-case, 예: my-project):",
    default: KEBAB_CASE_RE.test(workspaceNameDefault) ? workspaceNameDefault : undefined,
    validate: (v) => KEBAB_CASE_RE.test(v) || "영문 kebab-case 만 허용됩니다.",
  });

  const description = await input({
    message: "한 줄 설명:",
  });

  const hasServer = await confirm({
    message: "server 패키지를 만들까요?",
    default: true,
  });

  let hasDb = false;
  let dbDialect: DbDialect | undefined;
  let dbContextName: string | undefined;
  let hasAuth = false;
  let userEntityName: string | undefined;
  let userEntityLabel: string | undefined;
  let serverPort: number | undefined;
  if (hasServer) {
    hasDb = await confirm({
      message: "DB 를 사용할까요? (ORM 부트스트랩 포함)",
      default: true,
    });
    if (hasDb) {
      dbDialect = await select<DbDialect>({
        message: "DB dialect 를 선택하세요:",
        choices: [
          { name: "MySQL", value: "mysql" },
          { name: "PostgreSQL", value: "postgresql" },
          { name: "MSSQL", value: "mssql" },
        ],
      });
      dbContextName = await input({
        message: "DB context base 이름 (예: main → MainDbContext 클래스 생성):",
        default: "main",
        validate: (v) =>
          /^[A-Za-z][A-Za-z0-9]*$/.test(v) || "영문 (대소문자) + 숫자만, 첫 글자는 영문",
      });

      hasAuth = await confirm({
        message: "사용자 인증을 사용할까요? (사용자/역할/권한/로그 테이블 부트스트랩)",
        default: true,
      });
      if (hasAuth) {
        const useDefaultEntity = await confirm({
          message: "사용자 엔티티를 user / 사용자 로 만들까요?",
          default: true,
        });
        if (useDefaultEntity) {
          userEntityName = "user";
          userEntityLabel = "사용자";
        } else {
          userEntityName = await input({
            message: "사용자 엔티티 영문 식별자 (kebab-case, 예: employee):",
            validate: (v) => KEBAB_CASE_RE.test(v) || "영문 kebab-case 만 허용됩니다.",
          });
          userEntityLabel = await input({
            message: "사용자 엔티티 한글 라벨 (예: 직원):",
            validate: (v) => v.trim().length > 0 || "라벨을 입력하세요.",
          });
        }
      }
    }

    const portStr = await input({
      message: "server port:",
      default: "40080",
      validate: (v) => {
        const n = Number(v);
        return (Number.isInteger(n) && n > 0 && n < 65536) || "유효한 포트 번호 (1-65535)";
      },
    });
    serverPort = Number(portStr);
  }

  const clients: ClientInputSpec[] = [];
  for (;;) {
    const shouldAdd =
      clients.length === 0
        ? await confirm({ message: "client 를 추가할까요?", default: true })
        : await confirm({ message: "다른 client 를 더 추가할까요?", default: false });
    if (!shouldAdd) break;

    const clientName = await input({
      message: "client 이름 (예: admin → 자동으로 client-admin):",
      validate: (v) => KEBAB_CASE_RE.test(v) || "영문 kebab-case 만 허용됩니다.",
    });
    const clientType = await select<ClientType>({
      message: "client 타입:",
      choices: [
        { name: "일반 웹", value: "web" },
        { name: "모바일 (capacitor)", value: "mobile" },
      ],
    });

    let hasRouter = false;
    if (clientType !== "mobile") {
      hasRouter = await confirm({
        message: `${clientName}: 라우팅 (@angular/router) 을 쓸까요?`,
        default: true,
      });
    }

    clients.push({ name: clientName, type: clientType, hasRouter });
  }

  let mobileAppId: string | undefined;
  if (clients.some((c) => c.type === "mobile")) {
    mobileAppId = await input({
      message: "capacitor appId (reverse-DNS, 예: kr.co.example.app):",
      validate: (v) => APPID_RE.test(v) || "reverse-DNS 형식이어야 합니다.",
    });
  }

  return {
    workspaceName,
    description,
    hasServer,
    clients,
    hasDb,
    dbDialect,
    dbContextName,
    hasAuth,
    userEntityName,
    userEntityLabel,
    mobileAppId,
    serverPort,
  };
}
