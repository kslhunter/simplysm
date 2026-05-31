# 알림(notification) 매뉴얼

화면에 토스트 알림을 띄우는 방법.

## 알림 띄우기

`show(message, opts)` 로 토스트를 띄움.

```ts
show("저장되었습니다", { severity: "success" });
```

- `severity` 로 색상 강조 단계(`info`/`success`/`warning`/`danger`)를 지정.
- `durationMs` 로 자동 사라짐 시간을 조정 (미지정 시 3초).
