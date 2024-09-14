import { ReactNode } from "react";
import styled, { css } from "styled-components";
import { styleProps, TStyleProps } from "../utils/styleProps";
import { mixins } from "../style/mixins";

interface IProps {
  type?: "button" | "submit";
  theme?:
    | "primary"
    | "secondary"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "grey"
    | "blue-grey"
    | "link"
    | "link-primary"
    | "link-secondary"
    | "link-info"
    | "link-success"
    | "link-warning"
    | "link-danger"
    | "link-grey"
    | "link-blue-grey";
  inline?: boolean;
  inset?: boolean;
  size?: "sm" | "lg";
  disabled?: boolean;

  onClick?: () => void;

  children?: ReactNode;
}

export default function SdButton(props: IProps) {
  return <Root {...styleProps(props)} onClick={props.onClick}>{props.children}</Root>;
}

const Root = styled.button<TStyleProps<Omit<IProps, "children" | "onClick">>>`
  ${(props) => [
    css`
      font-family: var(--font-family);

      display: block;
      width: 100%;
      padding: var(--gap-sm) var(--gap-lg);
      background: white;

      font-size: var(--font-size-default);
      line-height: var(--line-height);

      border-radius: ${props.$inset ? 0 : "var(--border-radius-default)"};
      border: ${props.$inset ? "none" : "1px solid var(--border-color-default)"};
      color: var(--text-trans-default);

      user-select: none;

      font-weight: bold;
      text-align: center;
      cursor: pointer;

      transition: background 0.1s linear;

      &:hover {
        background: var(--theme-grey-lightest);
        ${props.$inset &&
        css`
          color: var(--theme-primary-darker);
        `}
      }

      ${mixins.activeEffect(true)}
      &:disabled {
        background: white;
        border-color: var(--theme-grey-lighter);
        color: var(--text-trans-lighter);
        cursor: default;

        ${mixins.activeEffect(false)}
      },

      ${props.$theme &&
      !props.$theme.startsWith("link") &&
      css`
        background: var(--theme-${props.$theme}-default);
        border-color: var(--theme-${props.$theme}-default);
        color: var(--text-trans-rev-default);

        &:hover {
          background: var(--theme-${props.$theme}-dark);
          border-color: var(--theme-${props.$theme}-dark);
          color: var(--text-trans-rev-default);
        }

        &:disabled {
          background: var(--theme-grey-lighter);
          border-color: var(--theme-grey-lighter);
          color: var(--text-trans-lighter);
          cursor: default;
        }
      `}

      ${props.$theme === "link" &&
      css`
        border-color: transparent;
        color: var(--theme-primary-default);

        &:hover {
          color: var(--theme-primary-darker);
        }

        &:disabled {
          border-color: transparent;
          color: var(--text-trans-lighter);
        }
      `}

    ${props.$theme &&
      props.$theme.startsWith("link") &&
      css`
        border-color: transparent;
        color: var(--theme-${props.$theme.substring(5)}-default);

        &:hover {
          color: var(--theme-${props.$theme.substring(5)}-darker);
        }

        &:disabled {
          border-color: transparent;
          color: var(--text-trans-lighter);
        }
      `}

    ${props.$inline &&
      css`
        display: inline-block;
        width: auto;
        vertical-align: top;
      `}

    ${props.$size === "sm" &&
      css`
        padding: var(--gap-xs) var(--gap-default);
      `}

    ${props.$size === "lg" &&
      css`
        padding: var(--gap-default) var(--gap-xl);
      `}

    ${props.$disabled &&
      css`
        pointer-events: none;
      `}
    `,
  ]}
`;
