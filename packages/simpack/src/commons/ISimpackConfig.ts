export type ISimpackConfig = {
    type: "client";
    title: string;
    host: string;
    port: number;
} | {
    type: "server";
};