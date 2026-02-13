import type { Bytes } from "@simplysm/core-common";
import { bytesConcat, bytesToHex, bytesFromHex } from "@simplysm/core-common";
import type { CryptoConfig } from "@simplysm/service-common";
import crypto from "crypto";
import { defineService, type ServiceMethods } from "../core/define-service";

export const CryptoService = defineService("Crypto", (ctx) => ({
  async encrypt(data: string | Bytes): Promise<string> {
    const config = await ctx.getConfig<CryptoConfig>("crypto");
    return crypto.createHmac("sha256", config.key).update(data).digest("hex");
  },

  async encryptAes(data: Bytes): Promise<string> {
    const config = await ctx.getConfig<CryptoConfig>("crypto");

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", config.key, iv);
    const encrypted = cipher.update(data);

    return bytesToHex(iv) + ":" + bytesToHex(bytesConcat([encrypted, cipher.final()]));
  },

  async decryptAes(encText: string): Promise<Bytes> {
    const config = await ctx.getConfig<CryptoConfig>("crypto");

    const textParts = encText.split(":");
    const iv = bytesFromHex(textParts.shift()!);
    const encryptedText = bytesFromHex(textParts.join(":"));
    const decipher = crypto.createDecipheriv("aes-256-cbc", config.key, iv);
    const decrypted = decipher.update(encryptedText);

    return bytesConcat([decrypted, decipher.final()]);
  },
}));

export type CryptoServiceType = ServiceMethods<typeof CryptoService>;
