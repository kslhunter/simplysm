import Handlebars from "handlebars";
import { fsx } from "@simplysm/core-node";

type Compiled = ReturnType<typeof Handlebars.compile>;

const compileCache = new Map<string, Compiled>();

export async function renderTemplate(tplPath: string, data: unknown): Promise<string> {
  let tpl = compileCache.get(tplPath);
  if (tpl == null) {
    const source = await fsx.read(tplPath);
    tpl = Handlebars.compile(source, { noEscape: true });
    compileCache.set(tplPath, tpl);
  }
  return tpl(data);
}

export async function renderToFile(tplPath: string, outPath: string, data: unknown): Promise<void> {
  const rendered = await renderTemplate(tplPath, data);
  await fsx.write(outPath, rendered);
}

export async function copyFixed(sourcePath: string, outPath: string): Promise<void> {
  await fsx.copy(sourcePath, outPath);
}
