# 앱 진입점과 서비스 수명 관리

## 적용 상황

로그인, 방 정보, 통신, UI, 자산 접근은 씬 전환 이후에도 필요하다. 각 씬이 공통 서비스를 별도로 만들면 같은 기능의 인스턴스가 중복되거나 종료 순서가 흩어질 수 있다.

## 구성

```text
GameInstance: 앱 진입점과 프레임 갱신
  → AppCompositionRoot: 의존 관계에 맞춰 객체 조립
  → AppServices: 공통 서비스 참조와 종료 관리
  → Scene EntryPoint: 씬의 객체에 필요한 서비스 연결
```

| 구성 요소 | 책임 |
| --- | --- |
| GameInstance | 싱글턴 인스턴스 유지, 초기화, 네트워크 Pump와 입력 갱신, 종료 진입 |
| AppCompositionRoot | 생성자에 의존성을 전달해 UI·통신·게임 서비스를 조립 |
| AppServices | 앱 수명의 서비스 참조 보관, 구독 해제와 서비스 정리 |
| Scene EntryPoint | 씬의 UI 등록, 캐릭터와 카메라 연결, 씬 수명의 구독·풀 정리 |

`GameInstance`는 중복 인스턴스를 제거하고 `DontDestroyOnLoad`로 유지된다. 초기화 가드는 초기화 중 재접근으로 서비스를 중복 생성하는 것을 막는다.

조립부는 서비스에 필요한 객체를 생성자로 전달한다. 이 구조는 수동 의존성 주입이며, 별도의 DI 컨테이너를 사용하는 구성은 아니다. 일부 서비스는 `AppServices` 생성자에서도 생성된다.

## 종료 책임

앱 종료 시 `AppServices`는 구독을 해제하고 서비스 의존 관계를 고려해 정리한다. 예를 들어 WorldEvents, WorldSnapshots, PlayerInput, HostSession 순서로 소비자부터 정리한다. 풀은 자산 참조를 정리하기 전에 종료한다.

씬 진입점은 자신이 만든 풀 범위와 씬 구독을 정리한다. 앱 종료와 씬 파괴의 순서가 달라질 수 있으므로 풀 범위의 종료 여부도 확인한다.

## 프록시와의 관계

`GameInstance.Services.UI` 접근은 서비스 참조를 찾는 동작이다. `GameInstance`가 UI와 같은 인터페이스를 구현해서 UI 요청을 대행하는 구조는 아니다. 따라서 **싱글턴 진입점 + 서비스 컨테이너 + Composition Root**로 설명한다.

전역 접근점은 존재한다. 생성자 주입을 사용한다는 이유로 모든 기능의 전역 접근이 제거됐다고 표현하지 않는다.

## 구조를 나눈 효과

- 객체 조립과 프레임 갱신 책임을 분리했다.
- 앱 수명과 씬 수명의 정리 주체를 구분했다.
- 기능의 생성자에서 필요한 의존성을 드러냈다.

## 코드 근거

- `Client/Assets/Game/App/Runtime/Bootstrap/GameInstance.cs`
- `Client/Assets/Game/App/Runtime/Bootstrap/AppCompositionRoot.cs`
- `Client/Assets/Game/App/Runtime/Bootstrap/AppServices.cs`
- `Client/Assets/Game/App/Runtime/EntryPoints/InGameEntryPoint.cs`
