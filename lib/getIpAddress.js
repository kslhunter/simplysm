import { homedir, networkInterfaces } from "node:os";
import cordova from "cordova-lib";

const nets = networkInterfaces();
console.log(
  Object.values(nets)
    .flatMap((item) => item)
    .filter((item) => !item.internal && item.family === "IPv4")
    .map((item) => item.address),
);

console.log(homedir());