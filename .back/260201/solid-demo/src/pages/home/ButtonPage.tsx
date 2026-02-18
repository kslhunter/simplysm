import { createSignal } from "solid-js";
import { Button, Topbar, TopbarContainer } from "@simplysm/solid";
import { demoTable } from "./ButtonPage.css";
import { anchor, atoms } from "@simplysm/solid/styles";

export default function ButtonPage() {
  const [clickCount, setClickCount] = createSignal(0);

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>Button</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
        <h2>Button Demo</h2>

        <section>
          <h3>Interactive (onClick)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Button theme="primary" onClick={() => setClickCount((c) => c + 1)}>
              클릭하세요
            </Button>
            <span>클릭 횟수: {clickCount()}</span>
            <Button theme="secondary" onClick={() => setClickCount(0)}>
              초기화
            </Button>
          </div>
        </section>

        <section>
          <h3>Default</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Button>Default</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <section>
          <h3>Theme</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Button theme="primary">Primary</Button>
            <Button theme="secondary">Secondary</Button>
            <Button theme="success">Success</Button>
            <Button theme="warning">Warning</Button>
            <Button theme="danger">Danger</Button>
            <Button theme="info">Info</Button>
            <Button theme="gray">Gray</Button>
            <Button theme="slate">Slate</Button>
          </div>
        </section>

        <section>
          <h3>Link Theme</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Button theme="primary" link>
              Primary
            </Button>
            <Button theme="secondary" link>
              Secondary
            </Button>
            <Button theme="success" link>
              Success
            </Button>
            <Button theme="warning" link>
              Warning
            </Button>
            <Button theme="danger" link>
              Danger
            </Button>
            <Button theme="info" link>
              Info
            </Button>
            <Button theme="gray" link>
              Gray
            </Button>
            <Button theme="slate" link>
              Slate
            </Button>
          </div>
        </section>

        <section>
          <h3>Size</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </div>
        </section>

        <section>
          <h3>Size + Theme</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Button theme="primary" size="xs">
              XS Primary
            </Button>
            <Button theme="success" size="sm">
              SM Success
            </Button>
            <Button theme="danger">Default Danger</Button>
            <Button theme="info" size="lg">
              LG Info
            </Button>
            <Button theme="warning" size="xl">
              XL Warning
            </Button>
          </div>
        </section>

        <section>
          <h3>Theme + Disabled</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Button theme="primary" disabled>
              Primary
            </Button>
            <Button theme="secondary" disabled>
              Secondary
            </Button>
            <Button theme="success" disabled>
              Success
            </Button>
            <Button theme="warning" disabled>
              Warning
            </Button>
            <Button theme="danger" disabled>
              Danger
            </Button>
            <Button theme="info" disabled>
              Info
            </Button>
            <Button theme="gray" disabled>
              Gray
            </Button>
            <Button theme="slate" disabled>
              Slate
            </Button>
          </div>
        </section>

        <section>
          <h3>Inset Variant (in Table)</h3>
          <table class={demoTable}>
            <tbody>
              <tr>
                <td>
                  <Button inset>Inset Button</Button>
                </td>
                <td class={atoms({ p: "sm" })}>-</td>
                <td>
                  <Button theme="primary" inset>
                    Primary Inset
                  </Button>
                </td>
                <td class={atoms({ p: "sm" })}>-</td>
                <td>
                  <Button theme="success" inset>
                    Success Inset
                  </Button>
                </td>
                <td class={atoms({ p: "sm" })}>-</td>
                <td>
                  <Button theme="danger" inset>
                    Danger Inset
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ========== Anchor Style ========== */}
        <h2>Anchor Style</h2>

        <section>
          <h3>기본 사용법</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <a href="https://example.com" class={anchor()} target="_blank" rel="noreferrer">
              외부 링크
            </a>
            <span class={anchor()} onClick={() => alert("클릭됨!")} style={{ cursor: "pointer" }}>
              클릭 가능한 텍스트
            </span>
          </div>
        </section>

        <section>
          <h3>Themes</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <a href="#" class={anchor({ theme: "primary" })} onClick={(e) => e.preventDefault()}>
              Primary
            </a>
            <a href="#" class={anchor({ theme: "secondary" })} onClick={(e) => e.preventDefault()}>
              Secondary
            </a>
            <a href="#" class={anchor({ theme: "success" })} onClick={(e) => e.preventDefault()}>
              Success
            </a>
            <a href="#" class={anchor({ theme: "warning" })} onClick={(e) => e.preventDefault()}>
              Warning
            </a>
            <a href="#" class={anchor({ theme: "danger" })} onClick={(e) => e.preventDefault()}>
              Danger
            </a>
            <a href="#" class={anchor({ theme: "info" })} onClick={(e) => e.preventDefault()}>
              Info
            </a>
            <a href="#" class={anchor({ theme: "gray" })} onClick={(e) => e.preventDefault()}>
              Gray
            </a>
            <a href="#" class={anchor({ theme: "slate" })} onClick={(e) => e.preventDefault()}>
              Slate
            </a>
          </div>
        </section>

        <section>
          <h3>Disabled 상태</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <span class={anchor()} data-disabled="true">
              비활성 링크 (primary)
            </span>
            <span class={anchor({ theme: "danger" })} data-disabled="true">
              비활성 링크 (danger)
            </span>
          </div>
        </section>

        <section>
          <h3>텍스트 내 사용</h3>
          <p>
            일반 텍스트 사이에{" "}
            <a href="https://example.com" class={anchor()} target="_blank" rel="noreferrer">
              링크 스타일
            </a>
            을 적용하면 자연스럽게 인라인으로 표시됩니다.
          </p>
        </section>
      </div>
    </TopbarContainer>
  );
}
