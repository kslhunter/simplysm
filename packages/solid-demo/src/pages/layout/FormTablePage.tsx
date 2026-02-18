import { createSignal } from "solid-js";
import { Button, FormTable, TextInput, NumberInput, Select, Topbar } from "@simplysm/solid";

export default function FormTablePage() {
  const [controlledName, setControlledName] = createSignal("");
  const [controlledSalary, setControlledSalary] = createSignal<number>();

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">FormTable</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 기본 FormTable */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 FormTable</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              FormTable은 라벨-값 형태의 폼을 테이블 레이아웃으로 정렬할 때 사용합니다.
            </p>
            <FormTable>
              <tbody>
                <tr>
                  <th>이름</th>
                  <td>
                    <TextInput placeholder="이름을 입력하세요" />
                  </td>
                </tr>
                <tr>
                  <th>부서</th>
                  <td>
                    <Select
                      placeholder="부서 선택"
                      renderValue={(v: string) => (
                        <>{v === "dev" ? "개발팀" : v === "design" ? "디자인팀" : "마케팅팀"}</>
                      )}
                    >
                      <Select.Item value="dev">개발팀</Select.Item>
                      <Select.Item value="design">디자인팀</Select.Item>
                      <Select.Item value="marketing">마케팅팀</Select.Item>
                    </Select>
                  </td>
                </tr>
                <tr>
                  <th>직급</th>
                  <td>
                    <TextInput placeholder="직급을 입력하세요" />
                  </td>
                </tr>
                <tr>
                  <th>급여</th>
                  <td>
                    <NumberInput placeholder="급여를 입력하세요" />
                  </td>
                </tr>
              </tbody>
            </FormTable>
          </section>

          {/* Colspan */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Colspan 사용</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              colspan을 사용하여 복잡한 레이아웃을 구성할 수 있습니다.
            </p>
            <FormTable>
              <tbody>
                <tr>
                  <th>제목</th>
                  <td colspan="3">
                    <TextInput placeholder="제목을 입력하세요" />
                  </td>
                </tr>
                <tr>
                  <th>카테고리</th>
                  <td>
                    <Select
                      placeholder="선택"
                      renderValue={(v: string) => <>{v === "notice" ? "공지사항" : "뉴스"}</>}
                    >
                      <Select.Item value="notice">공지사항</Select.Item>
                      <Select.Item value="news">뉴스</Select.Item>
                    </Select>
                  </td>
                  <th>작성자</th>
                  <td>
                    <TextInput placeholder="작성자" />
                  </td>
                </tr>
              </tbody>
            </FormTable>
          </section>

          {/* 읽기 전용 정보 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">읽기 전용 정보</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              입력 필드 없이 정보만 표시할 때도 FormTable을 사용할 수 있습니다.
            </p>
            <FormTable>
              <tbody>
                <tr>
                  <th>아이디</th>
                  <td>user123</td>
                </tr>
                <tr>
                  <th>이름</th>
                  <td>홍길동</td>
                </tr>
                <tr>
                  <th>이메일</th>
                  <td>hong@example.com</td>
                </tr>
                <tr>
                  <th>가입일</th>
                  <td>2024-01-15</td>
                </tr>
                <tr>
                  <th>상태</th>
                  <td>
                    <span class="text-success-600 dark:text-success-400">활성</span>
                  </td>
                </tr>
              </tbody>
            </FormTable>
          </section>

          {/* Controlled */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Controlled</h2>
            <div class="space-y-4">
              <FormTable>
                <tbody>
                  <tr>
                    <th>이름</th>
                    <td>
                      <TextInput
                        value={controlledName()}
                        onValueChange={setControlledName}
                        placeholder="이름을 입력하세요"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th>급여</th>
                    <td>
                      <NumberInput
                        value={controlledSalary()}
                        onValueChange={setControlledSalary}
                        placeholder="급여를 입력하세요"
                      />
                    </td>
                  </tr>
                </tbody>
              </FormTable>
              <p class="text-sm text-base-600 dark:text-base-400">
                이름:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledName() || "(없음)"}
                </code>
                {" / "}
                급여:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledSalary() ?? "(없음)"}
                </code>
              </p>
              <div class="flex gap-2">
                <Button
                  theme="primary"
                  variant="solid"
                  size="sm"
                  onClick={() => {
                    setControlledName("홍길동");
                    setControlledSalary(5000000);
                  }}
                >
                  값 채우기
                </Button>
                <Button
                  variant="solid"
                  size="sm"
                  onClick={() => {
                    setControlledName("");
                    setControlledSalary(undefined);
                  }}
                >
                  초기화
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
