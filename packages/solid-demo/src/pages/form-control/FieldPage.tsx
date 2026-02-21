import { createSignal } from "solid-js";
import {
  TextInput,
  Textarea,
  NumberInput,
  DatePicker,
  DateTimePicker,
  TimePicker,
  Invalid,
  Button,
} from "@simplysm/solid";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";

export default function FieldPage() {
  // Controlled 예제용 시그널
  const [controlledText, setControlledText] = createSignal<string | undefined>("controlled 값");
  const [controlledNumber, setControlledNumber] = createSignal<number | undefined>(12345);
  const [controlledTextArea, setControlledTextArea] = createSignal<string | undefined>(
    "여러 줄의\n텍스트를\n입력할 수 있습니다",
  );

  return (
    <div class="space-y-12 p-6">
      {/* TextInput */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">TextInput</h2>
        <div class="space-y-6">
          {/* 기본 사용 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">기본 사용</h3>
            <TextInput placeholder="이름을 입력하세요" />
          </div>

          {/* 타입 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">타입</h3>
            <div class="flex flex-col items-start gap-3">
              <TextInput placeholder="text (기본)" />
              <TextInput type="password" placeholder="password" />
              <TextInput type="email" placeholder="email" />
            </div>
          </div>

          {/* 포맷 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">포맷 (전화번호)</h3>
            <TextInput placeholder="전화번호" format="XXX-XXXX-XXXX" />
          </div>

          {/* 사이즈 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">사이즈</h3>
            <div class="flex flex-col items-start gap-3">
              <TextInput size="sm" placeholder="Small" />
              <TextInput placeholder="Default" />
              <TextInput size="lg" placeholder="Large" />
            </div>
          </div>

          {/* 상태 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">상태</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <TextInput disabled value="비활성화됨" />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Invalid</p>
                <Invalid message="에러 메시지 예시">
                  <TextInput placeholder="에러 상태" />
                </Invalid>
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Inset (테두리 없음)</p>
                <TextInput inset placeholder="인셋 스타일" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Textarea */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Textarea</h2>
        <div class="space-y-6">
          {/* 기본 사용 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">기본 사용</h3>
            <Textarea placeholder="내용을 입력하세요" />
          </div>

          {/* minRows */}
          <div>
            <h3 class="mb-3 text-lg font-bold">최소 줄 수 (minRows)</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">minRows=1 (기본값)</p>
                <Textarea placeholder="1줄" />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">minRows=3</p>
                <Textarea minRows={3} placeholder="최소 3줄" />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">minRows=5</p>
                <Textarea minRows={5} placeholder="최소 5줄" />
              </div>
            </div>
          </div>

          {/* 사이즈 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">사이즈</h3>
            <div class="flex flex-col items-start gap-3">
              <Textarea size="sm" placeholder="Small" />
              <Textarea placeholder="Default" />
              <Textarea size="lg" placeholder="Large" />
            </div>
          </div>

          {/* 상태 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">상태</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <Textarea disabled value="비활성화됨" />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Invalid</p>
                <Invalid message="에러 메시지 예시">
                  <Textarea placeholder="에러 상태" />
                </Invalid>
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Inset (테두리 없음)</p>
                <Textarea inset placeholder="인셋 스타일" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NumberInput */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">NumberInput</h2>
        <div class="space-y-6">
          {/* 기본 사용 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">기본 사용</h3>
            <NumberInput placeholder="숫자를 입력하세요" />
          </div>

          {/* 천단위 콤마 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">천단위 콤마</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">comma=true (기본값)</p>
                <NumberInput value={1234567} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">comma=false</p>
                <NumberInput value={1234567} comma={false} />
              </div>
            </div>
          </div>

          {/* 소수점 자릿수 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">소수점 자릿수 (minDigits)</h3>
            <NumberInput value={100} minDigits={2} placeholder="minDigits=2" />
          </div>

          {/* 상태 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">상태</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <NumberInput disabled value={9999} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Invalid</p>
                <Invalid message="에러 메시지 예시">
                  <NumberInput placeholder="에러 상태" />
                </Invalid>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DatePicker */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">DatePicker</h2>
        <div class="space-y-6">
          {/* 타입별 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">타입</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">date (기본값)</p>
                <DatePicker value={new DateOnly(2024, 6, 15)} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">month</p>
                <DatePicker unit="month" value={new DateOnly(2024, 6, 1)} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">year</p>
                <DatePicker unit="year" value={new DateOnly(2024, 1, 1)} />
              </div>
            </div>
          </div>

          {/* 상태 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">상태</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <DatePicker disabled value={new DateOnly(2024, 1, 1)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DateTimePicker */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">DateTimePicker</h2>
        <div class="space-y-6">
          {/* 타입별 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">타입</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">datetime (기본값)</p>
                <DateTimePicker value={new DateTime(2024, 6, 15, 14, 30)} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">datetime-sec (초 단위)</p>
                <DateTimePicker unit="second" value={new DateTime(2024, 6, 15, 14, 30, 45)} />
              </div>
            </div>
          </div>

          {/* 상태 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">상태</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <DateTimePicker disabled value={new DateTime(2024, 1, 1, 12, 0)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TimePicker */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">TimePicker</h2>
        <div class="space-y-6">
          {/* 타입별 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">타입</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">time (기본값)</p>
                <TimePicker value={new Time(14, 30)} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">time-sec (초 단위)</p>
                <TimePicker unit="second" value={new Time(14, 30, 45)} />
              </div>
            </div>
          </div>

          {/* 상태 */}
          <div>
            <h3 class="mb-3 text-lg font-bold">상태</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <TimePicker disabled value={new Time(9, 0)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Validation</h2>
        <div class="space-y-6">
          {/* TextInput Validation */}
          <div>
            <h3 class="mb-3 text-lg font-semibold">TextInput</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.currentTarget.reportValidity();
              }}
            >
              <div class="flex flex-col items-start gap-3">
                <TextInput required placeholder="필수 입력" />
                <TextInput required minLength={3} placeholder="최소 3자" />
                <TextInput pattern="^[0-9]+$" placeholder="숫자만 입력" />
                <TextInput
                  validate={(v) => (v.includes("@") ? undefined : "@ 문자가 필요합니다")}
                  placeholder="커스텀 검증"
                />
                <TextInput required touchMode placeholder="touchMode (blur 후 표시)" />
                <NumberInput required min={0} max={100} placeholder="0~100" />
                <Textarea required minLength={10} placeholder="최소 10자" />
                <Button type="submit" theme="primary" variant="solid">
                  Submit
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Controlled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Controlled</h2>
        <div class="space-y-6">
          {/* TextInput Controlled */}
          <div>
            <h3 class="mb-3 text-lg font-bold">TextInput</h3>
            <div class="flex flex-col items-start gap-3">
              <TextInput
                value={controlledText()}
                onValueChange={setControlledText}
                placeholder="값을 입력하세요"
              />
              <p class="text-sm text-base-600 dark:text-base-400">
                현재 값:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledText() ?? "(없음)"}
                </code>
              </p>
              <Button
                theme="primary"
                variant="solid"
                size="sm"
                onClick={() => setControlledText("새로운 값!")}
              >
                값 변경
              </Button>
            </div>
          </div>

          {/* NumberInput Controlled */}
          <div>
            <h3 class="mb-3 text-lg font-bold">NumberInput</h3>
            <div class="flex flex-col items-start gap-3">
              <NumberInput
                value={controlledNumber()}
                onValueChange={setControlledNumber}
                placeholder="숫자를 입력하세요"
              />
              <p class="text-sm text-base-600 dark:text-base-400">
                현재 값:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledNumber() ?? "(없음)"}
                </code>
              </p>
              <div class="flex gap-2">
                <Button
                  theme="primary"
                  variant="solid"
                  size="sm"
                  onClick={() => setControlledNumber((v) => (v ?? 0) + 100)}
                >
                  +100
                </Button>
                <Button
                  theme="primary"
                  variant="solid"
                  size="sm"
                  onClick={() => setControlledNumber((v) => (v ?? 0) - 100)}
                >
                  -100
                </Button>
                <Button variant="solid" size="sm" onClick={() => setControlledNumber(undefined)}>
                  초기화
                </Button>
              </div>
            </div>
          </div>

          {/* Textarea Controlled */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Textarea</h3>
            <div class="flex flex-col items-start gap-3">
              <Textarea
                value={controlledTextArea()}
                onValueChange={setControlledTextArea}
                placeholder="내용을 입력하세요"
                minRows={3}
              />
              <p class="text-sm text-base-600 dark:text-base-400">
                현재 값:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledTextArea() ?? "(없음)"}
                </code>
              </p>
              <Button
                theme="primary"
                variant="solid"
                size="sm"
                onClick={() => setControlledTextArea("프로그래밍으로\n값을 변경했습니다")}
              >
                값 변경
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
