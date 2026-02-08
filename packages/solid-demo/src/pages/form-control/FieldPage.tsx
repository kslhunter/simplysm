import { createSignal } from "solid-js";
import {
  TextField,
  TextAreaField,
  NumberField,
  DateField,
  DateTimeField,
  TimeField,
  ColorPicker,
  Topbar,
  TopbarContainer,
} from "@simplysm/solid";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";

export default function FieldPage() {
  // Controlled 예제용 시그널
  const [controlledText, setControlledText] = createSignal<string | undefined>("controlled 값");
  const [controlledNumber, setControlledNumber] = createSignal<number | undefined>(12345);
  const [controlledTextArea, setControlledTextArea] = createSignal<string | undefined>("여러 줄의\n텍스트를\n입력할 수 있습니다");

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Field Components</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* TextField */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">TextField</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
                <TextField placeholder="이름을 입력하세요" />
              </div>

              {/* 타입 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">타입</h3>
                <div class="flex flex-col items-start gap-3">
                  <TextField placeholder="text (기본)" />
                  <TextField type="password" placeholder="password" />
                  <TextField type="email" placeholder="email" />
                </div>
              </div>

              {/* 포맷 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">포맷 (전화번호)</h3>
                <TextField placeholder="전화번호" format="XXX-XXXX-XXXX" />
              </div>

              {/* 사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">사이즈</h3>
                <div class="flex flex-col items-start gap-3">
                  <TextField size="sm" placeholder="Small" />
                  <TextField placeholder="Default" />
                  <TextField size="lg" placeholder="Large" />
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled</p>
                    <TextField disabled value="비활성화됨" />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Error</p>
                    <TextField error placeholder="에러 상태" />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Inset (테두리 없음)</p>
                    <TextField inset placeholder="인셋 스타일" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TextAreaField */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">TextAreaField</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
                <TextAreaField placeholder="내용을 입력하세요" />
              </div>

              {/* minRows */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">최소 줄 수 (minRows)</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">minRows=1 (기본값)</p>
                    <TextAreaField placeholder="1줄" />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">minRows=3</p>
                    <TextAreaField minRows={3} placeholder="최소 3줄" />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">minRows=5</p>
                    <TextAreaField minRows={5} placeholder="최소 5줄" />
                  </div>
                </div>
              </div>

              {/* 사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">사이즈</h3>
                <div class="flex flex-col items-start gap-3">
                  <TextAreaField size="sm" placeholder="Small" />
                  <TextAreaField placeholder="Default" />
                  <TextAreaField size="lg" placeholder="Large" />
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled</p>
                    <TextAreaField disabled value="비활성화됨" />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Error</p>
                    <TextAreaField error placeholder="에러 상태" />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Inset (테두리 없음)</p>
                    <TextAreaField inset placeholder="인셋 스타일" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* NumberField */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">NumberField</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
                <NumberField placeholder="숫자를 입력하세요" />
              </div>

              {/* 천단위 콤마 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">천단위 콤마</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">useComma=true (기본값)</p>
                    <NumberField value={1234567} />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">useComma=false</p>
                    <NumberField value={1234567} useComma={false} />
                  </div>
                </div>
              </div>

              {/* 소수점 자릿수 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">소수점 자릿수 (minDigits)</h3>
                <NumberField value={100} minDigits={2} placeholder="minDigits=2" />
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled</p>
                    <NumberField disabled value={9999} />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Error</p>
                    <NumberField error placeholder="에러 상태" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* DateField */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">DateField</h2>
            <div class="space-y-6">
              {/* 타입별 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">타입</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">date (기본값)</p>
                    <DateField value={new DateOnly(2024, 6, 15)} />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">month</p>
                    <DateField type="month" value={new DateOnly(2024, 6, 1)} />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">year</p>
                    <DateField type="year" value={new DateOnly(2024, 1, 1)} />
                  </div>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled</p>
                    <DateField disabled value={new DateOnly(2024, 1, 1)} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* DateTimeField */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">DateTimeField</h2>
            <div class="space-y-6">
              {/* 타입별 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">타입</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">datetime (기본값)</p>
                    <DateTimeField value={new DateTime(2024, 6, 15, 14, 30)} />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">datetime-sec (초 단위)</p>
                    <DateTimeField type="datetime-sec" value={new DateTime(2024, 6, 15, 14, 30, 45)} />
                  </div>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled</p>
                    <DateTimeField disabled value={new DateTime(2024, 1, 1, 12, 0)} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TimeField */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">TimeField</h2>
            <div class="space-y-6">
              {/* 타입별 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">타입</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">time (기본값)</p>
                    <TimeField value={new Time(14, 30)} />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">time-sec (초 단위)</p>
                    <TimeField type="time-sec" value={new Time(14, 30, 45)} />
                  </div>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled</p>
                    <TimeField disabled value={new Time(9, 0)} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ColorPicker */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">ColorPicker</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
                <div class="flex items-center gap-4">
                  <ColorPicker />
                  <ColorPicker value="#3b82f6" />
                  <ColorPicker value="#ef4444" />
                </div>
              </div>

              {/* 사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">사이즈</h3>
                <div class="flex items-center gap-4">
                  <ColorPicker size="sm" value="#22c55e" />
                  <ColorPicker value="#22c55e" />
                  <ColorPicker size="lg" value="#22c55e" />
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex items-center gap-4">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled</p>
                    <ColorPicker disabled value="#8b5cf6" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Controlled */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">Controlled</h2>
            <div class="space-y-6">
              {/* TextField Controlled */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">TextField</h3>
                <div class="flex flex-col items-start gap-3">
                  <TextField
                    value={controlledText()}
                    onValueChange={setControlledText}
                    placeholder="값을 입력하세요"
                  />
                  <p class="text-sm text-base-600 dark:text-base-400">
                    현재 값: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{controlledText() ?? "(없음)"}</code>
                  </p>
                  <button
                    class="w-fit rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600"
                    onClick={() => setControlledText("새로운 값!")}
                  >
                    값 변경
                  </button>
                </div>
              </div>

              {/* NumberField Controlled */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">NumberField</h3>
                <div class="flex flex-col items-start gap-3">
                  <NumberField
                    value={controlledNumber()}
                    onValueChange={setControlledNumber}
                    placeholder="숫자를 입력하세요"
                  />
                  <p class="text-sm text-base-600 dark:text-base-400">
                    현재 값: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{controlledNumber() ?? "(없음)"}</code>
                  </p>
                  <div class="flex gap-2">
                    <button
                      class="w-fit rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600"
                      onClick={() => setControlledNumber((v) => (v ?? 0) + 100)}
                    >
                      +100
                    </button>
                    <button
                      class="w-fit rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600"
                      onClick={() => setControlledNumber((v) => (v ?? 0) - 100)}
                    >
                      -100
                    </button>
                    <button
                      class="w-fit rounded bg-base-500 px-3 py-1 text-sm text-white hover:bg-base-600"
                      onClick={() => setControlledNumber(undefined)}
                    >
                      초기화
                    </button>
                  </div>
                </div>
              </div>

              {/* TextAreaField Controlled */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">TextAreaField</h3>
                <div class="flex flex-col items-start gap-3">
                  <TextAreaField
                    value={controlledTextArea()}
                    onValueChange={setControlledTextArea}
                    placeholder="내용을 입력하세요"
                    minRows={3}
                  />
                  <p class="text-sm text-base-600 dark:text-base-400">
                    현재 값: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{controlledTextArea() ?? "(없음)"}</code>
                  </p>
                  <button
                    class="w-fit rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600"
                    onClick={() => setControlledTextArea("프로그래밍으로\n값을 변경했습니다")}
                  >
                    값 변경
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
