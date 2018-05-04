import '@simplism/core';
import * as webpack from 'webpack';

/**
 * @deprecated
 */
export class WebpackWatchTimefixPlugin {
    apply(compiler: webpack.Compiler): void {
        let isFirst = true;
        let isTimefixed = false;

        const timefix = 20000;
        compiler.hooks.watchRun.tap('WatchTimefix', (watching) => {
            if (isFirst) {
                watching['startTime'] += timefix;
                isFirst = false;
                isTimefixed = true;
            }
        });
        compiler.hooks.done.tap('WatchTimefix', (stats) => {
            if (isTimefixed) {
                stats['startTime'] -= timefix;
                isTimefixed = false;
            }
        });
    }
}
