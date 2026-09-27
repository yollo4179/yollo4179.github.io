# 게임 결과 이벤트와 네트워크를 연결하는 어댑터

## 적용 상황

게임 규칙은 결과를 계산하고, 네트워크 계층은 결과를 패킷으로 바꿔 참가자에게 전송한다. 게임 진행 서비스가 패킷 형식과 참가자 세션을 직접 다루지 않도록 이벤트 전달 경계를 둔다.

```text
GameLoopService
  → GameLoopEvent 발행
  → IGameLoopEventSink
  → GameLoopNetworkEvents
  → Broadcaster
  → ClientSession
```

## 역할

| 구성 요소 | 책임 |
| --- | --- |
| 게임 진행 서비스 | 게임 규칙을 처리하고 결과 이벤트 생성 |
| 이벤트 Sink 인터페이스 | 외부로 결과를 전달하는 계약 |
| 네트워크 어댑터 | 이벤트별 외부 처리를 연결 |
| Broadcaster | 결과를 패킷으로 만들고 대상 세션에 전송 |

어댑터의 일반 전송 경로는 이벤트 값을 Broadcaster에 넘긴다. 일부 이벤트는 호스트 권위 수명 처리로 연결되므로 모든 처리가 무조건 방송 하나로 끝나는 것은 아니다.

## variant와 visit의 매칭

이벤트는 여러 이벤트 타입을 담을 수 있는 `std::variant`다. 어댑터는 `std::visit`에 이벤트 타입별 람다를 전달한다. 람다의 호출 연산자를 하나의 오버로드 집합으로 묶어 이벤트를 인자로 받을 처리 함수를 선택한다.

쉽게 표현하면 **발행한 이벤트의 타입에 맞는 처리 함수를 실행한다**. 타입과 처리 함수의 연결은 컴파일 단계에서 결정되고, 실행 시에는 variant에 담긴 이벤트에 대응하는 함수가 호출된다.

이 경로는 구독자 목록을 실행 중 등록·검색하는 범용 이벤트 버스와 구분된다. Sink 계약을 구현한 어댑터 내부에서 이벤트별 처리를 매칭한다. `std::visit`을 사용하는 이 구조는 방문 방식이며, 고전적인 `Accept/Visit` 상속 구조를 그대로 구현한 것은 아니다.

## 수명 관리

어댑터는 Room을 약한 참조로 보관하고 이벤트 처리 시 유효한 Room 참조를 얻는다. 어댑터가 Room을 계속 소유해 수명을 불필요하게 늘리는 것을 피한다.

## 코드 근거

- `Server/Server/Model/Room/Services/GameLoop/GameLoopEvents.h`
- `Server/Server/Application/GameLoop/GameLoopNetworkEvents.h`
- `Server/Server/Application/GameLoop/GameLoopNetworkEvents.cpp`
- `Server/Server/Network/Notifications/GameLoopBroadcaster.cpp`
