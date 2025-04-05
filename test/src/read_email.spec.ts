/* eslint-disable no-console */

import "@simplysm/sd-core-common";
import { SdPop3Client } from "@simplysm/sd-pop3";

describe("메일 읽기", () => {
  it("목록", async () => {
    await SdPop3Client.connectAsync({
      host: "",
      port: 0,
      user: "",
      pass: "",
    }, async (client) => {
      const stat = await client.statAsync();
      console.log(stat);

      const top = await client.topAsync(18696); //18663
      console.log("TOP:", top);

      /*const capa = await client.capaAsync();
      console.log("CAPA:", capa);*/

      /*const list = await client.listAsync();
      console.log("LIST:", list);

      const top = await client.topAsync(8);
      console.log("TOP:", top);

      if (
        top.subject.toLowerCase().includes("ssd") &&
        top.subject.toLowerCase().includes("fcst")
      ) {
        const retr = await client.retrAsync(8);
        console.log("RETR:", retr);

        const jsdom = new JSDOM(retr.html);
        const doc = jsdom.window.document;
        const tableEl = Array.from(doc.body.querySelectorAll("table"))
          .single(item => {
            const ths = item.querySelectorAll("td");
            return ths[0].textContent.trim() === "Site" && ths[1].textContent.trim() === "Material";
          });

        const trs = Array.from(tableEl!.querySelectorAll("tr"));
        const headers = Array.from(trs[0].querySelectorAll("td"))
          .map(item => item.textContent.trim().replace(/[\r\n ]/g, ""));
        console.log(headers);

        let result: Record<string, any>[] = [];
        for (let r = 1; r < trs.length; r++) {
          const tds = Array.from(trs[r].querySelectorAll("td"));

          let obj: Record<string, any> = {};
          for (let c = 0; c < headers.length; c++) {
            obj[headers[c]] = tds[c].textContent.trim();
          }

          result.push(obj);
        }

        console.log(result);
      }*/
    });
  });
});