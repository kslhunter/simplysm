import {ISimpackConfig} from '../lib/ISimpackConfig';
import * as path from 'path';
import * as glob from 'glob';
import * as fs from 'fs-extra';
import {FtpStorage} from '@simplism/storage';
import {spawnSync} from 'child_process';

export async function publish(argv: { config: string; env: string | undefined }): Promise<void> {
    // TODO: 현재 빌드되있는 것이 production 인지 확인해야함.

    const spawn1 = spawnSync('git', ['diff'], {
        shell: true
    });
    if (spawn1.output.filter(item => item && item.toString().trim()).length > 0) {
        console.error('커밋/푸쉬 되지 않은 정보가 있습니다.');
        return;
    }

    const spawn2 = spawnSync('git', ['log', 'origin/master..HEAD'], {
        shell: true
    });
    if (spawn2.output.filter(item => item && item.toString().trim()).length > 0) {
        console.error('푸쉬되지 않은 정보가 있습니다.');
        return;
    }

    process.env.NODE_ENV = 'production';
    process.env.SD_ENV = argv.env;

    require('ts-node/register');
    const configPath = path.resolve(process.cwd(), argv.config);
    const config: ISimpackConfig = require(configPath);

    if (!config.publish) {
        console.error('배포 설정을 찾을 수 없습니다.');
        return;
    }

    //-- 배포
    const storage = new FtpStorage();
    await storage.connect({
        host: config.publish.host,
        port: config.publish.port,
        user: config.publish.user,
        password: config.publish.password
    });

    //-- 루트 디렉토리 생성
    await storage.mkdir(config.publish.root);

    //-- 로컬 파일 전송
    const filePaths = glob.sync(path.resolve(config.dist, '**', '*'), {});
    for (const filePath of filePaths) {
        const ftpFilePath = config.publish.root + '/' + path.relative(path.resolve(config.dist), filePath).replace(/\\/g, '/');
        if (fs.lstatSync(filePath).isDirectory()) {
            await storage.mkdir(ftpFilePath);
        } else {
            await storage.put(filePath, ftpFilePath);
        }
    }

    //-- pm2.json 전송
    await storage.put(
        Buffer.from(
            JSON.stringify({
                apps: [{
                    name: config.publish.root.replace(/\//g, '_'),
                    script: './app.js',
                    port: config.server.port,
                    watch: [
                        'app.js',
                        'pm2.json'
                    ],
                    env: {
                        NODE_ENV: 'production',
                        SD_ENV: argv.env
                    }
                }]
            }, undefined, 2)
        ),
        `/${config.publish.root}/pm2.json`
    );

    await storage.close();
}
