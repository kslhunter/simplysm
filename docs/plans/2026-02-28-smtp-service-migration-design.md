# SMTP Service Migration (v12 → v13)

## Overview

v12의 SMTP 클라이언트 서비스를 v13 패턴으로 마이그레이션.

## Source (v12)

- `packages/sd-service-server/src/services/SdSmtpClientService.ts`
- `packages/sd-service-common/src/service-types/smtp-service.types.ts`

## Target (v13)

### File: `packages/service-server/src/services/smtp-client-service.ts`

하나의 파일에 타입과 서비스 구현을 모두 포함.

**Types** (v12 `I` prefix 제거):

- `SmtpClientSendAttachment` — 첨부파일 정의
- `SmtpClientSendByDefaultOption` — config 기반 전송 옵션 (to, cc, bcc, subject, html, attachments)
- `SmtpClientSendOption` — 직접 전송 옵션 (host, port, secure, user, pass + 메일 필드)
- `SmtpClientDefaultConfig` — 서버 설정 파일 구조 (senderName, senderEmail, host 등)

**Service** (`defineService` 패턴):

```typescript
export const SmtpClientService = defineService("SmtpClient", (ctx) => ({
  async send(options: SmtpClientSendOption): Promise<string> { ... },
  async sendByConfig(configName: string, options: SmtpClientSendByDefaultOption): Promise<string> { ... },
}));

export type SmtpClientServiceType = ServiceMethods<typeof SmtpClientService>;
```

### Changes

- `packages/service-server/src/index.ts` — export 추가
- `packages/service-server/package.json` — `nodemailer`, `@types/nodemailer` 의존성 추가

## Key Differences from v12

| Aspect | v12 | v13 |
|--------|-----|-----|
| Pattern | `class extends SdServiceBase` | `defineService("SmtpClient", (ctx) => ({...}))` |
| Config access | `this.getConfigAsync()` | `ctx.getConfig()` |
| Interface naming | `ISdSmtpClientService` | `SmtpClientServiceType` (via `ServiceMethods`) |
| Type naming | `ISmtp*` prefix | `Smtp*` (no prefix) |
| Error messages | Korean | English |
| Types location | service-common | service-server (same file) |

## Not Changed

- `nodemailer` 사용 방식 동일
- `send()`, `sendByConfig()` 기능 1:1 동일
- 에러 처리: config 미발견 시 throw, 나머지는 nodemailer 위임
