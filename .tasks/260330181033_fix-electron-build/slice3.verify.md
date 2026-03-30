# Slice 3: description 안전 처리 — LLM 검증

## 검증 항목
- [x] `_runElectronBuilder`에서 productName fallback: line 305 `productName: this._npmConfig.description ?? this._npmConfig.name` → description 없으면 name 사용
- [x] `_copyBuildOutput`에서 파일명 sanitize: line 339 `rawName = description ?? name`, line 340 `safeName = rawName.replace(/[<>:"/\\|?*]/g, "")` → Windows 파일시스템 비안전 문자 제거
- [x] sanitize된 이름이 파일명에 사용: line 354 `${safeName}${...}-latest.exe`
- [x] `_runElectronBuilder`의 productName에는 sanitize 미적용 (의도적): electron-builder가 자체적으로 productName을 처리하므로 원본 값 전달이 적절
