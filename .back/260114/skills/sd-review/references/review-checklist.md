# 상세 리뷰 체크리스트

각 리뷰 관점별 체크리스트와 코드 예시.

## 1. 코드 품질

- [ ] **단순성/가독성** - 코드가 읽기 쉬운가?
- [ ] **DRY 원칙** - 중복 코드가 없는가?
- [ ] **네이밍** - 변수/함수명이 명확한가?
- [ ] **복잡도** - 불필요한 복잡성이 없는가?

### 단순성/가독성

**확인 항목**:
- 함수가 30줄 이내인가?
- 중첩 깊이가 3단계 이하인가?
- 조건문이 이해하기 쉬운가?

**나쁜 예시**:
```javascript
const x = arr.filter(i => i.t === 1).map(i => i.v).reduce((a, b) => a + b, 0);

if (user && user.profile && user.profile.settings && user.profile.settings.theme) {
  // ...
}
```

**좋은 예시**:
```javascript
const activeItems = items.filter(item => item.type === ACTIVE);
const values = activeItems.map(item => item.value);
const total = values.reduce((sum, value) => sum + value, 0);

const theme = user?.profile?.settings?.theme;
if (theme) {
  // ...
}
```

### DRY 원칙

**확인 항목**:
- 동일한 로직이 3회 이상 반복되는가?
- 복사-붙여넣기 흔적이 보이는가?

**나쁜 예시**:
```javascript
function validateUser(user) {
  if (!user.name) throw new Error('Name required');
  if (!user.email) throw new Error('Email required');
}

function validateAdmin(admin) {
  if (!admin.name) throw new Error('Name required');
  if (!admin.email) throw new Error('Email required');
}
```

**좋은 예시**:
```javascript
function validateRequired(entity, fields) {
  for (const field of fields) {
    if (!entity[field]) throw new Error(`${field} required`);
  }
}

function validateUser(user) {
  validateRequired(user, ['name', 'email']);
}
```

### 복잡도

**확인 항목**:
- 순환 복잡도가 10 이하인가?
- 조기 반환을 활용했는가?

**나쁜 예시**:
```javascript
function getDiscount(user) {
  let discount = 0;
  if (user) {
    if (user.isPremium) {
      if (user.years > 5) {
        discount = 30;
      } else {
        discount = 20;
      }
    } else {
      if (user.years > 3) {
        discount = 10;
      }
    }
  }
  return discount;
}
```

**좋은 예시**:
```javascript
function getDiscount(user) {
  if (!user) return 0;
  if (user.isPremium && user.years > 5) return 30;
  if (user.isPremium) return 20;
  if (user.years > 3) return 10;
  return 0;
}
```

## 2. 기능적 정확성

- [ ] **로직 오류** - 의도한 대로 동작하는가?
- [ ] **null/undefined 처리** - 방어적 프로그래밍이 되어 있는가?
- [ ] **엣지 케이스** - 경계 조건이 처리되는가?
- [ ] **비동기 처리** - Promise/async-await가 올바른가?

### 로직 오류

**일반적인 패턴**:
- Off-by-one 오류
- 연산자 우선순위 실수
- 타입 비교 오류

**나쁜 예시**:
```javascript
for (let i = 0; i <= arr.length; i++) { ... }
if (status == '200') { ... }
if (a && b || c) { ... }
```

**좋은 예시**:
```javascript
for (let i = 0; i < arr.length; i++) { ... }
if (status === 200) { ... }
if ((a && b) || c) { ... }
```

### null/undefined 처리

**나쁜 예시**:
```javascript
const name = user.profile.name;
const items = data.results.items;
```

**좋은 예시**:
```javascript
const name = user?.profile?.name ?? 'Unknown';
const items = data?.results?.items ?? [];
```

### 비동기 처리

**나쁜 예시**:
```javascript
async function loadData() {
  const data = fetchData();  // await 누락
  return data;
}

const user = await getUser();
const posts = await getPosts();  // 순차 실행 (비효율)
```

**좋은 예시**:
```javascript
async function loadData() {
  const data = await fetchData();
  return data;
}

const [user, posts] = await Promise.all([getUser(), getPosts()]);
```

## 3. 오류 처리

- [ ] **예외 처리** - try-catch가 적절한가?
- [ ] **에러 메시지** - 디버깅에 유용한가?
- [ ] **에러 전파** - 적절히 상위로 전달되는가?

### 예외 처리

**나쁜 예시**:
```javascript
try {
  const data = await fetch(url);
  const json = await data.json();
  processData(json);
  saveToDb(json);
  sendNotification();
} catch (e) {
  // 에러 무시
}
```

**좋은 예시**:
```javascript
async function loadAndProcess(url) {
  let data;
  try {
    const response = await fetch(url);
    data = await response.json();
  } catch (error) {
    throw new FetchError(`Failed to fetch: ${url}`, { cause: error });
  }

  try {
    await processData(data);
  } catch (error) {
    throw new ProcessError('Data processing failed', { cause: error });
  }
}
```

### 에러 메시지

**나쁜 예시**:
```javascript
throw new Error('Error');
throw new Error('Invalid');
```

**좋은 예시**:
```javascript
throw new Error(`User ${userId} not found in database`);
throw new ValidationError(`Invalid email format: ${email}`, { field: 'email' });
```

## 4. 보안

- [ ] **입력 검증** - 외부 입력이 검증되는가?
- [ ] **민감 정보** - 노출 위험이 없는가?
- [ ] **인젝션 방지** - SQL/Command/XSS 방어가 되어 있는가?

### 입력 검증

**나쁜 예시**:
```javascript
app.get('/user/:id', (req, res) => {
  const user = db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);
});
```

**좋은 예시**:
```javascript
app.get('/user/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  const user = db.query('SELECT * FROM users WHERE id = ?', [id]);
});
```

### 민감 정보

**나쁜 예시**:
```javascript
const API_KEY = 'sk-1234567890abcdef';
console.log('User login:', { email, password });
res.json(user);  // password 해시 포함
```

**좋은 예시**:
```javascript
const API_KEY = process.env.API_KEY;
console.log('User login:', { email });
res.json({ id: user.id, email: user.email, name: user.name });
```

### 인젝션 방지

**SQL 인젝션**:
```javascript
// 나쁨
db.query(`SELECT * FROM users WHERE name = '${name}'`);
// 좋음
db.query('SELECT * FROM users WHERE name = ?', [name]);
```

**XSS 방지**:
```javascript
// 나쁨
element.innerHTML = userInput;
// 좋음
element.textContent = userInput;
```

## 5. 성능

- [ ] **불필요한 연산** - 반복/중복 연산이 없는가?
- [ ] **메모리 관리** - 누수 위험이 없는가?
- [ ] **알고리즘 효율성** - 시간/공간 복잡도가 적절한가?

### 불필요한 연산

**나쁜 예시**:
```javascript
for (const item of items) {
  const config = loadConfig();  // 매번 로드
  process(item, config);
}
```

**좋은 예시**:
```javascript
const config = loadConfig();
for (const item of items) {
  process(item, config);
}
```

### 메모리 관리

**나쁜 예시**:
```javascript
function setupComponent() {
  window.addEventListener('resize', handleResize);
  setInterval(updateData, 1000);
  // 정리 없음
}
```

**좋은 예시**:
```javascript
function setupComponent() {
  window.addEventListener('resize', handleResize);
  const intervalId = setInterval(updateData, 1000);

  return function cleanup() {
    window.removeEventListener('resize', handleResize);
    clearInterval(intervalId);
  };
}
```

### 알고리즘 효율성

**나쁜 예시**:
```javascript
// O(n²)
function findDuplicates(arr) {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) duplicates.push(arr[i]);
    }
  }
  return duplicates;
}
```

**좋은 예시**:
```javascript
// O(n)
function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of arr) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  return [...duplicates];
}
```

## 6. 아키텍처/설계

- [ ] **단일 책임** - 각 모듈이 한 가지 역할만 하는가?
- [ ] **의존성 방향** - 의존성이 적절한가?
- [ ] **확장성** - 변경에 유연한가?

### 단일 책임 원칙

**나쁜 예시**:
```javascript
class UserService {
  createUser(data) { ... }
  validateEmail(email) { ... }
  sendWelcomeEmail(user) { ... }
  generatePDF(user) { ... }
  calculateDiscount(user) { ... }
}
```

**좋은 예시**:
```javascript
class UserService {
  constructor(emailService, validator) { ... }
  createUser(data) { ... }
}

class EmailService {
  sendWelcomeEmail(user) { ... }
}

class UserValidator {
  validateEmail(email) { ... }
}
```

## 7. 프로젝트 컨벤션

- [ ] **스타일 일관성** - 기존 코드와 일관성이 있는가?
- [ ] **폴더/파일 구조** - 프로젝트 구조를 따르는가?
- [ ] **문서화** - 필요한 주석/문서가 있는가?

## 리뷰 우선순위

1. **Critical**: 보안, 데이터 무결성, 주요 버그
2. **Major**: 성능 병목, 유지보수성, 테스트 가능성
3. **Minor**: 스타일, 최적화, 문서화
