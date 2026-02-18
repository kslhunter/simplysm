import { createSignal } from "solid-js";
import { Checkbox, Topbar, TopbarContainer } from "@simplysm/solid";
import { demoTable } from "./CheckboxPage.css";
import { atoms } from "@simplysm/solid/styles";

export default function CheckboxPage() {
  const [checked, setChecked] = createSignal(false);
  const [indeterminateChecked, setIndeterminateChecked] = createSignal(true);
  const [isIndeterminate, setIsIndeterminate] = createSignal(true);

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>Checkbox</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
        <h2>Checkbox Demo</h2>

        <section>
          <h3>Default</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox checked={checked()} onChange={setChecked}>
              Default ({checked() ? "checked" : "unchecked"})
            </Checkbox>
            <Checkbox disabled>Disabled</Checkbox>
            <Checkbox checked disabled>
              Checked Disabled
            </Checkbox>
          </div>
        </section>

        <section>
          <h3>Indeterminate</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox
              indeterminate={isIndeterminate()}
              checked={indeterminateChecked()}
              onChange={(v) => {
                setIndeterminateChecked(v);
                setIsIndeterminate(false);
              }}
            >
              {isIndeterminate()
                ? "Indeterminate"
                : indeterminateChecked()
                  ? "Checked"
                  : "Unchecked"}
            </Checkbox>
            <button onClick={() => setIsIndeterminate(true)}>Reset to Indeterminate</button>
          </div>
        </section>

        <section>
          <h3>Theme</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox checked theme="primary">
              Primary
            </Checkbox>
            <Checkbox checked theme="secondary">
              Secondary
            </Checkbox>
            <Checkbox checked theme="success">
              Success
            </Checkbox>
            <Checkbox checked theme="warning">
              Warning
            </Checkbox>
            <Checkbox checked theme="danger">
              Danger
            </Checkbox>
            <Checkbox checked theme="info">
              Info
            </Checkbox>
            <Checkbox checked theme="gray">
              Gray
            </Checkbox>
            <Checkbox checked theme="slate">
              Slate
            </Checkbox>
          </div>
        </section>

        <section>
          <h3>Size</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox checked size="xs">
              Extra Small
            </Checkbox>
            <Checkbox checked size="sm">
              Small
            </Checkbox>
            <Checkbox checked>Default</Checkbox>
            <Checkbox checked size="lg">
              Large
            </Checkbox>
            <Checkbox checked size="xl">
              Extra Large
            </Checkbox>
          </div>
        </section>

        <section>
          <h3>Size + Theme</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox checked theme="primary" size="xs">
              XS Primary
            </Checkbox>
            <Checkbox checked theme="success" size="sm">
              SM Success
            </Checkbox>
            <Checkbox checked theme="danger">
              Default Danger
            </Checkbox>
            <Checkbox checked theme="info" size="lg">
              LG Info
            </Checkbox>
            <Checkbox checked theme="warning" size="xl">
              XL Warning
            </Checkbox>
          </div>
        </section>

        <section>
          <h3>Theme + Disabled</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox checked theme="primary" disabled>
              Primary
            </Checkbox>
            <Checkbox checked theme="secondary" disabled>
              Secondary
            </Checkbox>
            <Checkbox checked theme="success" disabled>
              Success
            </Checkbox>
            <Checkbox checked theme="warning" disabled>
              Warning
            </Checkbox>
            <Checkbox checked theme="danger" disabled>
              Danger
            </Checkbox>
            <Checkbox checked theme="info" disabled>
              Info
            </Checkbox>
            <Checkbox checked theme="gray" disabled>
              Gray
            </Checkbox>
            <Checkbox checked theme="slate" disabled>
              Slate
            </Checkbox>
          </div>
        </section>

        <section>
          <h3>Inline Variant (in Text)</h3>
          <p>
            이 문장에서{" "}
            <Checkbox inline checked>
              동의함
            </Checkbox>{" "}
            체크박스가 텍스트와 함께 자연스럽게 표시됩니다.
          </p>
          <p>
            여러 옵션을 선택할 수 있습니다: <Checkbox inline>옵션A</Checkbox>{" "}
            <Checkbox inline checked>
              옵션B
            </Checkbox>{" "}
            <Checkbox inline>옵션C</Checkbox>
          </p>
        </section>

        <section>
          <h3>Inset Variant (in Table)</h3>
          <table class={demoTable}>
            <tbody>
              <tr>
                <td>
                  <Checkbox inset>Inset</Checkbox>
                </td>
                <td class={atoms({ p: "sm" })}>-</td>
                <td>
                  <Checkbox checked theme="primary" inset>
                    Primary Inset
                  </Checkbox>
                </td>
                <td class={atoms({ p: "sm" })}>-</td>
                <td>
                  <Checkbox checked theme="success" inset>
                    Success Inset
                  </Checkbox>
                </td>
                <td class={atoms({ p: "sm" })}>-</td>
                <td>
                  <Checkbox checked theme="danger" inset>
                    Danger Inset
                  </Checkbox>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </TopbarContainer>
  );
}
