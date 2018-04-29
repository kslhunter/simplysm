import * as chokidar from "chokidar";
import {Logger} from "@simplism/core";

export class FileWatcher {
    private static _logger: Logger = new Logger("FileWatcher");

    static watch(glob: string | string[], opts: chokidar.WatchOptions, cb: (events: { type: string; filePath?: string }[]) => Promise<void>): void {
        let events: { type: string; filePath?: string }[] = [];
        let timeout: NodeJS.Timer;


        const doCallback = async () => {
            const currEvents = [...events];
            events = [];
            await cb(currEvents.distinct()).catch((err) => {
                this._logger.error(err);
            });

            if (events.length > 0) {
                await doCallback();
            }
        };

        const onChange = async (evt: string, filePath?: string) => {
            events.push({type: evt, filePath});

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                await doCallback();
            }, 1000);
        };

        if (typeof glob === "string") {
            glob = glob.replace(/\\/g, "/");
        }
        else {
            glob = glob.map(item => item.replace(/\\/g, "/"));
        }

        const watcher = chokidar
            .watch(glob, opts)
            .on("ready", async () => {
                await onChange("ready");
                watcher.on("add", async fp => await onChange("add", fp));
                watcher.on("change", async fp => await onChange("change", fp));
                watcher.on("unlink", async fp => await onChange("unlink", fp));
            });
    }
}