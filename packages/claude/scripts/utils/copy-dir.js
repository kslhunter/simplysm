import fs from "fs";
import pino from "pino";

const logger = pino({ name: "@simplysm/claude" });

/** @param {string} src @param {string} dest */
export function copyDir(src, dest) {
  try {
    fs.cpSync(src, dest, { recursive: true });
  } catch (err) {
    logger.error({ err, src, dest }, "copyDir 실패");
    throw err;
  }
}
