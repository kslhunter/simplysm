import { createSignal } from "solid-js";
import { FormTable, TextField, NumberField, Select, Topbar, TopbarContainer } from "@simplysm/solid";

const thClass = "border border-base-300 bg-base-100 px-3 py-2 text-left font-semibold dark:border-base-600 dark:bg-base-700";
const tdClass = "border border-base-300 px-3 py-2 dark:border-base-600";

export default function FormTablePage() {
  const [name, setName] = createSignal("");
  const [department, setDepartment] = createSignal<string>();
  const [position, setPosition] = createSignal("");
  const [salary, setSalary] = createSignal<number>();

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">FormTable</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Basic FormTable */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 FormTable</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              FormTable은 라벨-값 형태의 폼을 테이블 레이아웃으로 구성할 때 사용합니다.
            </p>
            <FormTable class="max-w-lg">
              <tbody>
                <tr>
                  <th class={thClass}>이름</th>
                  <td class={tdClass}>
                    <TextField value={name()} onValueChange={setName} placeholder="이름을 입력하세요" class="w-full" />
                  </td>
                </tr>
                <tr>
                  <th class={thClass}>부서</th>
                  <td class={tdClass}>
                    <Select
                      value={department()}
                      onValueChange={setDepartment}
                      placeholder="부서 선택"
                      class="w-full"
                      renderValue={(v) => <>{v === "dev" ? "개발팀" : v === "design" ? "디자인팀" : "마케팅팀"}</>}
                    >
                      <Select.Item value="dev">개발팀</Select.Item>
                      <Select.Item value="design">디자인팀</Select.Item>
                      <Select.Item value="marketing">마케팅팀</Select.Item>
                    </Select>
                  </td>
                </tr>
                <tr>
                  <th class={thClass}>직급</th>
                  <td class={tdClass}>
                    <TextField value={position()} onValueChange={setPosition} placeholder="직급을 입력하세요" class="w-full" />
                  </td>
                </tr>
                <tr>
                  <th class={thClass}>급여</th>
                  <td class={tdClass}>
                    <NumberField value={salary()} onValueChange={setSalary} placeholder="급여를 입력하세요" class="w-full" />
                  </td>
                </tr>
              </tbody>
            </FormTable>
          </section>

          {/* With Colspan */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Colspan 사용</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              colspan을 사용하여 복잡한 레이아웃을 구성할 수 있습니다.
            </p>
            <FormTable class="w-full max-w-2xl">
              <tbody>
                <tr>
                  <th class={thClass} style={{ width: "120px" }}>제목</th>
                  <td class={tdClass} colspan="3">
                    <TextField placeholder="제목을 입력하세요" class="w-full" />
                  </td>
                </tr>
                <tr>
                  <th class={thClass}>카테고리</th>
                  <td class={tdClass}>
                    <Select
                      placeholder="선택"
                      class="w-full"
                      renderValue={(v: string) => <>{v === "notice" ? "공지사항" : "뉴스"}</>}
                    >
                      <Select.Item value="notice">공지사항</Select.Item>
                      <Select.Item value="news">뉴스</Select.Item>
                    </Select>
                  </td>
                  <th class={thClass} style={{ width: "100px" }}>작성자</th>
                  <td class={tdClass}>
                    <TextField placeholder="작성자" class="w-full" />
                  </td>
                </tr>
                <tr>
                  <th class={thClass}>내용</th>
                  <td class={tdClass} colspan="3">
                    <textarea
                      class="w-full rounded border border-base-300 p-2 dark:border-base-600 dark:bg-base-800"
                      rows="4"
                      placeholder="내용을 입력하세요"
                    />
                  </td>
                </tr>
              </tbody>
            </FormTable>
          </section>

          {/* Read-only Info */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">읽기 전용 정보</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              입력 필드 없이 정보만 표시할 때도 FormTable을 사용할 수 있습니다.
            </p>
            <FormTable class="max-w-md">
              <tbody>
                <tr>
                  <th class={thClass} style={{ width: "100px" }}>아이디</th>
                  <td class={tdClass}>user123</td>
                </tr>
                <tr>
                  <th class={thClass}>이름</th>
                  <td class={tdClass}>홍길동</td>
                </tr>
                <tr>
                  <th class={thClass}>이메일</th>
                  <td class={tdClass}>hong@example.com</td>
                </tr>
                <tr>
                  <th class={thClass}>가입일</th>
                  <td class={tdClass}>2024-01-15</td>
                </tr>
                <tr>
                  <th class={thClass}>상태</th>
                  <td class={tdClass}>
                    <span class="text-success-600 dark:text-success-400">활성</span>
                  </td>
                </tr>
              </tbody>
            </FormTable>
          </section>

          {/* With Header */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">헤더가 있는 FormTable</h2>
            <FormTable class="w-full max-w-lg">
              <thead>
                <tr>
                  <th class={thClass} colspan="2">기본 정보</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th class={thClass} style={{ width: "120px" }}>회사명</th>
                  <td class={tdClass}>SIMPLYSM</td>
                </tr>
                <tr>
                  <th class={thClass}>설립일</th>
                  <td class={tdClass}>2020-01-01</td>
                </tr>
              </tbody>
              <thead>
                <tr>
                  <th class={thClass} colspan="2">연락처</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th class={thClass}>전화번호</th>
                  <td class={tdClass}>02-1234-5678</td>
                </tr>
                <tr>
                  <th class={thClass}>이메일</th>
                  <td class={tdClass}>contact@simplysm.com</td>
                </tr>
              </tbody>
            </FormTable>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
