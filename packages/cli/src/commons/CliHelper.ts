import * as fs from "fs-extra";
import * as semver from "semver";
import * as os from "os";
import * as path from "path";

export class CliHelper {
  public static rewritePackageVersion(packageName: string, useRootVersion: boolean): void {
    // 최상위 package.json 설정 가져오기
    const rootPackageJson = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));

    // package.json 설정 가져오기
    const packageJsonPath = path.resolve(process.cwd(), `packages/${packageName}`, "package.json");
    const packageJson = fs.readJsonSync(packageJsonPath);

    // 버전지정
    if (useRootVersion) {
      if (semver.gt(rootPackageJson.version, packageJson.version)) {
        packageJson.version = rootPackageJson.version;
      }
    }
    packageJson.version = semver.inc(packageJson.version, "patch")!;

    // root package.json 에서 Repository 복사
    packageJson.repository = rootPackageJson.repository;

    // 의존성 버전 재구성
    const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
    for (const depTypeName of depTypeNames) {
      for (const depName of Object.keys(packageJson[depTypeName] || {})) {
        if (depName.startsWith("@" + rootPackageJson.name)) {
          packageJson[depTypeName][depName] = `^${rootPackageJson.version}`;
        }
        else if ({...rootPackageJson.dependencies, ...rootPackageJson.devDependencies}[depName]) {
          packageJson[depTypeName][depName] = {...rootPackageJson.dependencies, ...rootPackageJson.devDependencies}[depName];
        }
        else {
          throw new Error(`'${packageName}'패키지의 의존성 패키지인 "${depName}" 정보가 루트 패키지에 없습니다.`);
        }
      }
    }

    // package.json 파일 다시쓰기
    fs.writeJsonSync(packageJsonPath, packageJson, {spaces: 2, EOL: os.EOL});
  }

  public static getCurrentIP(selectors: (string | undefined)[]): string {
    for (const selector of selectors) {
      if (selector && !selector.includes(".")) {
        return selector;
      }

      const ipRegExpString = selector
        ? selector.replace(/\./g, "\\.").replace(/\*/g, "[0-9]*")
        : ".*";

      const ifaces = os.networkInterfaces();
      const result = Object.keys(ifaces)
        .map(key => ifaces[key].filter(item => item.family === "IPv4" && !item.internal))
        .filter(item => item.length > 0).mapMany(item => item.map(item1 => item1.address))
        .single(addr => new RegExp(ipRegExpString).test(addr));
      if (!result) {
        continue;
      }
      return result;
    }

    throw new Error(`"${selectors.join(`", "`)}"와 매칭되는 아이피 주소를 찾을 수 없습니다.`);
  }
}