import styled, { css, keyframes } from "styled-components";
import { component, TFwdRef, TProps } from "../utils/component";
import { omit } from "../utils/omit";
import { keys } from "@simplysm/ts-transformer-keys";

interface IProps {
  $busy?: boolean;
  $type?: "spinner" | "bar" | "cube";
  $noFade?: boolean;
  $message?: string;
  $progressPercent?: number;
}

export const SdBusyContainer = component("SdBusyContainer", (props: TProps<IProps, "div">, fwdRef: TFwdRef<"div">) => {
  return (
    <RootDiv
      {...omit(props, keys<IProps>())}
      ref={fwdRef}
      $busy={props.$busy}
      $type={props.$type}
      $noFade={props.$noFade}
      $message={props.$message}
      $progressPercent={props.$progressPercent}
    >
      {props.$type === "cube" ? (
        <div className={"_cubes"}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      ) : props.$type === "bar" ? (
        <div className={"_bar"}></div>
      ) : (
        <div className={"_spinner"}>
          <div></div>
        </div>
      )}
      {props.$message != null && (
        <div className={"_message"}>
          <pre>{props.$message}</pre>
        </div>
      )}
      {props.$progressPercent != null && (
        <div className={"_progress"}>
          <div className={"_progress-bar"}></div>
        </div>
      )}
      {props.children}
    </RootDiv>
  );
});

const RootDiv = styled.div<{
  $busy: boolean | undefined;
  $type: "spinner" | "bar" | "cube" | undefined;
  $noFade: boolean | undefined;
  $message: string | undefined;
  $progressPercent: number | undefined;
}>`
  ${(props) => css`
    display: block;
    position: relative;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    min-width: 70px;
    min-height: 70px;
    overflow: auto;

    > ._screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: var(--z-index-busy);

      ${props.$busy
        ? css`
          visibility: visible;
          pointer-events: auto;
          opacity: 1;
          backdrop-filter: ${props.$noFade ? "none" : "blur(10px)"};
        `
        : css`
          visibility: hidden;
          pointer-events: none;
          opacity: 0;
          backdrop-filter: none;
        `}

      transition: opacity 0.3s,
      backdrop-filter 5s;
      transition-timing-function: linear;

      ${(!props.$type || props.$type === "spinner") &&
      css`
        > ._spinner {
          transform: ${props.$busy ? "none" : "translateY(-100%)"};
          transition: 0.1s ${props.$busy ? "ease-out" : "ease-in"};
          transition-property: transform;

          > div {
            top: 0;
            width: 30px;
            height: 30px;
            margin: 20px auto 0 auto;
            border: 6px solid white;
            border-radius: 100%;
            border-bottom-color: var(--theme-primary-default);
            animation: ${kfSpin} 1s linear infinite;
          }
        }
      `}

      ${props.$type === "bar" &&
      css`
        > ._bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 2px;
          width: 100%;
          background-color: white;

          &:before,
          &:after {
            position: absolute;
            top: 0;
            left: 0;
            display: inline-block;
            content: "";
            height: 2px;
            width: 100%;

            transform-origin: left;
          }

          &:before {
            background-color: var(--theme-primary-default);
            animation: ${kfBarIndicatorBefore} 2s infinite ease-in;
          }

          &:after {
            background-color: white;
            animation: ${kfBarIndicatorAfter} 2s infinite ease-out;
          }
        }
      `}

      ${props.$type === "cube" &&
      css`
        > ._cubes {
          position: absolute;
          top: calc(50% - 20px);
          left: calc(50% - 20px);
          width: 40px;
          height: 40px;
          transform: rotateZ(45deg);

          > div {
            float: left;
            width: 50%;
            height: 50%;
            position: relative;

            &:before {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: var(--trans-light);
              animation: ${kfCube} 2.4s infinite linear both;
              transform-origin: 100% 100%;
            }
          }

          > div:nth-child(2) {
            transform: rotateZ(90deg);

            &:before {
              animation-delay: 0.3s;
            }
          }

          > div:nth-child(3) {
            transform: rotateZ(180deg);

            &:before {
              animation-delay: 0.6s;
            }
          }

          > div:nth-child(4) {
            transform: rotateZ(270deg);

            &:before {
              animation-delay: 0.9s;
            }
          }
        }
      `}

      ${props.$progressPercent != null &&
      css`
        > ._progress {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          height: 2px;
          width: 100%;
          background-color: white;

          > ._progress-bar {
            position: absolute;
            top: 0;
            left: 0;
            display: inline-block;
            content: "";
            height: 2px;
            width: 100%;
            transition: 0.1s ease-in;
            transition-property: transform;
            transform-origin: left;
            transform: scaleX(0);
            background-color: var(--theme-primary-default);
          }
        }
      `}
    }
  `}
`;

const kfSpin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const kfBarIndicatorBefore = keyframes`
  0% {
    transform: scaleX(0);
  }
  60%,
  100% {
    transform: scaleX(1);
  }
`;

const kfBarIndicatorAfter = keyframes`
  0%,
  50% {
    transform: scaleX(0);
  }
  100% {
    transform: scaleX(1);
  }
`;

const kfCube = keyframes`
  0%,
  10% {
    transform: perspective(140px) rotateX(-180deg);
    opacity: 0;
  }
  25%,
  75% {
    transform: perspective(140px) rotateX(0deg);
    opacity: 1;
  }
  90%,
  100% {
    transform: perspective(140px) rotateY(180deg);
    opacity: 0;
  }
`;
