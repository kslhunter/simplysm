// import * as Assert from "assert";
import {JsonConvert, ProcessManager} from "@simplysm/sd-core";
import * as path from "path";
import {SdEasyPayMiddleware} from "./SdEasyPayMiddleware";
import * as querystring from "querystring";

describe("SdEasyPayMiddleware", function (): void {
  this.timeout(10000);

  it("easy-pay-cli", done => {
    const jsonData = JsonConvert.stringify({
      CertFilePath: path.resolve(__dirname, "../../../assets/easy-pay-cli/pg_cert.pem"),
      LogDirPath: path.resolve(__dirname, "../../../assets/easy-pay-cli/log"),
      LogLevel: 1,
      Request: {
        EP_tr_cd: "00101000",
        EP_trace_no: "19092618532910471460",
        EP_order_no: "ORDER_",
        EP_mall_id: "T5102001",
        EP_encrypt_data: "1r7ostyJpV-p9q2Dqfsg3mcPIdWPhymnl7PWM6Gw2iFXCmHB9cu2VPmcCBXrWXx42WqeaL3a2cyLSG6skETY1HHtzLSt19.uEKp-GS9FKjyFxDI39tRlL25AioW4uTszRIMeZFSZQYkM4.cqtEA9z09JbjVh9ZiXIq.1GvzAY2K5KELf-7jYi25y3eN7UaC3QFuaPTu3MCUKdH.ApV3ZlZnM9bxwfPMEJgELUeyMePOObYIfU0wccgJ4WkA11S8JA9r7hUJwqCTF-1Apwcnv25GuhaWqiDhVhQ7rXZg9Yk.tDai.RWdqV7aehFDd9KPIlfEPovuYjGCce1ZLQmV2vUh-WDKQdHFgIG0XMnMeURaNYjT9IIeHLGteuR0Xw-k8vLVfYzVa7hVylF9EStX3a4LMWw-SG2J2PJJi8gdbDxv9t6ZcOMcESmOC78Wf04tQ-GdSmlJuXSAjYN12ddQK39WnieEPx.1hh.9eJSWEn.VB7TqKvu2pXHc0IBikMmX8KHHWhrQtbYg1kXZOKFz72HM4I39KOequw0vRhMJlSdtTw4sF0wW0PL0fVADtMrltVjkB1Jp2UVLpS11ZSZHQaJXBnMvWDX5eUC.nYtYfAt65auNfXdCuJBDiD7SIPu2coSOK8AY.0eBgW.-3hos1a29iJ11.U4aBbLW37i1mNyyWz1fv.BHtnaQFDM5E0hMOZfEMQKHOcCb52zaQBGS18huHyRLSYwSGEheI1LLyB6BD81GWAm0EwTh5K6RvCmf0M",
        EP_sessionkey: "0w1mOAzBWfrzoh6.Evk7jUacMuCRmVgKd5QCJTF.4Yxy6KmQrT7V.IITDQQIJnyrAwTMwNCicto5pu3Sv28pBkEuGhl-cL4SGqxpguIJRzj9tDZQUeO.fZV5aQRdZm4Jkbc3NwYX-4kHEB5Q0sSFA3TqooM2P4lYd4sKct0ZKTy5AyX275z8zcRPqkxNhlVRL8pdoH740",
        mgr_txtype: "",
        mgr_subtype: "",
        org_cno: "",
        mgr_amt: "",
        mgr_rem_amt: "",
        mgr_bank_cd: "",
        mgr_account: "",
        mgr_depositor: "",
        REMOTE_ADDR: ""
      }
    });

    ProcessManager.spawnAsync(
      require.resolve("../../../assets/easy-pay-cli/SDCM.EasyPayCLI.exe")
      + " \""
      + jsonData!.replace(/"/g, "\\\"")
      + "\"",
      {
        logger: {
          log: message => {
            console.log(message);
          },
          error: message => {
            console.error("2", message);
          }
        }
      }
    ).then(() => {
      done();
    }).catch(err => {
      done(err);
    });
  });

  it("_easy-pay", done => {
    let hasError = false;
    let callback1: () => void;
    let callback2: () => void;
    SdEasyPayMiddleware(
      {
        url: "http://localhost/_easy-pay",
        method: "POST",
        on: (type: string, callback: () => void) => {
          if (type === "readable") {
            callback1 = callback;
          }
          else {
            callback2 = callback;
          }
        },
        read: () => {
          return querystring.stringify({
            "EP_res_cd": "0000",
            "EP_res_msg": "%EC%A0%95%EC%83%81",
            "EP_mall_id": "T5102001",
            "EP_product_amt": "10000",
            "EP_tr_cd": "00101000",
            "EP_ret_pay_type": "11",
            "EP_ret_complex_yn": "N",
            "EP_card_code": "006",
            "EP_eci_code": "05",
            "EP_card_req_type": "2",
            "EP_card_prefix": "546252",
            "EP_card_no_7": "5462521",
            "EP_save_useyn": "",
            "EP_trace_no": "19092618532910471460",
            "EP_sessionkey": "0w1mOAzBWfrzoh6.Evk7jUacMuCRmVgKd5QCJTF.4Yxy6KmQrT7V.IITDQQIJnyrAwTMwNCicto5pu3Sv28pBkEuGhl-cL4SGqxpguIJRzj9tDZQUeO.fZV5aQRdZm4Jkbc3NwYX-4kHEB5Q0sSFA3TqooM2P4lYd4sKct0ZKTy5AyX275z8zcRPqkxNhlVRL8pdoH740",
            "EP_encrypt_data": "1r7ostyJpV-p9q2Dqfsg3mcPIdWPhymnl7PWM6Gw2iFXCmHB9cu2VPmcCBXrWXx42WqeaL3a2cyLSG6skETY1HHtzLSt19.uEKp-GS9FKjyFxDI39tRlL25AioW4uTszRIMeZFSZQYkM4.cqtEA9z09JbjVh9ZiXIq.1GvzAY2K5KELf-7jYi25y3eN7UaC3QFuaPTu3MCUKdH.ApV3ZlZnM9bxwfPMEJgELUeyMePOObYIfU0wccgJ4WkA11S8JA9r7hUJwqCTF-1Apwcnv25GuhaWqiDhVhQ7rXZg9Yk.tDai.RWdqV7aehFDd9KPIlfEPovuYjGCce1ZLQmV2vUh-WDKQdHFgIG0XMnMeURaNYjT9IIeHLGteuR0Xw-k8vLVfYzVa7hVylF9EStX3a4LMWw-SG2J2PJJi8gdbDxv9t6ZcOMcESmOC78Wf04tQ-GdSmlJuXSAjYN12ddQK39WnieEPx.1hh.9eJSWEn.VB7TqKvu2pXHc0IBikMmX8KHHWhrQtbYg1kXZOKFz72HM4I39KOequw0vRhMJlSdtTw4sF0wW0PL0fVADtMrltVjkB1Jp2UVLpS11ZSZHQaJXBnMvWDX5eUC.nYtYfAt65auNfXdCuJBDiD7SIPu2coSOK8AY.0eBgW.-3hos1a29iJ11.U4aBbLW37i1mNyyWz1fv.BHtnaQFDM5E0hMOZfEMQKHOcCb52zaQBGS18huHyRLSYwSGEheI1LLyB6BD81GWAm0EwTh5K6RvCmf0M",
            "EP_pnt_cp_cd": "",
            "EP_spay_cp": "",
            "EP_card_nick": "",
            "EP_mall_return_url": "",
            "EP_unimile_useyn": "N",
            "EV_req_type": "",
            "EV_card_amt": "",
            "EV_noint": "",
            "EV_cert_type": "",
            "EV_card_no": "",
            "EV_expire_date": "",
            "EV_install_period": "",
            "EV_password": "",
            "EV_auth_value": "",
            "EV_user_type": "",
            "EV_cavv": "",
            "EV_xid": "",
            "EV_eci": "",
            "EV_kvp_cardcode": "",
            "EV_kvp_sessionkey": "",
            "EV_kvp_encdata": "",
            "EV_kvp_pgid": "",
            "EV_kvp_point_flag": "",
            "EV_kvp_point_amt": "",
            "EV_user_mail": "null"
          });
        }
      } as any,
      {
        end: (message: string) => {
          console.log(message);
        }
      } as any,
      err => {
        hasError = true;
        done(err);
      }
    ).then(
      () => {
        if (!hasError) {
          done();
        }
      }
    ).catch(
      err => {
        done(err);
      }
    );

    setTimeout(() => {
      callback1();

      setTimeout(() => {
        callback2();
      }, 200);
    }, 200);
  });

  it("_easy-pay-result", done => {

    let hasError = false;
    let callback1: () => void;
    let callback2: () => void;
    SdEasyPayMiddleware(
      {
        url: "http://localhost/_easy-pay-result",
        method: "POST",
        on: (type: string, callback: () => void) => {
          if (type === "readable") {
            callback1 = callback;
          }
          else {
            callback2 = callback;
          }
        },
        read: () => {
          return querystring.stringify({
            EP_mall_id: "T5102001",
            EP_mall_nm: "테스트몰",
            EP_order_no: "ORDER_20190930171907",
            EP_pay_type: "11",
            EP_currency: "00",
            EP_product_nm: "10,000 포인트",
            EP_product_amt: "10000",
            EP_return_url: "http://localhost:50080/_easy-pay",
            EP_lang_flag: "KOR",
            EP_charset: "UTF-8",
            EP_user_id: "",
            EP_memb_user_no: "",
            EP_user_nm: "",
            EP_user_mail: "",
            EP_user_phone1: "",
            EP_user_phone2: "",
            EP_user_addr: "",
            EP_product_type: "0",
            EP_product_expr: "",
            EP_res_cd: "0000",
            EP_res_msg: "정상",
            EP_tr_cd: "00101000",
            EP_ret_pay_type: "11",
            EP_ret_complex_yn: "N",
            EP_card_code: "006",
            EP_eci_code: "05",
            EP_card_req_type: "2",
            EP_card_prefix: "546252",
            EP_card_no_7: "5462521",
            EP_save_useyn: "",
            EP_trace_no: "19093017194110474986",
            EP_sessionkey:
              "4c.P-rj1GHWdivvy0JXRomrK8PPGdrKQsZi2ODv7a8dwO4NZNQxNlqOFmNa.jEe0DkFu6yyp3GFsbuhe81vVckVyQk3358dADWov1HGxAP-ck-n7z3fXxkOcHqmppKCjFm6XIxLS6XQQPj3xkF7VLddOI6UWmufCxN62s.PkEH9Ty9H5YYafYL6Ut4l7x0N1PCbxxvVO6",
            EP_encrypt_data:
              "31O4s4WkHcJD0WyI0CscHyxjnrVIDmpPMIoXD0rHjM9bMEnNr8IuSRGificmYq3SVTGax-RqiczEaKWvyAuKhRGRHiKfmy4JT0aq3v3Nb9tmhs64LhFCJqd5q7zgfHgNyvw-BSUn3BSUyFmgrDC9Lu6zpzlEPv767.LynPR0AXa9m1Vg6TzXFLr38VhPSb3wY2.sNXNkz8Wfz1oF0g.hhSbnF8BOD4MVCj.UgkH9E3YCZrOF.rn8sT4z2hjUC31fImT-Y9JXpk7TuDnXcqlUZT.8kxPvuCLvDVRQ-bv-YFBTfdbyHqsFjqKLWgGw5Mmb6AcTTgGv4S6qHN5O2nSY2czsiQ9iM8ovPH2xNDk-sIYvp1AEwV5DH5Aw8wyd1YkqetAOLUGj-wDusoi1rr-SMuPytv6BZrfg9ehTn7tfNO7dXn5O7R10m9ej8JiCwert52VKrl09hLANLjhExk1vd4sYEMsU3z9LzhxG4dhBCiBQDzyabdhzhgIFEL8xBbIIoj1dHHzHyD704zklcgWf4Cv4t0d2.kmAmPVLSwqjxUcviOT-mT0fmqc.fJXmB0hjPdNTyN1AlKNTbi4eiR7APltGTFC3-xMi8etMb.CXs.mR7GSaRL.YjesJ8Upgxi76qoGbiDkxBfhjQ3BK76ogvP7NFCx2PAXcqp9G8ZtT2VzkP41608dYbrRK41NAGh5biyBBcS8O2QkHKWhe2Rk6uwQxgIOagMrprxuZr79W1S6CFFqVK3UJ7uaN0hnNDSto-",
            EP_pnt_cp_cd: "",
            EP_spay_cp: "",
            EP_card_nick: "",
            EP_mall_return_url: "",
            EP_unimile_useyn: "N",
            EV_req_type: "",
            EV_card_amt: "",
            EV_noint: "",
            EV_cert_type: "",
            EV_card_no: "",
            EV_expire_date: "",
            EV_install_period: "",
            EV_password: "",
            EV_auth_value: "",
            EV_user_type: "",
            EV_cavv: "",
            EV_xid: "",
            EV_eci: "",
            EV_kvp_cardcode: "",
            EV_kvp_sessionkey: "",
            EV_kvp_encdata: "",
            EV_kvp_pgid: "",
            EV_kvp_point_flag: "",
            EV_kvp_point_amt: "",
            EV_user_mail: "nullnull"
          });
        }
      } as any,
      {
        end: (message: string) => {
          console.log(message);
        }
      } as any,
      err => {
        hasError = true;
        done(err);
      }
    ).then(
      () => {
        if (!hasError) {
          done();
        }
      }
    ).catch(
      err => {
        done(err);
      }
    );

    setTimeout(() => {
      callback1();

      setTimeout(() => {
        callback2();
      }, 200);
    }, 200);
  });
});