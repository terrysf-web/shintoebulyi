# 동기화 설정 (Firebase)

앱은 `config.js`의 `firebase.apiKey`가 비어 있으면 **동기화 없이 이 기기에서만** 동작합니다.
값을 채우면 가게 비밀번호 로그인과 기기 간 실시간 동기화가 켜집니다.

## 1. Firebase 프로젝트 만들기
1. https://console.firebase.google.com 에서 본인 Google 계정으로 **프로젝트 추가**
2. Google Analytics는 꺼도 됩니다.

## 2. 가게 로그인 계정
1. **빌드 → Authentication → 시작하기 → 로그인 방법 → 이메일/비밀번호** 사용 설정
2. **사용자 탭 → 사용자 추가**
   - 이메일: `pos@shintoebulyi.app` (실제 메일이 아니어도 됩니다)
   - 비밀번호: **가게 공용 비밀번호** (길고 추측하기 어렵게)
3. **설정 탭 → 승인된 도메인 → 도메인 추가**: `terrysf-web.github.io`

## 3. 데이터베이스
1. **빌드 → Firestore Database → 데이터베이스 만들기** (위치: 미국, 프로덕션 모드)
2. **규칙** 탭에 `firestore.rules` 내용을 붙여넣고 **게시**

## 4. 앱 연결
1. **프로젝트 설정(톱니) → 일반 → 내 앱 → 웹(</>)** 앱 추가
2. 화면에 나오는 `apiKey`, `authDomain`, `projectId`, `appId`를 `config.js`에 넣습니다.
   (이 값은 공개되어도 되며, 접근은 위 규칙과 로그인으로 막습니다.)

## 코드 다시 만들기 (필요할 때만)
`sync.bundle.js`는 `src/adapter.js`에서 만듭니다: `npm install && sh build.sh`

## 주방 화면 / 주방 주문서 (kitchen.html)
- 아이패드에서 `🍳 주방 전송`을 누르면 **아직 보내지 않은 메뉴만** 주문서(tickets)로 저장됩니다.
- 주방의 컴퓨터나 아이패드에서 `https://terrysf-web.github.io/shintoebulyi/kitchen.html` 을 열고 가게 비밀번호로 로그인하면 새 주문이 실시간으로 뜹니다.
- `✓ 완료`로 조리 끝을 표시하고, `🖨 인쇄`로 80mm 영수증 모양으로 인쇄합니다.
- **새 주문 자동 인쇄**: 프린터가 연결된 컴퓨터의 Chrome을 `--kiosk-printing` 옵션으로 실행하면 인쇄 창 없이 바로 출력됩니다.
  - Windows 예: `chrome.exe --kiosk-printing https://terrysf-web.github.io/shintoebulyi/kitchen.html`
  - 프린터를 컴퓨터의 **기본 프린터**로 지정해 두어야 합니다.

## 주문 전용 화면 (전화기·작은 패드)
- 주소 뒤에 `?mode=order`를 붙여 엽니다: `https://terrysf-web.github.io/shintoebulyi/?mode=order`
- 결제, 팁 입력, 설정, 마감이 숨겨지고 **테이블 선택 → 메뉴 담기 → 🍳 주방 전송**만 보입니다. 결제는 카운터의 아이패드(일반 주소)에서 합니다.
- 홈 화면에 추가할 때는 이 주소를 연 상태에서 추가해야 "신토불이 주문" 아이콘이 주문 화면으로 열립니다.

## 새 버전 알림 (배포 담당용)
배포 전에 `python3 stamp.py`를 실행하면 `index.html`, `kitchen.html`의 build 값과 `version.json`이 같은 새 값으로 바뀝니다.
앱은 열려 있는 동안 `version.json`을 확인하고, 자기 build 값과 다르면 화면 위에 "새 버전이 있습니다" 줄을 띄웁니다.
