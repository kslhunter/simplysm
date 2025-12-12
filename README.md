# SIMPLYSM

## 의존성

- Angular 20.x
- Typescript 5.8.x
- Node 20.x

## 주요 업데이트

### 12.15.x > 12.16.x

- 앤간한 오류는 eslint일것임. `eslint --fix "**/+(*.ts|*.js|*.html)"`로 대부분 고쳐짐
- 그외, FontAwesome을 안쓰는것으로 업데이트됨
  - ng-icons를 사용할 것이며, sd-angular는 "@ng-icons/tabler-icons"를
    사용함 ([링크](https://ng-icons.github.io/ng-icons/#/browse-icons?iconset=tablerTools))
  - tabler아닌 다른 아이콘 사용가능.
  - 물론 이미 쓰고있는 FontAwesome계속 써도됨.
    - sd-angular의 컨트롤의 \[icon\] attrigute에 넣던 것만 수정하면됨.

### 12.14.x > 12.15.x

- sd-dock-container, sd-dock 컨트롤 되 살림
- sd-flex, sd-form-\*, sd-grid, sd-card, sd-pane, sd-table등 layout관련 컨트롤(디렉티브) 변화
  - 왠간하면 태그/속성/클래스 방식으로 사용가능
  - Control이던게 Directive로 변경된 것들이 있음 (사용법은 같으나 import가 달라짐)
- ESLINT에 sd-컨트롤 attribute관련 규칙추가
  - FIX가 존재하므로, Webstorm에서 ALT+Enter로 fix current file하시는걸 추천함
  - `eslint --fix "**/+(*.ts|*.js|*.html)"` 이런식으로 fix 가능
