import {
  type JSX,
  type ParentComponent,
  Show,
  splitProps,
  createContext,
  useContext,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface FormGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inline?: boolean;
}

export interface FormGroupItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label?: JSX.Element;
}

const FormGroupContext = createContext<{ inline: boolean }>({ inline: false });

const FormGroupItem: ParentComponent<FormGroupItemProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "label"]);
  const ctx = useContext(FormGroupContext);

  const getClassName = () => twMerge(ctx.inline ? "flex flex-row items-center" : undefined, local.class);

  return (
    <div class={getClassName()} data-form-group-item {...rest}>
      <Show when={local.label}>
        <label
          class={ctx.inline ? clsx("whitespace-nowrap font-bold", "pr-2") : "mb-1 block font-bold"}
        >
          {local.label}
        </label>
      </Show>
      {local.children}
    </div>
  );
};

const FormGroupBase: ParentComponent<FormGroupProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inline"]);

  const getClassName = () => twMerge(
    local.inline ? "inline-flex flex-row flex-wrap items-center gap-x-2 gap-y-1" : "inline-flex flex-col gap-2",
    local.class,
  );

  return (
    <FormGroupContext.Provider
      value={{
        get inline() {
          return local.inline ?? false;
        },
      }}
    >
      <div data-form-group class={getClassName()} {...rest}>
        {local.children}
      </div>
    </FormGroupContext.Provider>
  );
};

//#region Export
export const FormGroup = Object.assign(FormGroupBase, {
  Item: FormGroupItem,
});
//#endregion
