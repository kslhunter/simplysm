import { css } from "styled-components";

export const mixins = {
  formControlBase: () => css`
    display: block;
    width: 100%;
    padding: var(--gap-sm) var(--gap-default);
    border: 1px solid transparent;

    font-size: var(--font-size-default);
    font-family: var(--font-family);
    line-height: var(--line-height);

    color: var(--text-trans-default);
  `,

  help: () => css`
    text-decoration-line: underline;
    text-decoration-style: dotted;
    cursor: help;
  `,

  activeEffect: (use: boolean) =>
    !use
      ? css`
          &:after {
            display: none;
          }
        `
      : css`
          position: relative;
          overflow: hidden;
          vertical-align: top;

          &:after {
            content: "";
            display: block;
            position: absolute;
            width: 120%;
            height: 300%;
            border-radius: 100%;
            left: -10%;
            top: -100%;
            background: transparent;
            transition-property: transform, opacity;
            transition-duration: 0.3s;
            transition-timing-function: ease-out;
            transform: scaleX(0.3);
            opacity: 0;

            pointer-events: none;
          }

          &:active {
            &:after {
              background: var(--trans-light);
              transform: none;
              opacity: 1;
            }
          }
        `,
};
