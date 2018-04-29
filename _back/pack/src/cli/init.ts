import * as path from "path";
import * as glob from "glob";
import {Exception, Uuid} from "@simplism/core";
import * as fs from "fs-extra";


export async function init(): Promise<void> {
    const projectName = process.cwd().split("\\").last();
    if (!/[_a-z]*/.test(projectName)) {
        throw new Exception("프로젝트명에는 영어와 밑줄만 사용할 수 있습니다.");
    }

    const files = glob.sync(path.resolve(process.cwd(), "**", "*"), {
        ignore: path.resolve(process.cwd(), "node_modules", "**", "*"),
        dot: true
    });

    for (const file of files) {
        if (fs.lstatSync(file).isDirectory()) {
            continue;
        }

        let fileContent = fs.readFileSync(file, "utf-8");
        fileContent = fileContent
            .replace(/simplism_boilerplate/g, projectName)
            .replace(/SIMPLISM_BOILERPLATE/g, projectName.toUpperCase())
            .replace(/__UUID__/g, Uuid.newUuid().toString());

        if (file.includes("simplism_boilerplate")) {
            fs.removeSync(file);
        }
        fs.writeFileSync(file.replace(/simplism_boilerplate/g, projectName), fileContent);
    }
}