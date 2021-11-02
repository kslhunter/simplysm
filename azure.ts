/*import * as msRest from "@azure/ms-rest-js";
import * as msRestAzure from "@azure/ms-rest-azure-js";*/
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { WebSiteManagementClient, WebSiteManagementModels, WebSiteManagementMappers } from "@azure/arm-appservice";
import * as xml2js from "xml2js";

(async () => {
  const creds = await msRestNodeAuth.loginWithUsernamePassword("slkim@simplysm.net", "tlavmfflwma@0830");
  const webSiteClient = new WebSiteManagementClient(creds, "35748328-af5c-475a-b73e-8a9025edffa1");
  // await client.webApps.stop("simplysm-ts", "simplysm-ts-webapp");
  const r1 = await webSiteClient.webApps.listPublishingCredentials("simplysm-ts", "simplysm-ts-webapp");
  console.log("r1", r1);
  const r2 = await webSiteClient.webApps.listPublishingProfileXmlWithSecrets("simplysm-ts", "simplysm-ts-webapp", {
    format: "Ftp"
  });
  const xmlValue = await xml2js.parseStringPromise(r2.readableStreamBody!.read().toString());
  const ftpConfig = xmlValue.publishData.publishProfile.find((item: any) => item.$.publishMethod === "FTP")!.$;
  console.log("r2", xmlValue.publishData.publishProfile.find((item: any) => item.$.publishMethod === "FTP")!.$);

})().catch((err) => {
  console.error(err);
});
