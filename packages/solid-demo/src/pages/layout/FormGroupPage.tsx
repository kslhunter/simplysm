import { createSignal } from "solid-js";
import { FormGroup, TextField, NumberField, Select, Button, Topbar, TopbarContainer } from "@simplysm/solid";

export default function FormGroupPage() {
  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [age, setAge] = createSignal<number>();
  const [country, setCountry] = createSignal<string>();

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">FormGroup</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Basic FormGroup */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 FormGroup</h2>
            <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
              FormGroup은 폼 필드들을 수직으로 배치하는 컨테이너입니다. FormGroup.Item으로 각 필드를 감쌉니다.
            </p>
            <div class="max-w-md">
              <FormGroup>
                <FormGroup.Item label="이름">
                  <TextField value={name()} onValueChange={setName} placeholder="이름을 입력하세요" />
                </FormGroup.Item>
                <FormGroup.Item label="이메일">
                  <TextField value={email()} onValueChange={setEmail} placeholder="이메일을 입력하세요" />
                </FormGroup.Item>
                <FormGroup.Item label="나이">
                  <NumberField value={age()} onValueChange={setAge} placeholder="나이를 입력하세요" />
                </FormGroup.Item>
              </FormGroup>
            </div>
          </section>

          {/* Inline FormGroup */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Inline FormGroup</h2>
            <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
              inline prop을 사용하면 필드들이 수평으로 배치됩니다.
            </p>
            <FormGroup inline>
              <FormGroup.Item label="국가">
                <Select
                  value={country()}
                  onValueChange={setCountry}
                  placeholder="선택하세요"
                  renderValue={(v) => <>{v === "kr" ? "한국" : v === "us" ? "미국" : "일본"}</>}
                >
                  <Select.Item value="kr">한국</Select.Item>
                  <Select.Item value="us">미국</Select.Item>
                  <Select.Item value="jp">일본</Select.Item>
                </Select>
              </FormGroup.Item>
              <FormGroup.Item>
                <Button theme="primary" variant="solid">
                  검색
                </Button>
              </FormGroup.Item>
            </FormGroup>
          </section>

          {/* Without Labels */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">라벨 없이</h2>
            <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
              FormGroup.Item의 label을 생략하면 라벨 없이 필드만 표시됩니다.
            </p>
            <div class="max-w-md">
              <FormGroup>
                <FormGroup.Item>
                  <TextField placeholder="제목" />
                </FormGroup.Item>
                <FormGroup.Item>
                  <TextField placeholder="내용" />
                </FormGroup.Item>
                <FormGroup.Item>
                  <Button theme="primary" variant="solid" class="w-full">
                    저장
                  </Button>
                </FormGroup.Item>
              </FormGroup>
            </div>
          </section>

          {/* Mixed Layout */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">혼합 레이아웃</h2>
            <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
              FormGroup을 중첩하여 복잡한 폼 레이아웃을 구성할 수 있습니다.
            </p>
            <div class="max-w-lg">
              <FormGroup>
                <FormGroup.Item label="기본 정보">
                  <FormGroup inline>
                    <FormGroup.Item>
                      <TextField placeholder="성" class="w-32" />
                    </FormGroup.Item>
                    <FormGroup.Item>
                      <TextField placeholder="이름" class="w-32" />
                    </FormGroup.Item>
                  </FormGroup>
                </FormGroup.Item>
                <FormGroup.Item label="연락처">
                  <TextField placeholder="전화번호" />
                </FormGroup.Item>
                <FormGroup.Item label="주소">
                  <FormGroup>
                    <FormGroup.Item>
                      <TextField placeholder="우편번호" class="w-32" />
                    </FormGroup.Item>
                    <FormGroup.Item>
                      <TextField placeholder="상세주소" />
                    </FormGroup.Item>
                  </FormGroup>
                </FormGroup.Item>
              </FormGroup>
            </div>
          </section>

          {/* With Validation Message */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">검증 메시지와 함께</h2>
            <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
              FormGroup.Item 내에서 검증 메시지를 표시할 수 있습니다.
            </p>
            <div class="max-w-md">
              <FormGroup>
                <FormGroup.Item label="필수 입력">
                  <TextField placeholder="필수 항목입니다" />
                  <p class="mt-1 text-sm text-danger-500">이 필드는 필수입니다.</p>
                </FormGroup.Item>
                <FormGroup.Item label="선택 입력">
                  <TextField placeholder="선택 항목입니다" />
                  <p class="mt-1 text-sm text-slate-500">선택적으로 입력할 수 있습니다.</p>
                </FormGroup.Item>
              </FormGroup>
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
