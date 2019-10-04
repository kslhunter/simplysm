import * as http from "http";
import * as fs from "fs-extra";
import * as path from "path";
import * as JSZip from "jszip";
import * as url from "url";
import * as querystring from "querystring";
import {JsonConvert, Logger, ProcessManager} from "@simplysm/sd-core";

export async function SdEasyPayMiddleware(req: http.IncomingMessage, res: http.ServerResponse, next: (err?: any) => void): Promise<void> {
  const logger = new Logger("@simplysm/sd-service", `SdEasyPayMiddleware`);

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
      logger.log("easy-pay", JsonConvert.stringify(params));

      const resHtml = /* language=HTML */ `
        <html lang="kr">
        <head>
          <title>이지페이</title>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
          <script>
            function _setFormData(formEl, key, value) {
              let inputEl = window.document.getElementById(key);
              if (!inputEl) {
                inputEl = window.document.createElement("input");
                inputEl.type = "hidden";
                inputEl.name = key;
                inputEl.id = key;
                formEl.appendChild(inputEl);
              }

              if(["EP_mall_nm", "EP_product_nm", "EP_user_nm", "EP_user_addr", "EP_res_msg"].includes(key)){
                value = decodeURIComponent(value);
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
              document.body.appendChild(formEl);
              
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
              
              ${Object.keys(params).map(key => `_setFormData(formEl, "${key}", ${params[key] ? `"${params[key]}"` : "null"});`).join("\n")}

              formEl.submit();
            } 
          </script>
        </head>
        </html>
      `;

      res.end(resHtml);
    }
    else if (urlPath === "_easy-pay-result") {
      logger.log("easy-pay-result", JsonConvert.stringify(params));

      //-- easy-pay-cli 압축 풀기
      const zipFilePath = require.resolve("../../../assets/easy-pay-cli.zip");
      const cliDirPath = path.resolve(process.cwd(), "assets", "easy-pay-cli");

      if (!fs.pathExistsSync(cliDirPath)) {
        fs.mkdirsSync(cliDirPath);

        const zipBinary = fs.readFileSync(zipFilePath);
        const zip = await new JSZip().loadAsync(zipBinary);
        for (const zipContainsFileName of Object.keys(zip.files)) {
          const outputFilePath = path.resolve(cliDirPath, zipContainsFileName);
          const zipFile = await zip.file(zipContainsFileName).async("nodebuffer");
          fs.writeFileSync(outputFilePath, zipFile);
        }
      }

      //-- easy-pay-cli 실행
      const cliFilePath = path.resolve(cliDirPath, "SDCM.EasyPayCLI.exe");
      let resultMessageJson = "";
      let errorMessage = "";
      await ProcessManager.spawnAsync(
        cliFilePath
        + " \""
        + JsonConvert.stringify(params)!.replace(/"/g, "\\\"")
        + "\"",
        {
          logger: {
            log: message => {
              resultMessageJson += message;
            },
            error: message => {
              errorMessage += message;
            }
          }
        }
      ).catch(err => {
        throw new Error(errorMessage);
      });

      const resultMessage = JsonConvert.parse(resultMessageJson);

      res.end(/* language=HTML */ `
        <html lang="kr">
        <head>
          <title>이지페이</title>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
          <script>
            function _setFormData(formEl, key, value) {
              let inputEl = window.document.getElementById(key);
              if (!inputEl) {
                inputEl = window.document.createElement("input");
                inputEl.type = "hidden";
                inputEl.name = key;
                inputEl.id = key;
                formEl.appendChild(inputEl);
              }
              
              inputEl.value = value;
            }
            
            const parent = window.opener || window.parent;
            const formEl = parent.document.getElementById("sd-easy-pay-form");
            ${Object.keys(resultMessage).map(key => `_setFormData(formEl, "${key}", ${resultMessage[key] ? `"${resultMessage[key]}"` : "null"});`).join("\n")}
            parent.kicc_popup_close();
          </script>
        </head>
        </html>`);
    }
  }
  catch (err) {
    next(err);
  }
}