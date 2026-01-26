import { createSignal } from "solid-js";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";
import {
  SdTextField,
  SdTextarea,
  SdNumberField,
  SdColorField,
  SdDateField,
  SdTimeField,
  SdDateTimeField,
  SdFormatField,
} from "@simplysm/solid";

export default function FieldsPage() {
  // TextField
  const [textValue, setTextValue] = createSignal<string | undefined>("Hello World");
  const [passwordValue, setPasswordValue] = createSignal<string | undefined>("secret");

  // Textarea
  const [textareaValue, setTextareaValue] = createSignal<string | undefined>("여러 줄\n텍스트 입력");

  // NumberField
  const [numberValue, setNumberValue] = createSignal<number | undefined>(1234567);
  const [decimalValue, setDecimalValue] = createSignal<number | undefined>(1234.56);

  // ColorField
  const [colorValue, setColorValue] = createSignal<string | undefined>("#3b82f6");

  // DateField
  const [dateValue, setDateValue] = createSignal<DateOnly | undefined>(new DateOnly());
  const [monthValue, setMonthValue] = createSignal<DateOnly | undefined>(new DateOnly());
  const [yearValue, setYearValue] = createSignal<DateOnly | undefined>(new DateOnly());

  // TimeField
  const [timeValue, setTimeValue] = createSignal<Time | undefined>(new Time(10, 30));
  const [timeSecValue, setTimeSecValue] = createSignal<Time | undefined>(new Time(10, 30, 45));

  // DateTimeField
  const [dateTimeValue, setDateTimeValue] = createSignal<DateTime | undefined>(new DateTime());

  // FormatField
  const [phoneValue, setPhoneValue] = createSignal<string | undefined>("01012345678");
  const [bizNoValue, setBizNoValue] = createSignal<string | undefined>("1234567890");

  return (
    <div class="space-y-8 p-8">
      <h1 class="mb-6 text-3xl font-bold">필드 컴포넌트 데모</h1>

      {/* SdTextField */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">SdTextField</h2>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end gap-4">
            <div class="w-64">
              <label class="mb-1 block text-sm">text</label>
              <SdTextField value={textValue()} onChange={setTextValue} placeholder="텍스트 입력" />
            </div>
            <div class="w-64">
              <label class="mb-1 block text-sm">password</label>
              <SdTextField
                type="password"
                value={passwordValue()}
                onChange={setPasswordValue}
                placeholder="비밀번호"
              />
            </div>
            <div class="w-64">
              <label class="mb-1 block text-sm">email</label>
              <SdTextField type="email" placeholder="이메일 입력" />
            </div>
          </div>
          <div class="text-sm text-text-muted">
            입력값: text="{textValue()}", password="{passwordValue()}"
          </div>
        </div>
      </section>

      {/* SdTextarea */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">SdTextarea</h2>
        <div class="space-y-4">
          <div class="flex flex-wrap items-start gap-4">
            <div class="w-64">
              <label class="mb-1 block text-sm">기본 사용</label>
              <SdTextarea
                value={textareaValue()}
                onChange={setTextareaValue}
                placeholder="텍스트 영역"
              />
            </div>
            <div class="w-64">
              <label class="mb-1 block text-sm">minRows=3</label>
              <SdTextarea minRows={3} placeholder="최소 3줄" />
            </div>
            <div class="w-64">
              <label class="mb-1 block text-sm">자동 높이 확장</label>
              <SdTextarea
                defaultValue={"첫 번째 줄\n두 번째 줄\n세 번째 줄\n네 번째 줄"}
                placeholder="여러 줄 입력 시 자동 확장"
              />
            </div>
          </div>
          <div class="text-sm text-text-muted">
            입력값: "{textareaValue()?.replace(/\n/g, "\\n")}"
          </div>
        </div>
      </section>

      {/* SdNumberField */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">SdNumberField</h2>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end gap-4">
            <div class="w-48">
              <label class="mb-1 block text-sm">기본 (콤마 포함)</label>
              <SdNumberField value={numberValue()} onChange={setNumberValue} placeholder="숫자" />
            </div>
            <div class="w-48">
              <label class="mb-1 block text-sm">콤마 없음</label>
              <SdNumberField defaultValue={9999} useComma={false} />
            </div>
            <div class="w-48">
              <label class="mb-1 block text-sm">소수점 2자리</label>
              <SdNumberField value={decimalValue()} onChange={setDecimalValue} minDigits={2} />
            </div>
          </div>
          <div class="text-sm text-text-muted">
            입력값: {numberValue()}, 소수점: {decimalValue()}
          </div>
        </div>
      </section>

      {/* SdColorField */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">SdColorField</h2>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end gap-4">
            <div class="w-48">
              <label class="mb-1 block text-sm">색상 선택</label>
              <SdColorField value={colorValue()} onChange={setColorValue} />
            </div>
            <div class="h-10 w-48 rounded-sm" style={{ "background-color": colorValue() }} />
          </div>
          <div class="text-sm text-text-muted">선택된 색상: {colorValue()}</div>
        </div>
      </section>

      {/* SdDateField */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">SdDateField</h2>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end gap-4">
            <div class="w-48">
              <label class="mb-1 block text-sm">date</label>
              <SdDateField type="date" value={dateValue()} onChange={setDateValue} />
            </div>
            <div class="w-48">
              <label class="mb-1 block text-sm">month</label>
              <SdDateField type="month" value={monthValue()} onChange={setMonthValue} />
            </div>
            <div class="w-32">
              <label class="mb-1 block text-sm">year</label>
              <SdDateField type="year" value={yearValue()} onChange={setYearValue} />
            </div>
          </div>
          <div class="text-sm text-text-muted">
            date: {dateValue()?.toFormatString("yyyy-MM-dd")}, month:{" "}
            {monthValue()?.toFormatString("yyyy-MM")}, year: {yearValue()?.year}
          </div>
        </div>
      </section>

      {/* SdTimeField */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">SdTimeField</h2>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end gap-4">
            <div class="w-40">
              <label class="mb-1 block text-sm">time</label>
              <SdTimeField type="time" value={timeValue()} onChange={setTimeValue} />
            </div>
            <div class="w-40">
              <label class="mb-1 block text-sm">time-sec</label>
              <SdTimeField type="time-sec" value={timeSecValue()} onChange={setTimeSecValue} />
            </div>
          </div>
          <div class="text-sm text-text-muted">
            time: {timeValue()?.toFormatString("tt hh:mm")}, time-sec:{" "}
            {timeSecValue()?.toFormatString("tt hh:mm:ss")}
          </div>
        </div>
      </section>

      {/* SdDateTimeField */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">SdDateTimeField</h2>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end gap-4">
            <div class="w-64">
              <label class="mb-1 block text-sm">datetime</label>
              <SdDateTimeField
                type="datetime"
                value={dateTimeValue()}
                onChange={setDateTimeValue}
              />
            </div>
            <div class="w-64">
              <label class="mb-1 block text-sm">datetime-sec</label>
              <SdDateTimeField type="datetime-sec" />
            </div>
          </div>
          <div class="text-sm text-text-muted">
            datetime: {dateTimeValue()?.toFormatString("yyyy-MM-dd tt hh:mm")}
          </div>
        </div>
      </section>

      {/* SdFormatField */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">SdFormatField</h2>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end gap-4">
            <div class="w-48">
              <label class="mb-1 block text-sm">전화번호</label>
              <SdFormatField
                format="XXX-XXXX-XXXX"
                value={phoneValue()}
                onChange={setPhoneValue}
                placeholder="전화번호"
              />
            </div>
            <div class="w-48">
              <label class="mb-1 block text-sm">사업자등록번호</label>
              <SdFormatField
                format="XXX-XX-XXXXX"
                value={bizNoValue()}
                onChange={setBizNoValue}
                placeholder="사업자번호"
              />
            </div>
          </div>
          <div class="text-sm text-text-muted">
            전화번호 (순수값): {phoneValue()}, 사업자번호 (순수값): {bizNoValue()}
          </div>
        </div>
      </section>

      {/* Size Variants */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">Size Variants</h2>
        <div class="flex flex-wrap items-end gap-4">
          <div class="w-40">
            <label class="mb-1 block text-sm">sm</label>
            <SdTextField size="sm" defaultValue="Small" />
          </div>
          <div class="w-40">
            <label class="mb-1 block text-sm">default</label>
            <SdTextField defaultValue="Default" />
          </div>
          <div class="w-40">
            <label class="mb-1 block text-sm">lg</label>
            <SdTextField size="lg" defaultValue="Large" />
          </div>
        </div>
      </section>

      {/* Theme Variants */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">Theme Variants</h2>
        <div class="flex flex-wrap items-end gap-4">
          <div class="w-32">
            <label class="mb-1 block text-sm">primary</label>
            <SdTextField theme="primary" defaultValue="Primary" />
          </div>
          <div class="w-32">
            <label class="mb-1 block text-sm">success</label>
            <SdTextField theme="success" defaultValue="Success" />
          </div>
          <div class="w-32">
            <label class="mb-1 block text-sm">warning</label>
            <SdTextField theme="warning" defaultValue="Warning" />
          </div>
          <div class="w-32">
            <label class="mb-1 block text-sm">danger</label>
            <SdTextField theme="danger" defaultValue="Danger" />
          </div>
        </div>
      </section>

      {/* Inline */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">Inline</h2>
        <div class="flex flex-wrap items-center gap-4">
          <span>Inline:</span>
          <SdTextField inline defaultValue="인라인" />
          <SdNumberField inline defaultValue={123} />
        </div>
      </section>

      {/* Inset (테이블) */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">Inset (테이블 내 사용)</h2>
        <table class="border-collapse h-px border border-border-base">
          <thead>
            <tr>
              <th class="
                h-px border border-border-base px-3 py-2 text-left font-medium
              ">이름</th>
              <th class="
                h-px border border-border-base px-3 py-2 text-left font-medium
              ">수량</th>
              <th class="
                h-px border border-border-base px-3 py-2 text-left font-medium
              ">단가</th>
              <th class="
                h-px border border-border-base px-3 py-2 text-left font-medium
              ">입고일</th>
              <th class="
                h-px border border-border-base px-3 py-2 text-left font-medium
              ">입고시간</th>
              <th class="
                h-px border border-border-base px-3 py-2 text-left font-medium
              ">연락처</th>
              <th class="
                h-px border border-border-base px-3 py-2 text-left font-medium
              ">비고</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="h-px border border-border-base">
                <SdTextField inset defaultValue="상품 A" />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset defaultValue={100} />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset defaultValue={15000} />
              </td>
              <td class="h-px border border-border-base">
                <SdDateField type="date" inset defaultValue={new DateOnly()} />
              </td>
              <td class="h-px border border-border-base">
                <SdTimeField type="time" inset defaultValue={new Time(9, 0)} />
              </td>
              <td class="h-px border border-border-base">
                <SdFormatField format="XXX-XXXX-XXXX" inset defaultValue="01012345678" />
              </td>
              <td class="h-px border border-border-base align-top">
                <SdTextarea inset defaultValue="신규 입고" />
              </td>
            </tr>
            <tr>
              <td class="h-px border border-border-base">
                <SdTextField inset defaultValue="상품 B" />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset defaultValue={250} />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset defaultValue={8500} />
              </td>
              <td class="h-px border border-border-base">
                <SdDateField type="date" inset defaultValue={new DateOnly()} />
              </td>
              <td class="h-px border border-border-base">
                <SdTimeField type="time" inset defaultValue={new Time(14, 30)} />
              </td>
              <td class="h-px border border-border-base">
                <SdFormatField format="XXX-XXXX-XXXX" inset defaultValue="01098765432" />
              </td>
              <td class="h-px border border-border-base align-top">
                <SdTextarea inset defaultValue={"재고 부족\n추가 발주 필요"} />
              </td>
            </tr>
            <tr>
              <td class="h-px border border-border-base">
                <SdTextField inset placeholder="상품명 입력" />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset placeholder="수량" />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset placeholder="단가" />
              </td>
              <td class="h-px border border-border-base">
                <SdDateField type="date" inset />
              </td>
              <td class="h-px border border-border-base">
                <SdTimeField type="time" inset />
              </td>
              <td class="h-px border border-border-base">
                <SdFormatField format="XXX-XXXX-XXXX" inset placeholder="연락처" />
              </td>
              <td class="h-px border border-border-base align-top">
                <SdTextarea inset placeholder="비고" />
              </td>
            </tr>
            <tr>
              <td class="h-px border border-border-base">
                <SdTextField inset disabled defaultValue="상품 C" />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset disabled defaultValue={250} />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset disabled defaultValue={8500} />
              </td>
              <td class="h-px border border-border-base">
                <SdDateField type="date" inset disabled defaultValue={new DateOnly()} />
              </td>
              <td class="h-px border border-border-base">
                <SdTimeField type="time" inset disabled defaultValue={new Time(14, 30)} />
              </td>
              <td class="h-px border border-border-base">
                <SdFormatField format="XXX-XXXX-XXXX" inset disabled defaultValue="01098765432" />
              </td>
              <td class="h-px border border-border-base align-top">
                <SdTextarea inset disabled defaultValue="비활성화 상태" />
              </td>
            </tr>
            <tr>
              <td class="h-px border border-border-base">
                <SdTextField inset readonly defaultValue="상품 D" />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset readonly defaultValue={250} />
              </td>
              <td class="h-px border border-border-base">
                <SdNumberField inset readonly defaultValue={8500} />
              </td>
              <td class="h-px border border-border-base">
                <SdDateField type="date" inset readonly defaultValue={new DateOnly()} />
              </td>
              <td class="h-px border border-border-base">
                <SdTimeField type="time" inset readonly defaultValue={new Time(14, 30)} />
              </td>
              <td class="h-px border border-border-base">
                <SdFormatField format="XXX-XXXX-XXXX" inset readonly defaultValue="01098765432" />
              </td>
              <td class="h-px border border-border-base align-top">
                <SdTextarea inset readonly defaultValue="읽기 전용 상태" />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Disabled / Readonly */}
      <section>
        <h2 class="mb-3 text-xl font-semibold">Disabled / Readonly</h2>
        <div class="flex flex-wrap items-end gap-4">
          <div class="w-40">
            <label class="mb-1 block text-sm">disabled</label>
            <SdTextField disabled defaultValue="비활성" />
          </div>
          <div class="w-40">
            <label class="mb-1 block text-sm">readonly</label>
            <SdTextField readonly defaultValue="읽기전용" />
          </div>
          <div class="w-40">
            <label class="mb-1 block text-sm">password readonly</label>
            <SdTextField type="password" readonly defaultValue="secret" />
          </div>
          <div class="w-40">
            <label class="mb-1 block text-sm">number disabled</label>
            <SdNumberField disabled defaultValue={1234567} />
          </div>
          <div class="w-40">
            <label class="mb-1 block text-sm">time readonly</label>
            <SdTimeField type="time" readonly defaultValue={new Time(14, 30)} />
          </div>
        </div>
      </section>
    </div>
  );
}
