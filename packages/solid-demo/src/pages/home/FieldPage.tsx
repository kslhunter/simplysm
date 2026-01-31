import { createSignal } from "solid-js";
import {
  TextField,
  NumberField,
  DateField,
  TimeField,
  DateTimeField,
  ColorField,
  Topbar,
  TopbarContainer,
  invalid,
} from "@simplysm/solid";
import { atoms } from "@simplysm/solid/styles";
import { DateOnly, Time, DateTime } from "@simplysm/core-common";
import { demoTable } from "./FieldPage.css";

// TypeScript directive 등록을 위한 false 참조
void invalid;

export default function FieldPage() {
  // Controlled 예시용 signals
  const [textValue, setTextValue] = createSignal<string | undefined>(undefined);
  const [numValue, setNumValue] = createSignal<number | undefined>(undefined);
  const [dateValue, setDateValue] = createSignal<DateOnly | undefined>(undefined);
  const [timeValue, setTimeValue] = createSignal<Time | undefined>(undefined);
  const [dtValue, setDtValue] = createSignal<DateTime | undefined>(undefined);
  const [colorValue, setColorValue] = createSignal<string | undefined>("#ff0000");

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>Field</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
        {/* ========== TextField ========== */}
        <h2>TextField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TextField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TextField value={textValue()} onChange={setTextValue} placeholder="입력하세요" />
            <span>현재 값: {textValue() ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>Type</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TextField type="text" placeholder="text" />
            <TextField type="password" placeholder="password" />
            <TextField type="email" placeholder="email" />
          </div>
        </section>

        <section>
          <h3>Format</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TextField format="000-0000-0000" placeholder="전화번호" />
          </div>
        </section>

        <section>
          <h3>Size</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TextField size="sm" placeholder="sm" />
            <TextField placeholder="default" />
            <TextField size="lg" placeholder="lg" />
          </div>
        </section>

        <section>
          <h3>Inset (in Table)</h3>
          <table class={demoTable}>
            <tbody>
              <tr>
                <td class={atoms({ p: "sm" })}>이름</td>
                <td>
                  <TextField inset placeholder="이름 입력" />
                </td>
              </tr>
              <tr>
                <td class={atoms({ p: "sm" })}>이메일</td>
                <td>
                  <TextField inset type="email" placeholder="이메일 입력" />
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>Inline</h3>
          <div>
            <span>인라인 필드: </span>
            <TextField inline placeholder="inline" />
            <span> 텍스트와 함께</span>
          </div>
        </section>

        <section>
          <h3>Disabled / ReadOnly</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TextField disabled placeholder="Disabled 상태" />
            <TextField readOnly placeholder="ReadOnly 상태" />
          </div>
        </section>

        <section>
          <h3>Placeholder</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TextField placeholder="플레이스홀더 텍스트" />
          </div>
        </section>

        <section>
          <h3>Invalid</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <div use:invalid={() => "에러 메시지"}>
              <TextField placeholder="에러 상태" />
            </div>
          </div>
        </section>

        {/* ========== NumberField ========== */}
        <h2>NumberField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <NumberField placeholder="숫자 입력" />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <NumberField value={numValue()} onChange={setNumValue} placeholder="숫자 입력" />
            <span>현재 값: {numValue() ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>useNumberComma</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <NumberField useNumberComma placeholder="1234567 → 1,234,567" />
          </div>
        </section>

        <section>
          <h3>minDigits</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <NumberField minDigits={5} placeholder="123 → 00123" />
          </div>
        </section>

        {/* ========== DateField ========== */}
        <h2>DateField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <DateField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <DateField value={dateValue()} onChange={setDateValue} />
            <span>현재 값: {dateValue()?.toFormatString("yyyy-MM-dd") ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>Type</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <DateField type="date" />
            <DateField type="month" />
            <DateField type="year" />
          </div>
        </section>

        <section>
          <h3>Min / Max</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <DateField min={new DateOnly(2024, 1, 1)} max={new DateOnly(2026, 12, 31)} />
          </div>
        </section>

        {/* ========== TimeField ========== */}
        <h2>TimeField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TimeField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TimeField value={timeValue()} onChange={setTimeValue} />
            <span>현재 값: {timeValue()?.toFormatString("HH:mm") ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>Type</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TimeField type="time" />
            <TimeField type="time-sec" />
          </div>
        </section>

        <section>
          <h3>Min / Max</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <TimeField min={new Time(9, 0, 0)} max={new Time(18, 0, 0)} />
          </div>
        </section>

        {/* ========== DateTimeField ========== */}
        <h2>DateTimeField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <DateTimeField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <DateTimeField value={dtValue()} onChange={setDtValue} />
            <span>현재 값: {dtValue()?.toFormatString("yyyy-MM-dd HH:mm") ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>Type</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <DateTimeField type="datetime" />
            <DateTimeField type="datetime-sec" />
          </div>
        </section>

        <section>
          <h3>Min / Max</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <DateTimeField min={new DateTime(2024, 1, 1, 0, 0, 0)} max={new DateTime(2026, 12, 31, 23, 59, 59)} />
          </div>
        </section>

        {/* ========== ColorField ========== */}
        <h2>ColorField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <ColorField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}>
            <ColorField value={colorValue()} onChange={setColorValue} />
            <span>현재 값: {colorValue() ?? "(없음)"}</span>
          </div>
        </section>
      </div>
    </TopbarContainer>
  );
}
