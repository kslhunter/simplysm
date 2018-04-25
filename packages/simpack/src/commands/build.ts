import * as fs from "fs-extra";
import * as path from "path";
import {LibraryBuilder} from "../builders/LibraryBuilder";

export async function build(argv: { watch: boolean }): Promise<void> {
    const promiseList: Promise<void>[] = [];
    for (const packageName of fs.readdirSync(path.resolve(process.cwd(), `packages`))) {
        promiseList.push(new LibraryBuilder(packageName).runAsync(argv.watch));
    }
    await Promise.all(promiseList);
}