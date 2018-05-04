import * as path from 'path';
import {ISimpackConfig} from './ISimpackConfig';
import {Logger} from '@simplism/core';
import {ServerWebpackConfig} from './ServerWebpackConfig';
import * as webpack from 'webpack';
import {ChildProcess, spawn, spawnSync} from 'child_process';
import * as glob from 'glob';
import * as fs from 'fs-extra';
import {FileWatcher} from './FileWatcher';

export class ServerBuilder {
    static async watch(config: ISimpackConfig, env: string | undefined): Promise<void> {
        const logger = new Logger(config.server.package);
        await new Promise<void>((resolve, reject) => {
            logger.info('감지시작');

            FileWatcher.watch(path.resolve(process.cwd(), 'packages', config.server.package, 'src', 'services', '**', '*.ts'), {}, async (events) => {
                if (!events.some(item => item.type === 'ready' || item.type === 'add' || item.type === 'unlink')) {
                    return;
                }

                this._generateAppServiceFile(config.server.package);
            });

            const webpackConfig = ServerWebpackConfig.getForStart(config, env);
            const compiler = webpack(webpackConfig);
            let spawnProcess: ChildProcess | undefined;
            compiler.watch({}, (err, stats) => {
                if (err) {
                    logger.error(err);
                    reject();
                    return;
                }

                const info = stats.toJson();

                if (stats.hasErrors()) {
                    for (const error of info.errors) {
                        logger.error(error
                            .replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nWARNING: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]:\n`;
                            })
                        );
                    }
                }

                if (stats.hasWarnings()) {
                    for (const warning of info.warnings) {
                        logger.warn(warning
                            .replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nWARNING: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]:\n`;
                            })
                        );
                    }
                }

                logger.info(`빌드완료: http://${config.server.host}:${config.server.port}`);

                //-- 서버 재시작
                if (spawnProcess) {
                    spawnSync('taskkill', ['/F', '/T', '/PID', spawnProcess.pid.toString()], {
                        stdio: 'pipe',
                        shell: true
                    });
                    spawnProcess = undefined;
                }

                if (!stats.hasErrors()) {
                    try {
                        spawnProcess = spawn('node', ['-r', 'source-map-support/register', 'app.js'], {
                            stdio: 'pipe',
                            shell: true,
                            cwd: path.resolve(config.dist)
                        });
                        spawnProcess.stdout.on('data', data => {
                            if (data.toString().trim()) {
                                console.log(data.toString());
                            }
                        });
                        spawnProcess.stderr.on('data', data => {
                            const errorMessage = data.toString().replace(/[^\n]* tedious deprecated The [^\n]*/g, '').trim();
                            if (errorMessage) {
                                console.error(errorMessage);
                            }
                        });
                    } catch (e) {
                        logger.error(e, e.stack);
                    }
                }

                resolve();
            });

            let prevTimestamps: { [key: string]: number };
            compiler.hooks.watchRun.tap(config.server.package, (compilation) => {
                const fileTimestamps = compilation['fileTimestamps'] as Map<string, number>;

                const changeLogs = [];
                if (prevTimestamps) {
                    const changes = Array.from(fileTimestamps.keys())
                        .filter(fileName => prevTimestamps[fileName] < fileTimestamps.get(fileName)!);
                    for (const change of changes) {
                        changeLogs.push(`${change}: ${prevTimestamps[change]} => ${fileTimestamps.get(change)}`);
                    }
                }

                prevTimestamps = prevTimestamps || {};
                for (const fileName of Array.from(fileTimestamps.keys())) {
                    prevTimestamps[fileName] = fileTimestamps.get(fileName)!;
                }

                logger.info('변경감지:', changeLogs);
            });
        });
    }

    static async build(config: ISimpackConfig, env: string | undefined): Promise<void> {
        const logger = new Logger(config.server.package);
        logger.info(`빌드 시작`);
        this._generateAppServiceFile(config.server.package);

        //-- 빌드
        const webpackConfig = ServerWebpackConfig.getForBuild(config, env);
        const compiler = webpack(webpackConfig);
        await new Promise<void>((resolve, reject) => {
            compiler.run((err, stats) => {
                if (err) {
                    logger.error(err);
                    reject();
                    return;
                }

                const info = stats.toJson();

                if (stats.hasErrors()) {
                    for (const error of info.errors) {
                        logger.error(error
                            .replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nWARNING: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]:\n`;
                            })
                        );
                    }
                }

                if (stats.hasWarnings()) {
                    for (const warning of info.warnings) {
                        logger.warn(warning
                            .replace(/\[at-loader] (.*):([0-9]*):([0-9]*)(\s|\n)*/g, (...matches: string[]) => {
                                return `${matches[1]}\nWARNING: ${path.resolve(process.cwd(), matches[1])}[${matches[2]}, ${matches[3]}]:\n`;
                            })
                        );
                    }
                }

                logger.info(`빌드 완료`);
                resolve();
            });
        });
    }

    private static _generateAppServiceFile(packageName: string): void {
        let importString = ``;

        const services: string[] = [];
        const serviceFilePaths = glob.sync(path.resolve(process.cwd(), 'packages', packageName, 'src', '**', '*Service.ts'))
            .orderBy(item => item.split(/[\\\/]/g).length);
        for (const serviceFilePath of serviceFilePaths) {
            const relativePath = path.relative(path.resolve(process.cwd(), 'packages', packageName, 'src'), serviceFilePath);

            const typeName = relativePath.split(/[\\\/]/g).last().slice(0, -3);
            services.push(typeName);
            importString += `import {${typeName}} from "./${relativePath.replace(/\\/g, '/').slice(0, -3)}";\r\n`;
        }

        fs.writeFileSync(path.resolve(process.cwd(), 'packages', packageName, 'src', 'AppModuleDefinitions.ts'), `${importString}
const services: any[] = ${JSON.stringify(services, undefined, 4).replace(/"/g, '')};
export {services};`);
    }
}
