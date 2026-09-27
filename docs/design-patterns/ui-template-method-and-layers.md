# UI의 공통 수명과 Layer 관리

## 적용 상황

화면마다 초기화·열기·닫기를 따로 처리하면 상태 갱신과 콜백 순서가 달라진다. 공통 베이스는 실행 순서를 정하고, 개별 화면은 필요한 동작만 재정의한다.

## Template Method 적용

```text
UIManager가 열기 요청
  → UIBase가 열림 상태와 활성 상태 반영
  → 공통 처리
  → 파생 화면의 OnOpened
```

초기화와 닫기도 공통 경로를 사용한다. 파생 화면은 `OnInitialize`, `OnOpened`, `OnClosed`를 재정의한다. 실행 골격은 베이스가 유지하고 화면별 처리는 훅으로 확장하는 Template Method 구조다.

베이스는 중복 초기화를 거절하고 같은 열림 상태의 반복 요청을 처리한다. enum 멤버 이름으로 자식 UI 객체를 찾아 타입별 배열에 보관하는 바인딩 도구도 제공한다.

## UIManager의 책임

| 관리 대상 | 동작 |
| --- | --- |
| UI 타입 | 타입별 등록과 조회, 열기·닫기 |
| Layer | Fixed, Window, Popup, EscapeMenu, Modal, Toast, System 루트 선택 |
| 표시 순서 | Window 순서와 Popup·Modal 스택 관리 |
| 씬 수명 | 씬 진입점에서 등록하고 종료 시 해제 |

ESC 입력은 GameInstance의 공통 경로에서 처리한다. 텍스트 입력 중인지 확인한 뒤, 별도 ESC 처리자와 최상단 Modal·Window 순서로 대응한다. 여러 화면이 같은 ESC 입력을 독립적으로 소비하지 않도록 우선순위를 둔다.

UIManager의 Layer·스택 관리는 UI 정책이며, 이 관리 구조 전체를 Template Method라고 부르지는 않는다. 패턴은 UIBase의 공통 실행 순서와 재정의 훅에 적용된다.

## z-order와 포커스

UIManager는 Window·Popup·Modal별 순서 목록을 아래에서 위 순서로 관리한다. 화면을 열면 기존 항목을 제거하고 목록 마지막에 넣은 뒤, 목록 순서대로 `SetAsLastSibling()`을 호출해 표시 순서를 반영한다. 닫을 때는 항목을 제거하고 나머지 순서를 갱신한다.

UIWindow는 포인터 클릭으로 포커스를 요청한다. UIManager가 요청한 창을 최상단으로 옮긴다. 개별 창이 관리 목록과 무관하게 z-order를 바꾸지 않도록 역할을 나눴다.

## Root와 베이스 상속 구조

```text
UIRoot/Canvas
├─ FixedRoot
├─ WindowRoot
├─ PopupRoot
├─ EscapeMenuRoot
├─ ModalRoot
├─ ToastRoot
└─ SystemRoot

UIBase
├─ UIFixed
├─ UIWindow
│  └─ UIDraggable
├─ UIPopup
├─ UIModal
├─ UIToast
└─ UISystem
```

Root는 표시 계층이며 UIBase는 공통 수명과 바인딩을 제공하는 베이스 클래스다. 기본 고정 화면의 Root 이름은 FixedRoot다.

## 주요 API

| 제공자 | API | 역할 |
| --- | --- | --- |
| UIBase | `Layer`, `IsInitialized`, `IsOpen`, `RectTransform` | 화면 계층과 상태·Transform 조회 |
| UIBase | `OnInitialize`, `OnOpened`, `OnClosed` | 개별 화면의 초기화·열기·닫기 훅 |
| UIBase | `Bind<T>`, `Get<T>` | enum 이름으로 바인딩하고 인덱스로 조회 |
| UIBase | `GetObject`, `GetText`, `GetButton`, `GetImage` | 타입별 바인딩 조회 도우미 |
| UIBase | `Initialize`, `OpenFromManager`, `CloseFromManager` | 관리자용 내부 수명 진입점 |
| UIManager | `RegisterAll`, `Unregister` | 등록·해제와 Root 배치 |
| UIManager | `Get<T>`, `Open<T>`, `Close<T>` | 타입별 조회와 열기·닫기 |
| UIManager | `TopWindow`, `TopPopup`, `TopModal`, `PopupCount` | 최상단 화면과 팝업 수 조회 |
| UIManager | `CloseAllPopups`, `Clear` | 팝업 닫기와 전체 등록 정리 |
| UIWindow / UIModal | `OnEscape` | 개별 화면이 재정의할 ESC 동작 |

## 화면별 ESC 재정의

사용자는 공통 경로에서 최상단 화면으로 ESC를 전달하고 각 화면이 기본 함수를 재정의하는 방향을 제안했다. 팀원이 해당 구현을 반영했다.

Window와 Modal의 기본 `OnEscape()`는 아무 동작도 하지 않는다. 방 생성은 뒤로 가기, 비밀번호 모달은 취소, 게임 메뉴는 재개 요청으로 각각 재정의한다. 설정 화면은 열린 드롭다운과 키 재설정부터 정리한 뒤 화면 내부 포커스 복귀 또는 뒤로 가기를 처리한다.

공통 경로는 입력을 받을 최상단 화면을 선택하고 개별 화면은 ESC의 구체적인 동작을 결정한다.

## enum 이름 기반 바인딩

화면은 버튼·텍스트·입력 필드별 enum을 정의한다. UIBase는 enum 멤버 이름과 같은 이름의 하위 객체를 비활성 객체까지 포함해 탐색하고, 지정된 컴포넌트 참조를 타입별 배열에 보관한다. 이후 enum 값을 배열 인덱스로 사용해 참조를 조회한다.

```csharp
// UI_RoomPasswordModal의 실제 초기화 경로
Bind<Button>(typeof(Buttons));
Bind<TextMeshProUGUI>(typeof(Texts));
Bind<TMP_InputField>(typeof(InputFields));

_submitButton = GetButton((int)Buttons.PasswordSubmitButton);
_roomLabel = Get<TextMeshProUGUI>((int)Texts.PasswordRoomLabel);
_passwordInput = Get<TMP_InputField>((int)InputFields.PasswordInput);
```

enum과 객체의 이름을 맞추고 enum 값은 0부터 연속되게 정의한다. 타입별 배열을 보관하므로 컴포넌트 타입마다 대응하는 enum을 사용한다. 초기화에서 참조를 보관한 뒤 조회 시에는 계층을 다시 탐색하지 않는다. 누락된 바인딩은 경고를 남기고 화면에서 필수 참조를 검사한다.

## 추가 공통 동작

- UIDraggable은 Window의 포커스 정책을 상속하고 Canvas 배율을 반영해 드래그 이동을 수행한다.
- UIPopup은 닫기 모드와 유지 시간 데이터를 제공한다. 데이터 정의와 타이머 실행 책임은 구분한다.
- UIManager는 중복 등록을 거절하고 파괴된 참조를 등록·표시 순서 목록에서 함께 정리한다.
- 등록 해제 시 창의 포커스 구독도 해제한다.

## 코드 근거

- `Client/Assets/Game/UI/Runtime/Core/Base/UIBase.cs`
- `Client/Assets/Game/UI/Runtime/Core/Management/UIManager.cs`
- `Client/Assets/Game/App/Runtime/Bootstrap/GameInstance.cs`
- `Client/Assets/Game/App/Runtime/EntryPoints/MainMenuEntryPoint.cs`
- `Client/Assets/Game/UI/Runtime/Core/Management/UIRoot.cs`
- `Client/Assets/Game/UI/Runtime/Core/Layers/UIWindow.cs`
- `Client/Assets/Game/UI/Runtime/Core/Layers/UIModal.cs`
- `Client/Assets/Game/UI/Derived/Settings/UI_Settings.cs`
- `Client/Assets/Game/UI/Derived/UI_RoomPasswordModal.cs`
- `Client/Assets/Game/Shared/Utils.cs`
