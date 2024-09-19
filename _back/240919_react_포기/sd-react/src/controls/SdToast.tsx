import { component, TFwdRef, TProps } from "../utils/component";
import styled, { css, keyframes } from "styled-components";
import { omit } from "../utils/omit";
import { keys } from "@simplysm/ts-transformer-keys";
import { mixins } from "../style/mixins";
import { variables } from "../style/variables";

export type TSdToastTheme = "info" | "success" | "warning" | "danger";

interface IProps {
  $progress?: number;
  $theme?: TSdToastTheme;
  $closing?: boolean;
}

export const SdToast = component("SdToast", (props: TProps<IProps, "div">, fwdRef: TFwdRef<"div">) => {
  return (
    <RootDiv
      {...omit(props, keys<IProps>())}
      ref={fwdRef}
      $progress={props.$progress}
      $theme={props.$theme ?? "info"}
      $closing={props.$closing ?? false}
    >
      <div className={"_sd-toast-block"}>
        <div className={"_sd-toast-message"}>{props.children}</div>
        {props.$progress != null && (
          <div className={"_sd-toast-progress"}>
            <div className={"_sd-toast-progress-bar"}></div>
          </div>
        )}
      </div>
    </RootDiv>
  );
});

const RootDiv = styled.div<{
  $progress: number | undefined;
  $theme: TSdToastTheme;
  $closing: boolean;
}>`
  ${props => css`
    display: block;
    margin-bottom: var(--gap-sm);
    text-align: center;
    width: 100%;
    pointer-events: none;

    > ._sd-toast-block {
      display: inline-block;
      text-align: left;
      color: white;
      border-radius: var(--border-radius-lg);
      ${mixins.elevation(12)}
      pointer-events: auto;

      transform: none;
      opacity: 1;
      animation: ${kfOpen(false)} 0.1s ease-out;

      ${props.$closing && css`
        transform: translateY(-100%);
        transition: 0.1s ease-in;
        transition-property: transform, opacity;
        opacity: 0;
      `};

      > ._sd-toast-message {
        padding: var(--gap-default) var(--gap-lg);
      }

      ${props.$progress != null && css`
        > ._sd-toast-progress {
          background: var(--theme-grey-default);
          height: 4px;
          border-radius: var(--border-radius-xl);
          margin: 0 4px 4px 4px;

          > ._sd-toast-progress-bar {
            border-radius: var(--border-radius-xl);
            height: 4px;
            transition: width 1s ease-out;
            width: ${props.$progress}%;
          }
        }`
      }
    }

    ${Object.keys(variables.theme).map(
      (key) => css`
        > ._sd-toast-block {
          background: var(--theme-${key}-default);

          > ._sd-toast-progress {
            background: var(--theme-${key}-darker);

            > ._sd-toast-progress-bar {
              background: var(--theme-${key}-lighter);
            }
          }
        }
      `
    )};

    @media (max-width: 520px) {
      ${kfOpen(true)}
      > ._sd-toast-block {
        border-radius: calc(var(--line-height) / 2);

        > ._sd-toast-message {
          padding: var(--gap-xs) var(--gap-default);
        }
      }
    }
  `}
`;

const kfOpen = (bottom: boolean) => keyframes`
  from {
    transform: translateY(${bottom ? "100%" : "-100%"});
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
`;
