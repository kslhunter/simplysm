import {FsUtil} from "@simplysm/sd-core-node";
import * as path from "path";
import {expect} from "chai";
import {SdCliUtil} from "@simplysm/sd-cli";

describe("(node) cli.SdCliUtil", () => {
  describe("getConfigObjAsync", () => {
    it("simplysm.json 설정을 가져올 수 있다.", async () => {
      process.cwd = () => path.resolve(__dirname, "config");

      expect(
        await SdCliUtil.getConfigObjAsync("production")
      ).to.deep.equal({
        "packages": {
          "sd-core-common": {
            "type": "library"
          }
        }
      });
    });

    it("extends 를 통해 설정을 확장할 수 있다.", async () => {
      process.cwd = () => path.resolve(__dirname, "config-extends");

      expect(
        await SdCliUtil.getConfigObjAsync("production")
      ).to.deep.equal({
        "packages": {
          "sd-core-common": {
            "type": "library",
            "env": {
              "AAA": "BBB"
            }
          }
        }
      });
    });

    it("mode (development, production) 를 선택하여 해당 설정만 적용할 수 있다.", async () => {
      process.cwd = () => path.resolve(__dirname, "config-mode");

      expect(
        await SdCliUtil.getConfigObjAsync("development")
      ).to.deep.equal({
        "packages": {
          "sd-core-common": {
            "type": "library",
            "env": {
              "CCC": "DDD"
            }
          }
        }
      });

      expect(
        await SdCliUtil.getConfigObjAsync("production")
      ).to.deep.equal({
        "packages": {
          "sd-core-common": {
            "type": "library",
            "env": {
              "EEE": "FFF"
            }
          }
        }
      });
    });

    it("option 를 선택하여 해당 설정만 적용할 수 있다.", async () => {
      process.cwd = () => path.resolve(__dirname, "config-option");

      expect(
        await SdCliUtil.getConfigObjAsync("development", ["AAA", "BBB"])
      ).to.deep.equal({
        "packages": {
          "sd-core-common": {
            "type": "library",
            "env": {
              "AAA": "1",
              "BBB": "2"
            }
          }
        }
      });

      expect(
        await SdCliUtil.getConfigObjAsync("development", ["BBB", "CCC"])
      ).to.deep.equal({
        "packages": {
          "sd-core-common": {
            "type": "library",
            "env": {
              "BBB": "2",
              "CCC": "3"
            }
          }
        }
      });
    });

    it("extend, mode, option 를 동시에 사용할 수 있다. (extends, mode, option 순으로 로딩함)", async () => {
      process.cwd = () => path.resolve(__dirname, "config-multi");

      expect(
        await SdCliUtil.getConfigObjAsync("development", ["AAA"])
      ).to.deep.equal({
        "packages": {
          "sd-core-common": {
            "type": "library",
            "env": {
              "BBB": "CCC"
            }
          }
        }
      });
    });
  });
});
