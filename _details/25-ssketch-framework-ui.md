---
layout: ssketch-article
ssketch_styles: true
featured: true
project_slug: ssketch
number: '11'
order: 11
learning_order: 11
title: UI의 표시 순서와 공통 수명을 관리하는 구조
short_title: UI Layer와 공통 수명
short_category: UI 프레임워크
series_category: Client Framework
detail_category: 게임 클라이언트
permalink: /projects/ssketch/technical/framework-ui/
summary: UIManager에서 화면 등록과 표시 순서를 관리하고 UIBase에서 초기화·열기·닫기의 공통 순서를 유지했다. 화면별 동작은 훅으로 확장하고 ESC 입력에는 처리 우선순위를 뒀다.
result_label: Layer와 스택 관리 · 공통 실행 순서
tags: [Architecture, Unity, TemplateMethod, UI]
nav_context: projects
---

## 화면의 공통 동작과 개별 동작을 나눴다

게임 화면, 팝업, 모달은 표시 우선순위와 닫기 정책이 다르다. UI 관리자는 화면 등록과 순서를 맡고, 공통 베이스는 화면의 초기화·열기·닫기를 맡도록 구성했다.

## 디렉터리와 파일 구조

```text
Client/Assets/Game/UI/Runtime/Core/
├─ Base/
│  ├─ UIBase.cs                    # 공통 수명과 바인딩
│  └─ eUILayer.cs                  # 표시 계층 정의
├─ Management/
│  ├─ UIManager.cs                 # 등록·조회·열기·닫기·순서
│  └─ UIRoot.cs                    # 계층별 부모 참조
├─ Layers/
│  ├─ UIFixed.cs
│  ├─ UIWindow.cs
│  ├─ UIPopup.cs
│  ├─ UIModal.cs
│  ├─ UIToast.cs
│  └─ UISystem.cs
└─ Components/
   ├─ UIDraggable.cs
   └─ UIOptionSelector.cs
```

## 타입으로 화면을 찾고 Layer에 배치한다

UIManager는 화면 타입과 UI 객체를 연결한다. 호출자는 화면 타입으로 열기·닫기·조회를 요청한다. 관리자는 화면의 Layer에 맞는 UIRoot 부모를 선택하고 표시 순서를 관리한다.

```text
UIRoot
└─ Canvas
   ├─ FixedRoot
   ├─ WindowRoot
   ├─ PopupRoot
   ├─ EscapeMenuRoot
   ├─ ModalRoot
   ├─ ToastRoot
   └─ SystemRoot
```

| Root | 구분한 역할 |
| --- | --- |
| FixedRoot | HUD·조준점처럼 기본 화면에 고정되는 UI |
| WindowRoot | 포커스와 앞뒤 순서가 필요한 일반 화면 |
| PopupRoot | 팝업 표시 |
| EscapeMenuRoot | ESC 메뉴와 메뉴에서 여는 설정 화면 |
| ModalRoot | 확인·취소 등 응답을 받는 모달 |
| ToastRoot | 짧은 알림 |
| SystemRoot | 로딩·페이드 등 최상단 시스템 화면 |

**UIBase는 모든 화면의 공통 클래스이고, FixedRoot는 기본 고정 화면의 표시 계층**이다. 공통 클래스의 상속 구조와 Canvas 아래의 표시 계층을 구분했다.

## 계층별 z-order와 창의 포커스를 관리한다

Root 순서로 계층 사이의 앞뒤 관계를 나누고, Window·Popup·Modal은 각 계층 안의 표시 순서를 별도로 관리한다. 관리자는 순서 목록을 아래에서 위 순서로 보관하고, 목록 순서대로 자식 객체를 마지막 형제로 이동해 실제 표시 순서에 반영한다.

```text
창 열기 또는 열린 창 클릭
  → 해당 창을 순서 목록에서 제거
  → 목록의 마지막에 추가
  → 목록 순서로 Sibling 순서 갱신
  → 해당 계층의 최상단에 표시
```

UIWindow는 클릭을 받으면 포커스를 요청한다. **실제 z-order 변경은 UIManager가 담당한다.** 이미 열린 창을 다시 열 때도 목록에 중복으로 넣지 않고 최상단으로 옮긴다. 창을 닫으면 해당 항목을 제거하고 남은 순서를 갱신한다.

Window의 순서 목록과 Popup·Modal의 스택은 서로 분리했다. 관리자는 각 목록의 마지막 항목으로 최상단 화면을 찾는다.

## UIBase의 상속 구조

```text
UIBase                         # 초기화·열기·닫기·바인딩
├─ UIFixed                     # 고정 화면
├─ UIWindow                    # 포커스 요청과 ESC 확장
│  └─ UIDraggable              # 드래그 이동
├─ UIPopup                     # 팝업 닫기 정책 데이터
├─ UIModal                     # 모달 ESC 확장
├─ UIToast                     # 알림
└─ UISystem                    # 시스템 화면
```

개별 화면은 용도에 맞는 베이스를 상속한다. 장면 전환 관리나 게임 규칙을 베이스에 넣지 않고, 화면의 공통 동작과 확장 지점만 제공한다.

## 공통 실행 순서에 Template Method를 적용했다

```text
UIManager의 열기 요청
  → UIBase의 열림 상태 갱신
  → GameObject 활성화와 공통 처리
  → 해당 화면의 OnOpened 실행
```

UIBase는 실행 순서를 유지하고, 개별 화면은 초기화·열기·닫기 훅을 재정의한다. **공통 처리의 골격은 베이스에 두고 화면별 처리는 훅으로 확장하는 Template Method 구조**다.

중복 초기화는 거절하고, 이미 열린 화면에 다시 열기 요청이 와도 같은 동작을 반복하지 않도록 처리한다. enum 멤버 이름으로 자식 객체를 찾아 타입별 바인딩 배열에 보관하는 기능도 공통 베이스에 뒀다.

### UIBase가 제공하는 API

| API | 사용 주체와 역할 |
| --- | --- |
| `Layer` | 화면 클래스가 자신의 표시 계층을 지정 |
| `IsInitialized`, `IsOpen` | 초기화·열림 상태 조회 |
| `RectTransform` | 초기화 시 보관한 화면 Transform 조회 |
| `OnInitialize()` | 개별 화면이 재정의해 바인딩·버튼 연결 등 초기 동작 구현 |
| `OnOpened()` | 개별 화면이 재정의해 열릴 때 데이터 갱신 등 구현 |
| `OnClosed()` | 개별 화면이 재정의해 닫힐 때 정리 동작 구현 |
| `Bind<T>(Type enumType)` | enum 이름으로 자식 객체·컴포넌트를 찾아 타입별 배열에 보관 |
| `Get<T>(int index)` | 보관한 바인딩을 인덱스로 조회 |
| `GetObject`, `GetText`, `GetButton`, `GetImage` | 자주 쓰는 바인딩 타입의 조회 도우미 |
| `Initialize()`, `OpenFromManager()`, `CloseFromManager()` | 관리자가 호출하는 내부 수명 진입점 |

UIManager를 통한 열기·닫기는 화면 상태와 순서 목록을 함께 반영한다. 개별 화면의 훅은 그 공통 순서 안에서 실행된다.

### UIManager가 제공하는 API

| API | 역할 |
| --- | --- |
| `RegisterAll(List<UIBase>)` | 화면 목록 초기화, Root 배치, 타입별 등록 |
| `Get<T>()` | 등록된 화면을 타입으로 조회 |
| `Open<T>()`, `Close<T>()` | 화면 열기·닫기와 순서 목록 갱신 |
| `TopWindow`, `TopPopup`, `TopModal` | 해당 계층의 최상단 화면 조회 |
| `PopupCount` | 열린 팝업 수 조회 |
| `CloseAllPopups()` | 열린 팝업 전체 닫기 |
| `Unregister(UIBase)` | 화면 등록과 순서 목록·포커스 구독 정리 |
| `Clear()` | 등록 화면 제거와 관리 목록 초기화 |

```csharp
// 등록된 설정 화면을 타입으로 조회·열기·닫기
uiManager.Get<UI_Settings>();
uiManager.Open<UI_Settings>();
uiManager.Close<UI_Settings>();
```

## ESC 입력의 처리 우선순위를 정했다

ESC 처리는 **공통 경로에서 최상단 화면에 입력을 전달하고, 개별 화면이 기본 함수를 재정의하도록 제안했다.** 해당 구현은 팀원이 반영했다.

여러 화면이 ESC를 각각 읽으면 같은 입력에 여러 화면이 반응할 수 있다. GameInstance의 공통 입력 경로에서 텍스트 입력 여부를 확인하고 닫기 우선순위를 적용한다.

```text
ESC 입력
  → 텍스트 입력 중이면 건너뜀
  → 별도 ESC 처리자 확인
  → 최상단 Modal
  → 최상단 Window
```

씬 진입점은 해당 씬의 UI를 등록하고, 씬 종료 시 등록을 해제한다. 화면 내용은 기능 서비스의 상태를 받아 표시한다. 네트워크가 화면 객체를 직접 선택하는 대신 서비스의 상태 변경을 화면이 구독한다.

### 화면마다 ESC 동작을 재정의했다

UIWindow와 UIModal은 기본 `OnEscape()`를 제공한다. 기본 구현은 아무 동작도 하지 않으며, **개별 화면이 함수를 오버라이드해서 자신의 뒤로 가기·취소·재개 동작을 구현한다.** ESC 입력 자체는 공통 경로가 읽고 선택한 최상단 화면에 전달한다.

| 화면 | 재정의한 ESC 동작 |
| --- | --- |
| 방 생성 | 뒤로 가기 동작 호출 |
| 비밀방 비밀번호 모달 | 취소 동작 호출 |
| 게임 메뉴 | 플레이 재개 요청 발행 |
| 설정 | 드롭다운 닫기 → 키 재설정 취소 → 목록 포커스 복귀 또는 뒤로 가기 |

설정 화면은 ESC를 받았다고 바로 전체 화면을 닫지 않는다. 화면 내부에서 진행 중인 동작을 먼저 정리한다. **입력 전달 대상의 선택은 공통 경로에, ESC의 구체적인 의미는 개별 화면에 둔 구조**다.

## enum 이름으로 자식을 찾아 참조한다

UIBase에는 <span class="notice-pink">enum 기반 이름 바인딩</span>을 넣었다. 개별 화면이 버튼·텍스트·입력 필드의 이름을 enum으로 정의하면, 공통 바인딩 함수가 같은 이름의 자식 객체에서 필요한 타입의 참조를 찾는다.

```text
화면에서 enum과 컴포넌트 타입 지정
  → enum 멤버 이름 목록 조회
  → 비활성 객체를 포함한 하위 계층 탐색
  → 이름이 같은 객체의 컴포넌트 참조 선택
  → 타입별 배열에 보관
  → enum 인덱스로 저장된 참조 조회
```

비밀번호 모달에서 사용하는 실제 바인딩은 다음과 같다.

```csharp
private enum Buttons
{
    PasswordSubmitButton,
    PasswordCancelButton
}

// 초기화에서 enum 이름에 맞는 Button 참조를 보관
Bind<Button>(typeof(Buttons));

// 이후에는 이름으로 다시 탐색하지 않고 저장된 참조를 조회
_submitButton = GetButton((int)Buttons.PasswordSubmitButton);
_cancelButton = GetButton((int)Buttons.PasswordCancelButton);
```

텍스트와 입력 필드도 같은 방식으로 연결한다. 일반 조회 API가 있으므로 TextMeshPro와 TMP 입력 필드도 타입을 지정해 바인딩한다.

```csharp
Bind<TextMeshProUGUI>(typeof(Texts));
Bind<TMP_InputField>(typeof(InputFields));

_roomLabel = Get<TextMeshProUGUI>((int)Texts.PasswordRoomLabel);
_passwordInput = Get<TMP_InputField>((int)InputFields.PasswordInput);
```

**enum 이름과 UI 객체 이름을 맞추는 것이 연결 규칙**이다. 타입별로 바인딩 배열을 보관하므로 각 컴포넌트 타입에 대응하는 enum을 사용한다. enum 값은 배열 인덱스로 사용하므로 0부터 연속된 값으로 정의한다.

찾지 못한 객체는 경고를 남긴다. 개별 화면은 필수 참조를 검사해 잘못된 이름이나 누락된 연결을 초기화 단계에서 확인한다. 바인딩된 객체를 사용할 때마다 계층을 다시 탐색하지 않고 저장한 참조를 사용한다.

## 재사용할 공통 동작도 베이스에 모았다

| 기능 | 구성 |
| --- | --- |
| 드래그 가능한 창 | UIWindow의 포커스 정책을 상속하고 UIDraggable에서 드래그 이동 구현 |
| 드래그 좌표 | 포인터 이동량을 Canvas 배율로 보정해 RectTransform에 반영 |
| 팝업 닫기 정책 | 수동·자동·자동 또는 입력 모드와 유지 시간 데이터 제공 |
| 중복 등록 검사 | 같은 타입의 살아 있는 화면이 이미 등록되면 거절 |
| 파괴된 화면 참조 정리 | 등록 Dictionary와 Window·Popup·Modal 순서 목록에서 함께 제거 |
| 등록 해제 | 화면 닫기, 표시 순서 갱신, 창 포커스 구독 해제 |

팝업 베이스는 닫기 정책 데이터를 제공한다. 해당 데이터 정의와 실제 타이머 실행은 별도 책임이다.

## 음성 채팅 UI도 서비스 상태를 받아 표시한다

Vivox 연동에서는 방의 음성 채팅 화면을 음성 서비스와 연결했다. 화면은 연결 상태와 참가자 변경 이벤트를 구독하고, 참가자별 연결·발언·음소거 상태를 표시한다. 발언 중인 참가자는 행의 시각적 강조로 구분한다.

```text
Vivox 참가자 이벤트
  → SDK Gateway에서 게임용 상태로 변환
  → 음성 서비스의 참가자 상태 갱신
  → 참가자 변경 이벤트
  → 방 음성 UI 갱신
```

화면은 SDK 참가자 객체를 직접 다루지 않고 게임용 상태 객체를 사용한다. 마이크 음소거는 서비스에 요청하며, 화면 종료 시 음성 상태와 참가자 이벤트 구독을 해제한다. **음성 연결의 수명은 서비스가, 화면 표시와 구독의 수명은 UI가 관리한다.**

## 책임 분리

| 구성 | 책임 |
| --- | --- |
| UIManager | 화면 등록·조회, Layer 배치, 표시 순서 |
| UIRoot | 표시 계층의 부모 객체 참조 |
| UIBase | 공통 수명 순서, 상태, 바인딩 |
| 개별 화면 | 데이터 표시와 화면별 입력 동작 |
| 씬 진입점 | 씬의 화면 등록과 정리 |

표시 관리와 화면별 내용을 나눠 **새 화면이 공통 열기·닫기 규칙을 재사용하도록 구성했다.**
