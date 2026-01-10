# 패키지 의존성 순서

## 의존성 그래프

```
Level 0 (의존성 없음)
├── core-common
├── eslint-plugin
├── claude
└── storage
        ↓
Level 1 (core-common만 의존)
├── core-browser
├── core-node
├── excel
└── orm-common
        ↓
Level 2
├── orm-node       ← core-common, orm-common
└── service-common ← core-common, orm-common
        ↓
Level 3
├── service-client ← core-common, orm-common, service-common
└── service-server ← core-common, core-node, orm-common, orm-node, service-common
```

## 검토 순서

| 순서 | 패키지                                                           | improve | cleanup |
|----|---------------------------------------------------------------|---------|---------|
| 1  | `core-common`, `eslint-plugin`                                | [ ]     | [ ]     |
| 2  | `core-browser`, `core-node`, `excel`, `orm-common`, `storage` | [ ]     | [ ]     |
| 3  | `orm-node`, `service-common`                                  | [ ]     | [ ]     |
| 4  | `service-client`, `service-server`                            | [ ]     | [ ]     |
