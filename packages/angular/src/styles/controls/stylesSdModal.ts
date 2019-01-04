import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdModal = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-modal {
    display: block;
    position: absolute;
    z-index: ${vars.zIndex.modal};
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    text-align: center;
    padding-top: 25px;
    overflow: auto;

    > ._backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, .6);
    }

    > ._dialog {
      position: relative;
      display: inline-block;
      text-align: left;
      margin: 0 auto;
      //background: get($theme-color, bluegrey, darkest);
      background: white;
      overflow: hidden;
      max-width: 100%;
      min-width: 240px;
      /*max-height: calc(100% - 50px);*/
      //border: 1px solid get($trans-color, default);
      ${vars.elevation(16)};

      &:focus {
        outline-color: transparent;
      }

      > sd-dock-container {
        > ._header {
          background: ${vars.topbarTheme};
          color: white;
          /*border-bottom: 1px solid get($trans-color, default);*/

          > ._title {
            display: inline-block;
            padding: ${vars.gap.default} ${vars.gap.lg};
          }

          > ._close-button {
            float: right;
            cursor: pointer;
            text-align: center;
            padding: ${vars.gap.default} ${vars.gap.lg};
            color: ${vars.topbarLinkColor};

            &:hover {
              background: rgba(0, 0, 0, .1);
              color: ${vars.topbarLinkHoverColor};
            }

            &:active {
              background: rgba(0, 0, 0, .2);
            }
          }
        }
      }
    }

    opacity: 0;
    transition: opacity .3s ease-in-out;
    pointer-events: none;

    > ._dialog {
      transform: translateY(-25px);
      transition: transform .3s ease-in-out;
    }

    &[sd-open=true] {
      opacity: 1;
      pointer-events: auto;

      > ._dialog {
        transform: none;
      }
    }

    @media ${vars.media.mobile} {
      padding-top: 0;

      > ._dialog {
        width: 100%;
        height: 100%;
        /*max-height: 100%;*/
      }
    }
  }`;
