import * as path from 'path';
import * as glob from 'glob';
import {spawn} from 'child_process';
import * as fs from 'fs-extra';
import {ISimpackConfig} from '../lib/ISimpackConfig';
import * as iconv from 'iconv-lite';
import {Exception} from '@simplism/core';

export async function keygen(argv: { config: string; password: string }): Promise<void> {
    require('ts-node/register');
    const configPath = path.resolve(process.cwd(), argv.config);
    const config: ISimpackConfig = require(configPath);
    const clients = config.clients && config.clients.filter(item => item.cordova && item.cordova.sign);

    if (clients) {
        const keytoolPaths = glob.sync(path.resolve('c:', 'Program Files', 'Java', 'jdk*', 'bin', 'keytool.exe'));
        const keytoolPath = keytoolPaths.last();

        for (const client of clients) {
            const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), 'package.json'));
            const aliasName = packageConfig.name + '.' + client.package;

            if (fs.existsSync(path.resolve(client.cordova!.sign!, aliasName + '.jks'))) {
                throw new Exception('키쌍이 이미 존재합니다.');
            }

            fs.mkdirsSync(client.cordova!.sign!);

            const cmd = spawn('"' + keytoolPath + '"', [
                '-genkey', '-noprompt',
                '-alias', aliasName,
                '-dname', 'CN=',
                '-keyalg', 'RSA',
                '-keysize', '2048',
                '-validity', '10000',
                '-keystore', aliasName + '.jks',
                '-storepass', argv.password,
                '-keypass', argv.password
            ], {
                shell: true,
                cwd: client.cordova!.sign
            });

            await new Promise<void>((resolve, reject) => {
                let errorMessage = '';
                cmd.stdout.on('data', (data: Buffer) => {
                    errorMessage += iconv.decode(data, 'euc-kr');
                });
                cmd.stderr.on('data', (data: Buffer) => {
                    const str = iconv.decode(data, 'euc-kr');
                    if (!str.includes('PKCS12') && !str.includes('Warning')) {
                        console.log(str);
                    }
                });
                cmd.on('exit', () => {
                    if (errorMessage && errorMessage) {
                        reject(new Error(errorMessage));
                    }
                    resolve();
                });
            });

            fs.writeFileSync(
                path.resolve(client.cordova!.sign!, 'release-signing.properties'),
                'key.store=' + aliasName + '.jks' + '\n' +
                'key.store.password=' + argv.password + '\n' +
                'key.alias=' + aliasName + '\n' +
                'key.alias.password=' + argv.password
            );
        }
    }
}
