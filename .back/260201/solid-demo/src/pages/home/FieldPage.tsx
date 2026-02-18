import { createSignal, For } from "solid-js";
import {
  TextField,
  Textarea,
  NumberField,
  DateField,
  TimeField,
  DateTimeField,
  ColorField,
  Checkbox,
  Switch,
  Topbar,
  TopbarContainer,
  Button,
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
  const [textareaValue, setTextareaValue] = createSignal<string | undefined>(undefined);
  const [checkboxValue, setCheckboxValue] = createSignal(false);
  const [switchValue, setSwitchValue] = createSignal(false);

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
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TextField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TextField value={textValue()} onChange={setTextValue} placeholder="입력하세요" />
            <span>현재 값: {textValue() ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>Type</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TextField type="text" placeholder="text" />
            <TextField type="password" placeholder="password" />
            <TextField type="email" placeholder="email" />
          </div>
        </section>

        <section>
          <h3>Format</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TextField format="000-0000-0000" placeholder="전화번호" />
          </div>
        </section>

        <section>
          <h3>Size</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
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
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TextField disabled placeholder="Disabled 상태" />
            <TextField readOnly placeholder="ReadOnly 상태" />
          </div>
        </section>

        <section>
          <h3>Placeholder</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TextField placeholder="플레이스홀더 텍스트" />
          </div>
        </section>

        <section>
          <h3>Invalid</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <div use:invalid={() => "에러 메시지"}>
              <TextField placeholder="에러 상태" />
            </div>
          </div>
        </section>

        {/* ========== Textarea ========== */}
        <h2>Textarea</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Textarea placeholder="여러 줄 입력" />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div
            class={atoms({
              display: "flex",
              gap: "base",
              alignItems: "flex-start",
              flexWrap: "wrap",
            })}
          >
            <Textarea value={textareaValue()} onChange={setTextareaValue} placeholder="내용 입력" />
            <span>현재 값: {textareaValue() ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>Rows</h3>
          <div
            class={atoms({
              display: "flex",
              gap: "base",
              alignItems: "flex-start",
              flexWrap: "wrap",
            })}
          >
            <Textarea rows={2} placeholder="rows=2" />
            <Textarea rows={5} placeholder="rows=5" />
          </div>
        </section>

        <section>
          <h3>AutoResize</h3>
          <div
            class={atoms({
              display: "flex",
              gap: "base",
              alignItems: "flex-start",
              flexWrap: "wrap",
            })}
          >
            <Textarea autoResize placeholder="내용에 따라 자동 확장" />
          </div>
        </section>

        <section>
          <h3>Resize Options</h3>
          <div
            class={atoms({
              display: "flex",
              gap: "base",
              alignItems: "flex-start",
              flexWrap: "wrap",
            })}
          >
            <Textarea resize="none" placeholder="resize=none" />
            <Textarea resize="vertical" placeholder="resize=vertical (기본)" />
            <Textarea resize="horizontal" placeholder="resize=horizontal" />
            <Textarea resize="both" placeholder="resize=both" />
          </div>
        </section>

        <section>
          <h3>Size</h3>
          <div
            class={atoms({
              display: "flex",
              gap: "base",
              alignItems: "flex-start",
              flexWrap: "wrap",
            })}
          >
            <Textarea size="sm" placeholder="sm" />
            <Textarea placeholder="default" />
            <Textarea size="lg" placeholder="lg" />
          </div>
        </section>

        <section>
          <h3>Inset (in Table)</h3>
          <table class={demoTable}>
            <tbody>
              <tr>
                <td class={atoms({ p: "sm" })}>설명</td>
                <td>
                  <Textarea inset placeholder="설명 입력" />
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>Disabled / ReadOnly</h3>
          <div
            class={atoms({
              display: "flex",
              gap: "base",
              alignItems: "flex-start",
              flexWrap: "wrap",
            })}
          >
            <Textarea disabled placeholder="Disabled 상태" />
            <Textarea readOnly value="ReadOnly 상태 텍스트" />
          </div>
        </section>

        <section>
          <h3>Invalid</h3>
          <div
            class={atoms({
              display: "flex",
              gap: "base",
              alignItems: "flex-start",
              flexWrap: "wrap",
            })}
          >
            <div use:invalid={() => "에러 메시지"}>
              <Textarea placeholder="에러 상태" />
            </div>
          </div>
        </section>

        {/* ========== NumberField ========== */}
        <h2>NumberField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <NumberField placeholder="숫자 입력" />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <NumberField value={numValue()} onChange={setNumValue} placeholder="숫자 입력" />
            <span>현재 값: {numValue() ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>useNumberComma</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <NumberField useNumberComma placeholder="1234567 → 1,234,567" />
          </div>
        </section>

        <section>
          <h3>minDigits</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <NumberField minDigits={5} placeholder="123 → 00123" />
          </div>
        </section>

        {/* ========== DateField ========== */}
        <h2>DateField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <DateField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <DateField value={dateValue()} onChange={setDateValue} />
            <span>현재 값: {dateValue()?.toFormatString("yyyy-MM-dd") ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>Type</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <DateField type="date" />
            <DateField type="month" />
            <DateField type="year" />
          </div>
        </section>

        <section>
          <h3>Min / Max</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <DateField min={new DateOnly(2024, 1, 1)} max={new DateOnly(2026, 12, 31)} />
          </div>
        </section>

        {/* ========== TimeField ========== */}
        <h2>TimeField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TimeField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TimeField value={timeValue()} onChange={setTimeValue} />
            <span>현재 값: {timeValue()?.toFormatString("HH:mm") ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>Type</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TimeField type="time" />
            <TimeField type="time-sec" />
          </div>
        </section>

        <section>
          <h3>Min / Max</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <TimeField min={new Time(9, 0, 0)} max={new Time(18, 0, 0)} />
          </div>
        </section>

        {/* ========== DateTimeField ========== */}
        <h2>DateTimeField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <DateTimeField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <DateTimeField value={dtValue()} onChange={setDtValue} />
            <span>현재 값: {dtValue()?.toFormatString("yyyy-MM-dd HH:mm") ?? "(없음)"}</span>
          </div>
        </section>

        <section>
          <h3>Type</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <DateTimeField type="datetime" />
            <DateTimeField type="datetime-sec" />
          </div>
        </section>

        <section>
          <h3>Min / Max</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <DateTimeField
              min={new DateTime(2024, 1, 1, 0, 0, 0)}
              max={new DateTime(2026, 12, 31, 23, 59, 59)}
            />
          </div>
        </section>

        {/* ========== ColorField ========== */}
        <h2>ColorField</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <ColorField />
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <ColorField value={colorValue()} onChange={setColorValue} />
            <span>현재 값: {colorValue() ?? "(없음)"}</span>
          </div>
        </section>

        {/* ========== Checkbox ========== */}
        <h2>Checkbox</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox>동의합니다</Checkbox>
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox checked={checkboxValue()} onChange={setCheckboxValue}>
              동의합니다 (값: {String(checkboxValue())})
            </Checkbox>
          </div>
        </section>

        <section>
          <h3>Indeterminate</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox indeterminate>부분 선택</Checkbox>
          </div>
        </section>

        <section>
          <h3>Themes</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <For
              each={
                [
                  "primary",
                  "secondary",
                  "success",
                  "warning",
                  "danger",
                  "info",
                  "gray",
                  "slate",
                ] as const
              }
            >
              {(theme) => (
                <Checkbox theme={theme} checked>
                  {theme}
                </Checkbox>
              )}
            </For>
          </div>
        </section>

        <section>
          <h3>Sizes</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox size="xs">xs 크기</Checkbox>
            <Checkbox size="sm">sm 크기</Checkbox>
            <Checkbox>기본 크기</Checkbox>
            <Checkbox size="lg">lg 크기</Checkbox>
            <Checkbox size="xl">xl 크기</Checkbox>
          </div>
        </section>

        <section>
          <h3>Inline</h3>
          <div>
            <span>텍스트 중간에 </span>
            <Checkbox inline checked>
              인라인
            </Checkbox>
            <span> 체크박스</span>
          </div>
        </section>

        <section>
          <h3>Inset (in Table)</h3>
          <table class={demoTable}>
            <tbody>
              <tr>
                <td class={atoms({ p: "sm" })}>선택</td>
                <td>
                  <Checkbox inset />
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>Disabled</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Checkbox disabled>비활성화됨</Checkbox>
            <Checkbox disabled checked>
              비활성화됨 (체크)
            </Checkbox>
          </div>
        </section>

        {/* ========== Switch ========== */}
        <h2>Switch</h2>

        <section>
          <h3>Default (Uncontrolled)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Switch>알림 수신</Switch>
          </div>
        </section>

        <section>
          <h3>Controlled (현재 값 표시)</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Switch checked={switchValue()} onChange={setSwitchValue}>
              다크 모드 (값: {String(switchValue())})
            </Switch>
          </div>
        </section>

        <section>
          <h3>Themes</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <For
              each={
                [
                  "primary",
                  "secondary",
                  "success",
                  "warning",
                  "danger",
                  "info",
                  "gray",
                  "slate",
                ] as const
              }
            >
              {(theme) => (
                <Switch theme={theme} checked>
                  {theme}
                </Switch>
              )}
            </For>
          </div>
        </section>

        <section>
          <h3>Sizes</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Switch size="xs">xs 크기</Switch>
            <Switch size="sm">sm 크기</Switch>
            <Switch>기본 크기</Switch>
            <Switch size="lg">lg 크기</Switch>
            <Switch size="xl">xl 크기</Switch>
          </div>
        </section>

        <section>
          <h3>Inline</h3>
          <div>
            <span>텍스트 중간에 </span>
            <Switch inline checked>
              인라인
            </Switch>
            <span> 스위치</span>
          </div>
        </section>

        <section>
          <h3>Inset (in Table)</h3>
          <table class={demoTable}>
            <tbody>
              <tr>
                <td class={atoms({ p: "sm" })}>활성화</td>
                <td>
                  <Switch inset />
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>Disabled</h3>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <Switch disabled>비활성화됨</Switch>
            <Switch disabled checked>
              비활성화됨 (켜짐)
            </Switch>
          </div>
        </section>

        {/* ========== 유효성 검사 (Validation) ========== */}
        <h2>유효성 검사 (Validation)</h2>

        <section>
          <h3>TextField + invalid directive</h3>
          <p class={atoms({ fontSize: "sm", color: "gray" })}>
            입력값이 비어있으면 에러 상태가 표시됩니다. 좌상단에 빨간 점이 나타납니다.
          </p>
          <div
            class={atoms({
              display: "flex",
              gap: "base",
              alignItems: "flex-start",
              flexWrap: "wrap",
            })}
          >
            <ValidationTextField />
          </div>
        </section>

        <section>
          <h3>Textarea + invalid directive</h3>
          <p class={atoms({ fontSize: "sm", color: "gray" })}>
            내용이 10자 미만이면 에러 상태가 표시됩니다.
          </p>
          <div
            class={atoms({
              display: "flex",
              gap: "base",
              alignItems: "flex-start",
              flexWrap: "wrap",
            })}
          >
            <ValidationTextarea />
          </div>
        </section>

        <section>
          <h3>Checkbox + invalid directive</h3>
          <p class={atoms({ fontSize: "sm", color: "gray" })}>
            체크하지 않으면 에러 상태가 표시됩니다.
          </p>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <ValidationCheckbox />
          </div>
        </section>

        <section>
          <h3>Switch + invalid directive</h3>
          <p class={atoms({ fontSize: "sm", color: "gray" })}>
            활성화하지 않으면 에러 상태가 표시됩니다.
          </p>
          <div
            class={atoms({ display: "flex", gap: "base", alignItems: "center", flexWrap: "wrap" })}
          >
            <ValidationSwitch />
          </div>
        </section>

        <section>
          <h3>폼 제출 시 자동 포커스 이동</h3>
          <p class={atoms({ fontSize: "sm", color: "gray" })}>
            빈 필드가 있는 상태에서 제출 버튼을 클릭하면 첫 번째 invalid 필드로 포커스가 이동합니다.
          </p>
          <ValidationForm />
        </section>
      </div>
    </TopbarContainer>
  );
}

function ValidationTextField() {
  const [name, setName] = createSignal<string | undefined>(undefined);
  const errorMessage = () => (name() == null || name() === "" ? "이름을 입력하세요" : "");

  return (
    <div class={atoms({ display: "flex", gap: "base", alignItems: "center" })}>
      <div use:invalid={() => errorMessage()}>
        <TextField value={name()} onChange={setName} placeholder="이름" />
      </div>
      <span class={atoms({ fontSize: "sm" })}>
        상태: {name() != null && name() !== "" ? "✅ Valid" : "❌ Invalid"}
      </span>
    </div>
  );
}

function ValidationTextarea() {
  const [content, setContent] = createSignal<string | undefined>(undefined);
  const errorMessage = () => {
    const val = content();
    if (val == null || val === "") return "내용을 입력하세요";
    if (val.length < 10) return "10자 이상 입력하세요";
    return "";
  };

  return (
    <div class={atoms({ display: "flex", gap: "base", alignItems: "flex-start" })}>
      <div use:invalid={() => errorMessage()}>
        <Textarea
          value={content()}
          onChange={setContent}
          placeholder="최소 10자 이상 입력"
          rows={3}
        />
      </div>
      <span class={atoms({ fontSize: "sm" })}>
        {content()?.length ?? 0}자 / 상태: {errorMessage() === "" ? "✅ Valid" : "❌ Invalid"}
      </span>
    </div>
  );
}

function ValidationCheckbox() {
  const [agreed, setAgreed] = createSignal(false);
  const errorMessage = () => (agreed() ? "" : "동의해주세요");

  return (
    <div class={atoms({ display: "flex", gap: "base", alignItems: "center" })}>
      <div use:invalid={() => errorMessage()}>
        <Checkbox checked={agreed()} onChange={setAgreed}>
          이용약관에 동의합니다 (필수)
        </Checkbox>
      </div>
      <span class={atoms({ fontSize: "sm" })}>상태: {agreed() ? "✅ Valid" : "❌ Invalid"}</span>
    </div>
  );
}

function ValidationSwitch() {
  const [enabled, setEnabled] = createSignal(false);
  const errorMessage = () => (enabled() ? "" : "활성화해주세요");

  return (
    <div class={atoms({ display: "flex", gap: "base", alignItems: "center" })}>
      <div use:invalid={() => errorMessage()}>
        <Switch checked={enabled()} onChange={setEnabled}>
          알림 수신 동의 (필수)
        </Switch>
      </div>
      <span class={atoms({ fontSize: "sm" })}>상태: {enabled() ? "✅ Valid" : "❌ Invalid"}</span>
    </div>
  );
}

function ValidationForm() {
  const [name, setName] = createSignal<string | undefined>(undefined);
  const [email, setEmail] = createSignal<string | undefined>(undefined);
  const [agreed, setAgreed] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);

  const nameError = () => (name() != null && name() !== "" ? "" : "이름을 입력하세요");
  const emailError = () => {
    const val = email();
    if (val == null || val === "") return "이메일을 입력하세요";
    if (!val.includes("@")) return "올바른 이메일 형식이 아닙니다";
    return "";
  };
  const agreeError = () => (agreed() ? "" : "약관에 동의해주세요");

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setSubmitted(true);
  };

  return (
    <form
      onSubmit={handleSubmit}
      class={atoms({ display: "flex", flexDirection: "column", gap: "base" })}
      style={{ "max-width": "400px" }}
    >
      <div use:invalid={() => nameError()}>
        <TextField value={name()} onChange={setName} placeholder="이름 (필수)" />
      </div>
      <div use:invalid={() => emailError()}>
        <TextField value={email()} onChange={setEmail} type="email" placeholder="이메일 (필수)" />
      </div>
      <div use:invalid={() => agreeError()}>
        <Checkbox checked={agreed()} onChange={setAgreed}>
          약관 동의 (필수)
        </Checkbox>
      </div>
      <Button type="submit" theme="primary">
        제출
      </Button>
      {submitted() && (
        <p class={atoms({ color: "success" })}>
          ✅ 제출 성공! 이름: {name()}, 이메일: {email()}
        </p>
      )}
    </form>
  );
}
