import { createSignal } from "solid-js";
import { Radio, Topbar, TopbarContainer } from "@simplysm/solid";
import { demoTable } from "./RadioPage.css";
import { atoms } from "@simplysm/solid/styles";

export default function RadioPage() {
  const [selected, setSelected] = createSignal<string | null>(null);
  const [selectedTheme, setSelectedTheme] = createSignal<string | null>(null);
  const [selectedSize, setSelectedSize] = createSignal<string | null>(null);

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>Radio</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
        <h2>Radio Demo</h2>

        <section>
          <h3>Default</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Radio checked={selected() === "a"} onChange={() => setSelected("a")}>
              Option A
            </Radio>
            <Radio checked={selected() === "b"} onChange={() => setSelected("b")}>
              Option B
            </Radio>
            <Radio checked={selected() === "c"} onChange={() => setSelected("c")}>
              Option C
            </Radio>
            <Radio disabled>Disabled</Radio>
            <Radio checked disabled>
              Checked Disabled
            </Radio>
          </div>
          <p class={atoms({ mt: "sm", color: "muted" })}>Selected: {selected() ?? "none"}</p>
        </section>

        <section>
          <h3>Theme</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Radio
              checked={selectedTheme() === "primary"}
              onChange={() => setSelectedTheme("primary")}
              theme="primary"
            >
              Primary
            </Radio>
            <Radio
              checked={selectedTheme() === "secondary"}
              onChange={() => setSelectedTheme("secondary")}
              theme="secondary"
            >
              Secondary
            </Radio>
            <Radio
              checked={selectedTheme() === "success"}
              onChange={() => setSelectedTheme("success")}
              theme="success"
            >
              Success
            </Radio>
            <Radio
              checked={selectedTheme() === "warning"}
              onChange={() => setSelectedTheme("warning")}
              theme="warning"
            >
              Warning
            </Radio>
            <Radio
              checked={selectedTheme() === "danger"}
              onChange={() => setSelectedTheme("danger")}
              theme="danger"
            >
              Danger
            </Radio>
            <Radio
              checked={selectedTheme() === "info"}
              onChange={() => setSelectedTheme("info")}
              theme="info"
            >
              Info
            </Radio>
            <Radio
              checked={selectedTheme() === "gray"}
              onChange={() => setSelectedTheme("gray")}
              theme="gray"
            >
              Gray
            </Radio>
            <Radio
              checked={selectedTheme() === "slate"}
              onChange={() => setSelectedTheme("slate")}
              theme="slate"
            >
              Slate
            </Radio>
          </div>
        </section>

        <section>
          <h3>Size</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Radio
              checked={selectedSize() === "xs"}
              onChange={() => setSelectedSize("xs")}
              size="xs"
            >
              Extra Small
            </Radio>
            <Radio
              checked={selectedSize() === "sm"}
              onChange={() => setSelectedSize("sm")}
              size="sm"
            >
              Small
            </Radio>
            <Radio
              checked={selectedSize() === "default"}
              onChange={() => setSelectedSize("default")}
            >
              Default
            </Radio>
            <Radio
              checked={selectedSize() === "lg"}
              onChange={() => setSelectedSize("lg")}
              size="lg"
            >
              Large
            </Radio>
            <Radio
              checked={selectedSize() === "xl"}
              onChange={() => setSelectedSize("xl")}
              size="xl"
            >
              Extra Large
            </Radio>
          </div>
        </section>

        <section>
          <h3>Size + Theme</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Radio checked theme="primary" size="xs">
              XS Primary
            </Radio>
            <Radio checked theme="success" size="sm">
              SM Success
            </Radio>
            <Radio checked theme="danger">
              Default Danger
            </Radio>
            <Radio checked theme="info" size="lg">
              LG Info
            </Radio>
            <Radio checked theme="warning" size="xl">
              XL Warning
            </Radio>
          </div>
        </section>

        <section>
          <h3>Theme + Disabled</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Radio checked theme="primary" disabled>
              Primary
            </Radio>
            <Radio checked theme="secondary" disabled>
              Secondary
            </Radio>
            <Radio checked theme="success" disabled>
              Success
            </Radio>
            <Radio checked theme="warning" disabled>
              Warning
            </Radio>
            <Radio checked theme="danger" disabled>
              Danger
            </Radio>
            <Radio checked theme="info" disabled>
              Info
            </Radio>
            <Radio checked theme="gray" disabled>
              Gray
            </Radio>
            <Radio checked theme="slate" disabled>
              Slate
            </Radio>
          </div>
        </section>

        <section>
          <h3>Inline Variant (in Text)</h3>
          <p>
            성별을 선택하세요:{" "}
            <Radio inline checked>
              남성
            </Radio>{" "}
            <Radio inline>여성</Radio>
          </p>
          <p>
            배송 방법: <Radio inline>일반배송</Radio>{" "}
            <Radio inline checked>
              빠른배송
            </Radio>{" "}
            <Radio inline>직접수령</Radio>
          </p>
        </section>

        <section>
          <h3>Inset Variant (in Table)</h3>
          <table class={demoTable}>
            <tbody>
              <tr>
                <td>
                  <Radio inset>Inset</Radio>
                </td>
                <td class={atoms({ p: "sm" })}>-</td>
                <td>
                  <Radio checked theme="primary" inset>
                    Primary Inset
                  </Radio>
                </td>
                <td class={atoms({ p: "sm" })}>-</td>
                <td>
                  <Radio checked theme="success" inset>
                    Success Inset
                  </Radio>
                </td>
                <td class={atoms({ p: "sm" })}>-</td>
                <td>
                  <Radio checked theme="danger" inset>
                    Danger Inset
                  </Radio>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </TopbarContainer>
  );
}
