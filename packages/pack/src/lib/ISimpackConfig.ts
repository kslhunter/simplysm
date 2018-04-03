export interface ISimpackConfig {
    dist: string;
    server: ISimpackServerConfig;
    clients?: ISimpackClientConfig[];
    databases?: ISimpackDatabaseConfig[];
    publish?: ISimpackPublishConfig;
}

export interface ISimpackServerConfig {
    package: string;
    name: string;
    host: string | string[];
    port: number;
}

export interface ISimpackClientConfig {
    package: string;
    name: string;
    env?: { [key: string]: any };
    defaultRoute: string;
    cordova?: {
        appId: string;
        platform: "browser" | "android";
        plugins?: string[];
        sign?: string;
        icon?: string;
    };
    electron?: {};
}

export interface ISimpackDatabaseConfig {
    useCamelCase: boolean;
    name: string;
    dist: string;
    modelRoot: string;
}

export interface ISimpackPublishConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    root: string;
}