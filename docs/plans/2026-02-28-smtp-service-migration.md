# SMTP Service Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Migrate v12 SMTP client service to v13 `defineService` pattern.

**Architecture:** Single file in service-server containing types + service implementation. Uses `defineService` + `ctx.getConfig` pattern, identical to auto-update-service.

**Tech Stack:** nodemailer, TypeScript, @simplysm/service-server defineService

---

### Task 1: Add nodemailer dependencies

**Files:**
- Modify: `packages/service-server/package.json`

**Step 1: Add dependencies to package.json**

Add to `dependencies`:
```json
"nodemailer": "^8.0.1"
```

Add to `devDependencies`:
```json
"@types/nodemailer": "^6.4.17"
```

**Step 2: Install dependencies**

Run: `pnpm install`
Expected: Successful install, lockfile updated.

---

### Task 2: Create smtp-client-service.ts

**Files:**
- Create: `packages/service-server/src/services/smtp-client-service.ts`

**Step 1: Create the service file with types and implementation**

```typescript
import nodemailer from "nodemailer";
import { defineService, type ServiceMethods } from "../core/define-service";

export interface SmtpClientSendAttachment {
  filename: string;
  content?: Buffer;
  path?: any;
  contentType?: string;
}

export interface SmtpClientSendByDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpClientSendAttachment[];
}

export interface SmtpClientSendOption {
  host: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;

  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpClientSendAttachment[];
}

export interface SmtpClientDefaultConfig {
  senderName: string;
  senderEmail?: string;
  user?: string;
  pass?: string;
  host: string;
  port?: number;
  secure?: boolean;
}

export const SmtpClientService = defineService("SmtpClient", (ctx) => ({
  async send(options: SmtpClientSendOption): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const transport = nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.secure,
        auth:
          options.user != null
            ? {
                user: options.user,
                pass: options.pass,
              }
            : undefined,
        tls: {
          rejectUnauthorized: false,
        },
      });

      transport.sendMail(options, (err, info) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(info.messageId);
      });
    });
  },

  async sendByConfig(configName: string, options: SmtpClientSendByDefaultOption): Promise<string> {
    const config = (
      await ctx.getConfig<Record<string, SmtpClientDefaultConfig | undefined>>("smtp")
    )[configName];
    if (config == null) {
      throw new Error(`SMTP config not found: ${configName}`);
    }

    return await this.send({
      user: config.user,
      pass: config.pass,
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: `"${config.senderName}" <${config.senderEmail ?? config.user}>`,
      ...options,
    });
  },
}));

export type SmtpClientServiceType = ServiceMethods<typeof SmtpClientService>;
```

---

### Task 3: Update index.ts exports

**Files:**
- Modify: `packages/service-server/src/index.ts:26`

**Step 1: Add export to index.ts**

Add after line 26 (`export * from "./services/auto-update-service";`):
```typescript
export * from "./services/smtp-client-service";
```
