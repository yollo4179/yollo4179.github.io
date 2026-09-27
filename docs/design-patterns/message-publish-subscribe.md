# 수신 메시지의 발행·구독과 구독 수명

## 적용 상황

네트워크 수신부가 UI를 직접 갱신하지 않도록 메시지 전달과 화면 반영을 나눈다.

```text
수신 메시지
  → MessageDispatcher
  → RoomService
  → RoomSnapshot 교체
  → Changed / GameStarted / Exited
  → UI와 기능 서비스
```

## 발행·구독 구현

Dispatcher는 메시지 타입별 처리 함수 목록을 보관한다. 구독자는 관심 있는 메시지 타입과 처리 함수를 등록한다. 발행자는 구체적인 화면을 지정하지 않고 메시지를 발행한다.

발행 시 Dispatcher는 잠금 안에서 처리 함수 목록을 복사하고, 잠금 밖에서 함수를 호출한다. 구독자 코드가 실행되는 동안 등록 목록의 잠금을 계속 잡지 않는다. 한 처리 함수의 예외는 개별적으로 처리한다.

## 구독 해제

구독 시 반환한 토큰을 정리하면 해당 처리 함수가 등록 목록에서 제거된다. `CompositeSubscription`은 여러 토큰을 모아 한 번에 해제한다. Unity 소유자가 이미 파괴됐을 때 등록을 제거하는 안전망도 있다.

앱 수명의 `RoomService`는 방에서 나갔다고 모든 네트워크 구독을 종료하지 않는다. 방 이탈은 방 상태를 비우고 이탈 이벤트를 알린다. 서비스의 네트워크 구독은 서비스 종료 시 해제한다. 씬과 UI의 구독은 해당 소유자가 종료할 때 해제한다.

## 책임 분리

네트워크 Dispatcher는 메시지 전달을 맡고, RoomService는 방 상태를 갱신한다. UI는 갱신된 상태를 표시한다. 메시지 파싱, 상태 변경, 화면 표현의 변경 지점이 분리된다.

## 코드 근거

- `Client/Assets/Game/Infrastructure/Network/Dispatching/MessageDispatcher.cs`
- `Client/Assets/Game/Features/Room/Runtime/RoomService.cs`
- `Client/Assets/Game/App/Runtime/EntryPoints/WaitingRoomEntryPoint.cs`
