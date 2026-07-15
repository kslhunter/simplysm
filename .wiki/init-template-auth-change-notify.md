---
summary: sd-cli init 템플릿에서 사용자 인증 데이터(역할·로그인ID·비번·삭제/복구)를 편집하는 코드를 고치거나 새 편집 경로를 추가할 때, 인증정보 변경 통지를 어디에 붙일지.
title: init 템플릿 인증정보 변경 통지는 편집 함수가 책임진다
---

# init 템플릿 인증정보 변경 통지는 편집 함수가 책임진다

`sd-cli init`(role:Y, client:Y) 템플릿에서 사용자의 인증 관련 데이터(roleId·loginId·비밀번호·isDeleted)를 바꾸면, 그 사용자 활성 세션이 `AuthInfoChangedEvent` 통지를 받아 authInfo·권한을 재로드해야 한다. 통지를 빠뜨리면 세션이 재로그인 전까지 옛 권한을 유지하는 silent 결함이 된다.

## 원칙: 편집하는 함수가 통지한다

통지 책임은 **DB 를 편집하는 그 함수**에 둔다. 편집 위치를 옮기지 않고, 편집이 일어나는 자리에서 그대로 통지한다.

- 서버가 편집하면 서버가 통지: `ctx.server.emitEvent(AuthInfoChangedEvent, (info) => info.{{userEntityCamel}}Id === id, undefined)`.
- 클라가 직접 ORM 으로 편집하면 그 화면 함수가 통지: `this._appService.authInfoChangedEvent.emit((info) => ids.includes(info.{{userEntityCamel}}Id), undefined)`.

통지가 서버·클라에 혼재해도 규칙은 일관된다. 이 방식이 "클라(화면)가 통지 책임"보다 나은 이유: 편집과 통지가 한 함수라 "편집했는데 통지를 잊음"이 구조적으로 불가능하다. 화면 책임으로 두면 같은 편집 서비스를 부르는 화면이 늘 때마다 emit 을 따로 챙겨야 해 누락이 상시 발생한다.

## 편집 지점 (통지가 붙어야 하는 곳)

- 저장: `server/services/user.service.save` — 상세 단건(`user.detail.onSubmit`)과 엑셀 다건 업로드(`user.list.onUploadExcelButtonClick`)가 모두 이 서버 함수를 지나므로, 서버 한 곳 통지로 두 경로를 커버한다. 저장 통지를 화면으로 내리면 엑셀 경로가 누락된다.
- 삭제·복구: `user.detail`·`user.list` 의 `onDelete`/`onRestore` — 각각 클라에서 직접 ORM `update({ isDeleted })` 하므로, 네 함수가 각자 통지한다.

## 필터 필드·전제

- 이벤트 정의: `common/auth-info-changed.event.ts` = `defineEvent<{ {{userEntityCamel}}Id, roleId }, void>`.
- 세션 리스너는 `app-auth.provider._registerAuthEvent` 에서 `{ {{userEntityCamel}}Id, roleId }` 로 등록된다. roleId 는 저장으로 바뀔 수 있으므로 타겟 필터는 항상 `{{userEntityCamel}}Id`(userId) 를 쓴다 — roleId 필터는 역할 재배정 세션을 놓친다.
- 삭제 통지는 refresh 조회의 `isDeleted=false` 가드(auth.service.login·refresh)와 결합해야 삭제 계정 세션이 자동 로그아웃으로 귀결된다. 가드가 없으면 통지해도 삭제 계정이 재로드에 성공한다.
