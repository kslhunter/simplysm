← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 E: 보조 기능 영역

> **선행:** [확장 A: 편집/저장](./extension-a-edit-save.md)

확장 A(편집/저장)를 전제로, 메인 폼의 submit과 **별개인 보조 기능**(예: 다른 사용자로부터 권한 복사, 출력 등)을 추가한다. 과거 `#toolTpl` 슬롯이 담당하던 역할을 소비 화면에 직접 인라인한다. 보조 영역은 control 뷰 상단 바 내부, modal 뷰 하단 바 옆, 또는 main 영역 내부에 별도의 `<sd-form>`으로 배치할 수 있다.

**이 확장이 도입하는 요소:**

- **imports:** `SdSharedDataSelect` + 앱 공용 `useSharedSignal`(앱 공유 데이터 훅)
- **상태:** 예시 — `permCopySourceId = signal<number | undefined>(undefined)`, `sharedUsers = useSharedSignal("사용자")`
- **메서드:** 예시 — `onImportFormSubmit`
- **템플릿 추가:** control 뷰 `<sd-dock>` 내부 또는 main 영역에 보조 `<sd-form (formSubmit)>` 블록 (메인 `<sd-form #formCtrl>`과 별도)

> 상세: [`<sd-shared-data-select>`](../../ui-form/sd-shared-data-select.md)

```typescript
// 1) imports 추가
import { SdSharedDataSelect } from "@simplysm/angular";
// 앱 공용:
import { useSharedSignal } from "@adtek/client-common";

// 2) 클래스에 필드 추가
protected readonly permCopySourceId = signal<number | undefined>(undefined);
protected readonly sharedUsers = useSharedSignal("사용자");  // 앱 공용 provider

// 3) template — control 뷰의 <sd-dock>(상단 바) 내부, 또는 main 영역에 보조 form을 인라인한다.
//    아래는 control 뷰 분기 안에서 저장/새로고침/삭제 버튼과 같은 <sd-dock> 안에 추가하는 예시.
@if (viewType() === "control" && canEdit()) {
  <sd-dock class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
    <!-- 기본 저장/새로고침/삭제 버튼 (확장 D) -->
    <!-- ... -->

    <!-- 보조 기능: 다른 사용자로부터 가져오기 -->
    <sd-form (formSubmit)="onImportFormSubmit()">
      <div class="form-box-inline">
        <div class="form-box-item">
          <label>가져오기</label>
          <sd-shared-data-select
            [items]="sharedUsers.items()"
            [(value)]="permCopySourceId"
            [inset]="true"
            [size]="'sm'"
          />
        </div>
        <div class="form-box-item">
          <sd-button [type]="'submit'" [disabled]="permCopySourceId() == null">
            가져오기
          </sd-button>
        </div>
      </div>
    </sd-form>
  </sd-dock>
}

// 4) 메서드 추가
protected async onImportFormSubmit(): Promise<void> {
  if (this.busyCount() > 0 || !this.perms().includes("edit")) return;
  if (this.permCopySourceId() == null) return;
  if (!this._checkIgnoreChanges()) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 서버 호출로 다른 사용자의 데이터를 조회 — 예:
    //   const src = await this._api.fetchByIdAsync(this.permCopySourceId()!);
    //   this.data.set({ ...this.data(), ...src });
  });
  this.busyCount.update((v) => v - 1);
}
```

**포인트:**

- 보조 `<sd-form>`과 메인 `<sd-form #formCtrl>`은 **별도의 form**이다. 보조 form의 submit 버튼은 Ctrl+S와 연동되지 않는다(`SdCommandDirective`의 `sdSaveCommand`는 메인 `formCtrl`의 `requestSubmit()`에만 연결).
- 보조 form의 작업 후에도 `_checkIgnoreChanges()`를 호출하여 메인 폼의 미저장 변경사항을 보호한다.
- 출력·엑셀 다운로드 같은 read-only 보조 기능은 `formSubmit` 대신 버튼의 `(click)`으로 처리 가능. 이 경우 `<sd-form>` 래핑은 생략한다.
