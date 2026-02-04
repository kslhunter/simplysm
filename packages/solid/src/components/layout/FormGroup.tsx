import { type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface FormGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inline?: boolean;
}

export interface FormGroupItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label?: JSX.Element;
}

const baseClass = clsx("flex", "flex-col", "gap-4");
const inlineClass = clsx("inline-flex", "flex-row", "flex-wrap", "gap-2", "items-center");

const FormGroupItem: ParentComponent<FormGroupItemProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "label"]);

  return (
    <div class={local.class} data-form-group-item {...rest}>
      <Show when={local.label}>
        <label class="mb-1 block font-bold">{local.label}</label>
      </Show>
      {local.children}
    </div>
  );
};

interface FormGroupComponent extends ParentComponent<FormGroupProps> {
  Item: typeof FormGroupItem;
}

const FormGroupBase: ParentComponent<FormGroupProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inline"]);

  const getClassName = () => twMerge(local.inline ? inlineClass : baseClass, local.class);

  return (
    <div class={getClassName()} {...rest}>
      {local.children}
    </div>
  );
};

export const FormGroup = FormGroupBase as FormGroupComponent;
FormGroup.Item = FormGroupItem;
