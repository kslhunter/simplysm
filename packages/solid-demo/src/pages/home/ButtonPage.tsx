import { Button, Topbar, TopbarContainer } from "@simplysm/solid";
import { demoTable } from "./ButtonPage.css";
import { atoms } from "@simplysm/solid/styles";

export default function ButtonPage() {
  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>Button</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
      <h2>Button Demo</h2>

      <section>
        <h3>Default</h3>
        <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
          <Button>Default</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section>
        <h3>Theme</h3>
        <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
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
        <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
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
        <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra Large</Button>
        </div>
      </section>

      <section>
        <h3>Size + Theme</h3>
        <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
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
        <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
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
      </div>
    </TopbarContainer>
  );
}
