import { Button, List, ListItem, Topbar, TopbarContainer } from "@simplysm/solid";
import { IconCheck, IconStarFilled } from "@tabler/icons-solidjs";
import { createSignal, For } from "solid-js";
import { atoms, themeVars, tokenVars } from "@simplysm/solid/styles";

export default function ListPage() {
  const [favoriteItems, setFavoriteItems] = createSignal<string[]>(["item2"]);
  const [openAccordion, setOpenAccordion] = createSignal<string | null>(null);

  const toggleFavorite = (item: string) => {
    setFavoriteItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>List</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
        <h2>List Demo</h2>

        <h3>Basic List</h3>
        <div style={{ width: "300px" }}>
          <List>
            <ListItem>항목 1</ListItem>
            <ListItem>항목 2</ListItem>
            <ListItem>항목 3</ListItem>
          </List>
        </div>

        <h3>Selected State</h3>
        <div style={{ width: "300px" }}>
          <List>
            <ListItem style={{ "justify-content": "flex-start", "align-items": "center" }}>
              일반 항목
            </ListItem>
            <ListItem selected>선택 항목</ListItem>
            <ListItem>일반 항목</ListItem>
          </List>
        </div>

        <h3>With Selected Icon (Check Icon)</h3>
        <div style={{ width: "300px" }}>
          <List>
            <ListItem selectedIcon={IconCheck}>미선택 항목</ListItem>
            <ListItem selectedIcon={IconCheck} selected>
              선택된 항목
            </ListItem>
            <ListItem selectedIcon={IconCheck}>미선택 항목</ListItem>
          </List>
        </div>

        <h3>With Selected Icon (Star Icon)</h3>
        <div style={{ width: "300px" }}>
          <List>
            <ListItem selectedIcon={IconStarFilled}>일반</ListItem>
            <ListItem selectedIcon={IconStarFilled} selected>
              즐겨찾기
            </ListItem>
            <ListItem selectedIcon={IconStarFilled}>일반</ListItem>
          </List>
        </div>

        <h3>Disabled State</h3>
        <div style={{ width: "300px" }}>
          <List>
            <ListItem>활성 항목</ListItem>
            <ListItem disabled>비활성 항목</ListItem>
            <ListItem>활성 항목</ListItem>
          </List>
        </div>

        <h3>Inset List</h3>
        <div style={{ width: "300px", border: `1px solid rgb(${themeVars.border.base})` }}>
          <List inset>
            <ListItem>Inset 항목 1</ListItem>
            <ListItem>Inset 항목 2</ListItem>
            <ListItem>Inset 항목 3</ListItem>
          </List>
        </div>

        <h3>Accordion Layout (Nested)</h3>
        <div style={{ width: "300px" }}>
          <List>
            <ListItem>
              폴더 1
              <List>
                <ListItem>파일 1-1</ListItem>
                <ListItem>파일 1-2</ListItem>
              </List>
            </ListItem>
            <ListItem>
              폴더 2
              <List>
                <ListItem>파일 2-1</ListItem>
                <ListItem>
                  하위 폴더
                  <List>
                    <ListItem>파일 2-2-1</ListItem>
                  </List>
                </ListItem>
              </List>
            </ListItem>
            <ListItem>파일 3</ListItem>
          </List>
        </div>

        <h3>Flat Layout (Nested)</h3>
        <div style={{ width: "300px" }}>
          <List>
            <ListItem layout="flat">
              카테고리 A
              <List>
                <ListItem>항목 A-1</ListItem>
                <ListItem>항목 A-2</ListItem>
              </List>
            </ListItem>
            <ListItem layout="flat">
              카테고리 B
              <List>
                <ListItem>항목 B-1</ListItem>
                <ListItem>항목 B-2</ListItem>
                <ListItem>항목 B-3</ListItem>
              </List>
            </ListItem>
          </List>
        </div>

        <h3>[Example] Tool</h3>
        <div style={{ width: "300px" }}>
          <List>
            <ListItem class={atoms({ display: "flex", gap: "xs" })}>
              <div style={{ flex: 1 }}>편집 가능한 항목</div>
              <Button size="sm">편집</Button>
            </ListItem>
            <ListItem class={atoms({ display: "flex", gap: "xs" })}>
              <div style={{ flex: 1 }}>삭제 가능한 항목</div>
              <Button theme="danger" size="sm">
                삭제
              </Button>
            </ListItem>
            <ListItem class={atoms({ display: "flex", gap: "xs" })}>
              <div style={{ flex: 1 }}>여러 도구</div>
              <Button size="sm">수정</Button>
              <Button theme="danger" size="sm">
                삭제
              </Button>
            </ListItem>
          </List>
        </div>

        <h3>[Example] Favorite Interactive</h3>
        <p
          class={atoms({ mb: "sm" })}
          style={{
            "font-size": tokenVars.font.size.sm,
            "color": `rgb(${themeVars.text.muted})`,
          }}
        >
          즐겨찾기: {favoriteItems().join(", ") || "없음"}
        </p>
        <div style={{ width: "300px" }}>
          <List>
            <For each={["item1", "item2", "item3"]}>
              {(item) => (
                <ListItem
                  selectedIcon={IconStarFilled}
                  selected={favoriteItems().includes(item)}
                  onClick={() => toggleFavorite(item)}
                >
                  {item}
                </ListItem>
              )}
            </For>
          </List>
        </div>

        <h3>[Example] Accordion Open Interactive</h3>
        <p
          class={atoms({ mb: "sm" })}
          style={{
            "font-size": tokenVars.font.size.sm,
            "color": `rgb(${themeVars.text.muted})`,
          }}
        >
          열린 섹션: {openAccordion() ?? "없음"}
        </p>
        <div style={{ width: "300px" }}>
          <List>
            <For each={["section1", "section2", "section3"]}>
              {(id) => (
                <ListItem
                  layout="accordion"
                  open={openAccordion() === id}
                  onOpenChange={(open) => {
                    if (open) {
                      setOpenAccordion(id);
                    } else if (openAccordion() === id) {
                      setOpenAccordion(null);
                    }
                  }}
                >
                  {id}
                  <List>
                    <ListItem>하위 항목 1</ListItem>
                    <ListItem>하위 항목 2</ListItem>
                  </List>
                </ListItem>
              )}
            </For>
          </List>
        </div>
      </div>
    </TopbarContainer>
  );
}
