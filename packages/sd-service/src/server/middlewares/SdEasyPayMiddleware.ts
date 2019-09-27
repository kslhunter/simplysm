import * as http from "http";
import * as fs from "fs-extra";
import * as path from "path";
import * as JSZip from "jszip";

import * as url from "url";
import * as querystring from "querystring";

/*import {JsonConvert} from "@simplysm/sd-core";*/

export async function SdEasyPayMiddleware(req: http.IncomingMessage, res: http.ServerResponse, next: (err?: any) => void): Promise<void> {
  try {
    const urlObj = url.parse(req.url!, true, false);
    const urlPath = decodeURI(urlObj.pathname!.slice(1));

    if (req.method !== "POST" && urlPath !== "_easy-pay" && urlPath !== "_easy-pay-result") {
      next();
      return;
    }

    //-- 입력 데이터 확인
    const params = await new Promise<any>(resolve => {
      let body = "";
      req.on("readable", () => {
        body += req.read();
      });
      req.on("end", () => {
        resolve(querystring.parse(body));
      });
    });

    if (urlPath === "_easy-pay") {
      //-- easy-pay-cli 압축 풀기
      const zipFilePath = require.resolve("../../../assets/easy-pay-cli.zip");
      const cliDirPath = path.resolve(process.cwd(), "assets", "easy-pay-cli");

      if (!fs.pathExistsSync(cliDirPath)) {
        fs.mkdirsSync(cliDirPath);

        const zipBinary = fs.readFileSync(zipFilePath);
        const zip = await new JSZip().loadAsync(zipBinary);
        for (const zipContainsFileName of Object.keys(zip.files)) {
          const outputFilePath = path.resolve(cliDirPath, zipContainsFileName);
          zip.file(zipContainsFileName).nodeStream().pipe(fs.createWriteStream(outputFilePath));
        }
      }

      res.end(/* language=HTML */ `
        <html lang="kr">
        <head>
          <title>이지페이</title>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
          <script>
            function _setFormData(formEl, key, value) {
              let inputEl = formEl.document.getElementById(key);
              if (!inputEl) {
                inputEl = document.createElement("input");
                inputEl.type = "hidden";
                inputEl.name = key;
                inputEl.setAttribute("id", key);
                formEl.appendChild(inputEl);
              }

              inputEl.value = value;
            }

            function _copyFormDataFromParent(formEl, key) {
              const parent = window.opener || window.parent;
              const parentDataEl = parent.document.getElementById(key);
              if (parentDataEl) {
                _setFormData(formEl, key, parent.document.getElementById(key).value);
              }
            }

            window.onload = function () {
              const formEl = document.createElement("form");
              formEl.method = "post";
              formEl.action = "./_easy-pay-result";

              _copyFormDataFromParent(formEl, "EP_mall_id");
              _copyFormDataFromParent(formEl, "EP_mall_nm");
              _copyFormDataFromParent(formEl, "EP_order_no");
              _copyFormDataFromParent(formEl, "EP_pay_type");
              _copyFormDataFromParent(formEl, "EP_currency");
              _copyFormDataFromParent(formEl, "EP_product_nm");
              _copyFormDataFromParent(formEl, "EP_product_amt");
              _copyFormDataFromParent(formEl, "EP_return_url");
              _copyFormDataFromParent(formEl, "EP_lang_flag");
              _copyFormDataFromParent(formEl, "EP_charset");
              _copyFormDataFromParent(formEl, "EP_user_id");
              _copyFormDataFromParent(formEl, "EP_memb_user_no");
              _copyFormDataFromParent(formEl, "EP_user_nm");
              _copyFormDataFromParent(formEl, "EP_user_mail");
              _copyFormDataFromParent(formEl, "EP_user_phone1");
              _copyFormDataFromParent(formEl, "EP_user_phone2");
              _copyFormDataFromParent(formEl, "EP_user_addr");
              _copyFormDataFromParent(formEl, "EP_product_type");
              _copyFormDataFromParent(formEl, "EP_product_expr");
              _copyFormDataFromParent(formEl, "EP_vacct_end_date");
              _copyFormDataFromParent(formEl, "EP_vacct_end_time");
              
              ${Object.keys(params).map(key => `_setFormData(formEl, "${key}", "${params[key]}")`).join("\n")}

              document.body.appendChild(formEl);
              formEl.submit();
            }

          </script>
        </head>
        </html>
      `);
    }
    else if (urlPath === "_easy-pay-result") {
      console.log(params);
    }

    /*//-- easy-pay-cli 실행
    const cliFilePath = path.resolve(cliDirPath, "SDCM.EasyPayCLI.exe");
    console.log(JsonConvert.stringify(params)!.replace(/"/g, "\\\""));
    let resultMessage = "";
    let errorMessage = "";
    await ProcessManager.spawnAsync(
      cliFilePath
      + " \""
      + JsonConvert.stringify(params)!.replace(/"/g, "\\\"")
      + "\"",
      {
        logger: {
          log: message => {
            resultMessage += message;
          },
          error: message => {
            errorMessage += message;
          }
        }
      }
    ).catch(err => {
      throw new Error(errorMessage);
    });

    res.end(JsonConvert.stringify(resultMessage, {space: 2}));*/
  }
  catch (err) {
    next(err);
  }
}