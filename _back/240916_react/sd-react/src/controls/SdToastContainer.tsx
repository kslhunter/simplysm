import { component } from "../utils/component";
import { omit } from "../utils/omit";
import { keys } from "@simplysm/ts-transformer-keys";
import styled, { css } from "styled-components";

interface IProps {
  $overlap: boolean;
}

export const SdToastContainer = component<IProps, "div">("SdToastContainer", (props, fwdRef) => {
  return (
    <RootDiv {...omit(props, keys<IProps>())} ref={fwdRef} $overlap={props.$overlap}>
      {props.children}
    </RootDiv>
  );
});

const RootDiv = styled.div<{
  $overlap: boolean;
}>`
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  pointer-events: none;
  padding: var(--gap-xxl);
  z-index: var(--z-index-toast);

  @media all and (max-width: 520px) {
    flex-direction: column-reverse;
  }

  ${(props) =>
    props.$overlap &&
    css`
      display: block;

      > * {
        position: absolute;
        bottom: var(--gap-xxl);
        left: var(--gap-xxl);
        right: var(--gap-xxl);
        width: auto;
      }
    `}
`;
