# 내부 라이브러리에 대한 tsconfig.json에 경로 추가

내부 라이브러리가 빌드되지 않더라도, IDE 에서 ts 타입을 제대로 체크하도록 tsconfig.json에 baseUrl과 paths를 추가함

패키지의 tsconfig.json
``` json
{
  ...,
  "compilerOptions": {
    ...,
    "baseUrl": ".",
    "paths": {
      ...,
      "@simplysm-ts/common": [
        "../common/src/index.ts"
      ]
    }
  }
}
```

위 예제은 아래 상황을 가정하여 입력된 예제입니다.
* 프로젝트명: simplysm-ts
* 내부 라이브러리 패키지명: common
* 내부 라이브러리 상대경로: "../common/src/index.ts"
