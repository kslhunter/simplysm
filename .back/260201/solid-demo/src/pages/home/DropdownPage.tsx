import { createSignal } from "solid-js";
import {
  Button,
  Dropdown,
  DropdownPopup,
  List,
  ListItem,
  Topbar,
  TopbarContainer,
} from "@simplysm/solid";
import { atoms } from "@simplysm/solid/styles";

export default function DropdownPage() {
  const [controlled, setControlled] = createSignal(false);

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>Dropdown</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
        <h2>Dropdown Demo</h2>

        <section>
          <h3>Basic</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            기본 드롭다운입니다. 클릭하거나 Space/ArrowDown 키로 열 수 있습니다.
          </p>
          <div class={atoms({ display: "flex", gap: "base", flexWrap: "wrap" })}>
            <Dropdown>
              <Button>메뉴 열기</Button>
              <DropdownPopup>
                <List>
                  <ListItem onClick={() => alert("옵션 1")}>옵션 1</ListItem>
                  <ListItem onClick={() => alert("옵션 2")}>옵션 2</ListItem>
                  <ListItem onClick={() => alert("옵션 3")}>옵션 3</ListItem>
                </List>
              </DropdownPopup>
            </Dropdown>

            <Dropdown disabled>
              <Button>비활성화</Button>
              <DropdownPopup>
                <List>
                  <ListItem>이건 열리지 않음</ListItem>
                </List>
              </DropdownPopup>
            </Dropdown>
          </div>
        </section>

        <section>
          <h3>Controlled Mode</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            외부에서 open 상태를 제어합니다. 현재 상태: {controlled() ? "열림" : "닫힘"}
          </p>
          <div class={atoms({ display: "flex", gap: "base", flexWrap: "wrap" })}>
            <Button onClick={() => setControlled(!controlled())}>
              {controlled() ? "닫기" : "열기"}
            </Button>

            <Dropdown open={controlled()} onOpenChange={setControlled}>
              <Button theme="primary">Controlled Dropdown</Button>
              <DropdownPopup>
                <List>
                  <ListItem onClick={() => setControlled(false)}>닫기</ListItem>
                  <ListItem onClick={() => alert("작업 실행")}>작업 실행</ListItem>
                </List>
              </DropdownPopup>
            </Dropdown>
          </div>
        </section>

        <section>
          <h3>Position Auto-Adjustment</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            뷰포트 위치에 따라 팝업이 상/하, 좌/우로 자동 배치됩니다.
          </p>
          <div
            class={atoms({
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "base",
            })}
          >
            <Dropdown>
              <Button>왼쪽 상단</Button>
              <DropdownPopup>
                <List>
                  <ListItem>아이템 1</ListItem>
                  <ListItem>아이템 2</ListItem>
                  <ListItem>아이템 3</ListItem>
                </List>
              </DropdownPopup>
            </Dropdown>

            <Dropdown>
              <Button>오른쪽 상단</Button>
              <DropdownPopup>
                <List>
                  <ListItem>아이템 1</ListItem>
                  <ListItem>아이템 2</ListItem>
                  <ListItem>아이템 3</ListItem>
                </List>
              </DropdownPopup>
            </Dropdown>
          </div>
        </section>

        <section>
          <h3>Nested Dropdown</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            중첩된 드롭다운입니다. 자식 드롭다운이 닫혀도 부모는 유지됩니다.
          </p>
          <Dropdown>
            <Button theme="primary">메인 메뉴</Button>
            <DropdownPopup>
              <List>
                <ListItem onClick={() => alert("메뉴 1")}>메뉴 1</ListItem>
                <ListItem>
                  <Dropdown>
                    <span>서브메뉴 열기 →</span>
                    <DropdownPopup>
                      <List>
                        <ListItem onClick={() => alert("서브 1")}>서브 아이템 1</ListItem>
                        <ListItem onClick={() => alert("서브 2")}>서브 아이템 2</ListItem>
                        <ListItem onClick={() => alert("서브 3")}>서브 아이템 3</ListItem>
                      </List>
                    </DropdownPopup>
                  </Dropdown>
                </ListItem>
                <ListItem onClick={() => alert("메뉴 3")}>메뉴 3</ListItem>
              </List>
            </DropdownPopup>
          </Dropdown>
        </section>

        <section>
          <h3>Keyboard Navigation</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>키보드 단축키:</p>
          <ul class={atoms({ mb: "lg", color: "muted" })}>
            <li>
              <kbd>ArrowDown</kbd>: 팝업 열기 / 첫 요소로 포커스
            </li>
            <li>
              <kbd>ArrowUp</kbd>: 팝업 닫기
            </li>
            <li>
              <kbd>Space</kbd>: 토글
            </li>
            <li>
              <kbd>Escape</kbd>: 닫기
            </li>
          </ul>
          <Dropdown>
            <Button>키보드로 조작해보세요</Button>
            <DropdownPopup>
              <List>
                <ListItem>포커스 가능 1</ListItem>
                <ListItem>포커스 가능 2</ListItem>
                <ListItem>포커스 가능 3</ListItem>
              </List>
            </DropdownPopup>
          </Dropdown>
        </section>

        <section>
          <h3>Many Dropdowns (Performance Test)</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            100개의 드롭다운입니다. 이벤트 리스너는 팝업이 열릴 때만 등록됩니다.
          </p>
          <div class={atoms({ display: "flex", gap: "xs", flexWrap: "wrap" })}>
            {Array.from({ length: 100 }, (_, i) => (
              <Dropdown>
                <Button size="xs">{i + 1}</Button>
                <DropdownPopup>
                  <div class={atoms({ p: "base" })}>Dropdown #{i + 1}</div>
                </DropdownPopup>
              </Dropdown>
            ))}
          </div>
        </section>

        <section>
          <h3>Bottom Position Test</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            화면 하단에서 열면 팝업이 위로 배치됩니다.
          </p>
          <div
            class={atoms({
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "base",
            })}
          >
            <Dropdown>
              <Button>왼쪽 하단</Button>
              <DropdownPopup>
                <List>
                  <ListItem>위로 배치됨 1</ListItem>
                  <ListItem>위로 배치됨 2</ListItem>
                  <ListItem>위로 배치됨 3</ListItem>
                </List>
              </DropdownPopup>
            </Dropdown>

            <Dropdown>
              <Button>오른쪽 하단</Button>
              <DropdownPopup>
                <List>
                  <ListItem>위로 배치됨 1</ListItem>
                  <ListItem>위로 배치됨 2</ListItem>
                  <ListItem>위로 배치됨 3</ListItem>
                </List>
              </DropdownPopup>
            </Dropdown>
          </div>
        </section>
      </div>
    </TopbarContainer>
  );
}
