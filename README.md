# SIMPLYSM

## 의존성

* Angular 20.x
* Typescript 5.8.x
* Node 20.x


## 주요 업데이트

### 12.14.x > 12.15.x

* sd-dock-container, sd-dock 컨트롤 되 살림
* sd-flex, sd-form-*, sd-grid, sd-card, sd-pane, sd-table등 layout관련 컨트롤(디렉티브) 변화
  * 왠간하면 태그/속성/클래스 방식으로 사용가능
  * Control이던게 Directive로 변경된 것들이 있음 (사용법은 같으나 import가 달라짐)
* ESLINT에 sd-컨트롤 attribute관련 규칙추가
  * FIX가 존재하므로, Webstorm에서 ALT+Enter로 fix current file하시는걸 추천함
  * `eslint --fix "**/+(*.ts|*.js|*.html)"` 이런식으로 fix 가능
