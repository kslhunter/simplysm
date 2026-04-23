← [CRUD 상세폼 레시피 진입점](../crud-detail.md)

# 확장 E: 보조 기능 영역

> **선행:** [확장 A: 편집/저장](./extension-a-edit-save.md)

확장 A(편집/저장)를 전제로, 메인 폼의 submit과 **별개인 보조 기능**(예: 다른 사용자로부터 권한 복사, 출력, 엑셀 다운로드 등)을 추가한다. 과거 `#toolTpl` 슬롯이 담당하던 역할을 소비 화면에 직접 인라인한다. 보조 영역은 control 뷰 상단 `<sd-dock>` 내부 / modal 뷰 하단 바 옆 / main 영역 내 별도 `<sd-form>` 중 하나에 배치한다. 뷰별 UI 배치 본문은 [확장 C](./extension-c-modal-view.md) / [확장 D](./extension-d-control-view.md)에서 처리한다.

**이 확장이 도입하는 요소:**

- **imports:** `SdSharedDataSelect` (`@simplysm/angular`), 앱 공용 `useSharedSignal` (예: `@adtek/client-common` — `SdSharedDataProvider` 위에 각 앱이 정의하는 공용 훅)
- **상태:** 예시 — `permCopySourceId = signal<number | undefined>(undefined)`, `sharedUsers = useSharedSignal("사용자")`
- **메서드:** 예시 — `onImportFormSubmit` (권한·busy 가드 + 메인 폼 변경 보호 호출 + 앱별 ORM 조회·병합)
- **템플릿 추가:** 보조 `<sd-form (formSubmit)="onImportFormSubmit()">` 블록을 배치(아래 예시는 control 뷰 `<sd-dock>` 내부). 메인 `<sd-form #formCtrl>`과 **별도** 인스턴스
- **공유 데이터 대기:** 본 확장이 `useSharedSignal`을 도입하므로 `_refresh()` 선두에 `await this._sdSharedData.wait();`가 필요해진다 → [공통 규칙: `_sdSharedData.wait()`](../_common-rules.md#공유-데이터-사용-화면은-_refresh-선두에서-_sdshareddatawait를-호출한다)

> 상세: [`<sd-shared-data-select>`](../../ui-form/sd-shared-data-select.md)

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 선행 확장(A) 위에 번호 순서대로 삽입할 지점을 나타낸다. 그대로 컴파일되지 않는다.

```typescript
// 1) imports 추가
import { SdSharedDataSelect } from "@simplysm/angular";
// 앱 공용 훅 — @simplysm/angular 소유 아님. 각 앱이 SdSharedDataProvider 위에 정의.
import { useSharedSignal } from "@adtek/client-common";

// 2) 클래스에 상태 추가
protected readonly permCopySourceId = signal<number | undefined>(undefined);
protected readonly sharedUsers = useSharedSignal("사용자");

// 3) template — 보조 form 블록을 배치한다. 아래는 control 뷰 <sd-dock>(상단 바) 내부 예시.
//    modal 뷰는 하단 바(<sd-dock [position]="'bottom'">) 옆, main 영역은 메인 form 옆이나 아래에 배치할 수 있다.
@if (viewType() === "control" && canEdit()) {
  <sd-dock class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
    <!-- 기본 저장/삭제 버튼 (확장 D) -->
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
  // 메인 폼의 미저장 변경사항 보호 — 확장 A가 제공하는 _checkIgnoreChanges() 재호출
  if (!this._checkIgnoreChanges()) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 앱별 서버 호출로 다른 사용자의 데이터를 조회·병합 — 예:
    //   const src = await this._appOrm.connectAsync(async (db) =>
    //     (await db.customer.where((it) => [expr.eq(it.id, this.permCopySourceId())]).single())!
    //   );
    //   this.data.set({ ...this.data(), ...src });
  });
  this.busyCount.update((v) => v - 1);
}
```

**포인트:**

- **보조 `<sd-form>`은 메인 `<sd-form #formCtrl>`과 별도 인스턴스**다. `SdCommandDirective.sdSaveCommand` → `formCtrl()?.requestSubmit()` 경로는 메인 form 한 곳에만 연결된다(확장 A). 보조 form의 submit 버튼은 Ctrl+S와 연동되지 않고 버튼 클릭(또는 submit 버튼에서 Enter 제출)만 발동한다. 보조 form에는 `#formCtrl` template 변수를 부여하지 않는다.
- **보조 작업 전에도 `_checkIgnoreChanges()`를 호출**하여 메인 폼의 미저장 변경사항을 보호한다. 보조 form이 메인 `data()`를 덮어쓰는 경우(권한 복사 등) 필수. `_checkIgnoreChanges`는 확장 A가 제공하므로 재정의하지 않는다.
- **공유 데이터 도입으로 `_refresh()` 선두에 `await this._sdSharedData.wait();`가 필요해진다.** 판정 기준·코드 예시는 [공통 규칙: `_sdSharedData.wait()`](../_common-rules.md#공유-데이터-사용-화면은-_refresh-선두에서-_sdshareddatawait를-호출한다) 참조.
- **`<sd-shared-data-select>`에 `[inset]="true" [size]="'sm'"`을 명시**한다. `<sd-dock>` 도구 바 내부 치수와 `form-box-inline` 간격이 sm 기준으로 정합하므로 인셋·사이즈를 생략하면 컨트롤 높이가 들쭉날쭉해진다.
- **배치 위치 선택:** control 뷰는 상단 `<sd-dock>` 안, modal 뷰는 하단 바(`<sd-dock [position]="'bottom'">`) 옆, main 영역에서는 메인 form과 나란한 별도 블록. 뷰 분기 본문 UI는 [확장 C](./extension-c-modal-view.md) / [확장 D](./extension-d-control-view.md)에서 정의한다.
- **읽기 전용 보조(출력·엑셀 다운로드 등)는 `<sd-form>` 래핑 없이 버튼 `(click)`으로 직접 처리 가능**하다. 입력 값을 수집하지 않는 단일 액션은 form submit 절차가 불필요하다. 이 경우 `_checkIgnoreChanges()` 호출도 상황에 맞게 판단한다(읽기 전용이라 메인 변경 보호가 불필요할 수 있음).
- **`useSharedSignal`은 `@simplysm/angular` 제공이 아님** — `SdSharedDataProvider`(`packages/angular/src/core/shared-data/sd-shared-data.provider.ts`) 위에서 각 앱이 정의하는 공용 훅이다. 배포 패키지 소속이 다르므로 import 경로 혼동에 주의한다.
