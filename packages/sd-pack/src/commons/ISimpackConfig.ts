export type ISimpackConfig = ISimpackClientConfig | ISimpackServerConfig | ISimpackModelConfig;

export interface ISimpackClientConfig {
    type: "client";
    title: string;
    defaultRoute: string;
    publish: {
        host: string;
        port: number;
        userName: string;
        password: string;
        root: string;
    };
    env: { [key: string]: string };
}

export interface ISimpackServerConfig {
    type: "server";
    host: string;
    port: number;
    clients: string[];
    publish: {
        host: string;
        port: number;
        userName: string;
        password: string;
        root: string;
    };
    env: { [key: string]: string };
}

export interface ISimpackModelConfig {
    type: "model";
    dist: string;
    useCamelCase?: boolean;
}
