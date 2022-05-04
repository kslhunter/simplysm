# 라이브러리 패키지 로컬업데이트 설정

라이브러리를 로컬 디렉토리에 있는 라이브러리 소스에서 자동으로 업데이트 합니다.

## 사용법

프로젝트 디렉토리의 simplysm.json 에 다음 옵션을 추가합니다.

``` json
{
  "packages": {
    ...
  },
  ...,
  "localUpdates": {
    "@simplysm/*": "../simplysm/packages/*"
  }
}
```
위 예제는 다음을 의미합니다.
* scope `simplysm` 안의 모든 패키지를 `../simplysm/packages/*`안의 파일로 모두 전환합니다.
* 즉 `node_modules/@simplysm` 폴더에 `../simplysm/packages`폴더를 복사하여 덮어씁니다.

이제 다음 명령어를 실행하면 위의 동작이 수행됩니다.

``` bat
:: 주의사항: 대상이되는 라이브러리는 반드시 빌드되어 있거나, 변경감지 중이여야 합니다.
:: sd-cli local-update --help 참고
sd-cli local-update
```

또한, `sd-cli watch` 를 수행할 경우에는, 로컬 라이브러리 파일이 변경되면 자동으로 해당 파일을 다시 덮어씁니다.

## (선택) package.json script 수정

로컬업데이트 사용시에는, 다음과 같이 스크립트를 수정하여, `sd-cli`가 수행되기 전에 `local-update`를 수행하는 것을 추천합니다.

``` json
{
  ...,
  "scripts": {
    "watch": "sd-cli local-update && sd-cli watch",
    "build": "sd-cli local-update && sd-cli build",
    "publish": "sd-cli local-update && sd-cli publish",
    "----- utils": "",
    "postinstall": "sd-cli local-update && sd-cli prepare"
  },
  ...
}
```
