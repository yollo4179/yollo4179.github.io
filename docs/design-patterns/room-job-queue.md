# Room 변경 작업의 캡슐화와 직렬화

## 적용 상황

IOCP Worker와 타이머 콜백은 서로 다른 실행 주체다. 이들이 같은 Room 상태를 동시에 수정하지 않도록 상태 변경 요청을 작업으로 전달한다.

```text
Worker / 타이머 콜백
  → Room의 작업 등록
  → JobQueue
  → 순서대로 Room 상태 변경
```

## Command의 성격

JobQueue의 작업 타입은 `std::function<void()>`다. 호출할 동작과 필요한 값을 람다에 묶어 큐로 전달한다. 작업을 넣는 시점과 실행하는 시점을 분리하는 함수 객체 기반 Command 성격이다.

별도 Command 상속 계층이나 실행 취소 기능을 제공하는 구조는 아니다. 작업 요청을 실행 가능한 값으로 만든 부분과, 작업을 직렬화하는 동시성 제어를 구분해서 설명한다.

## 실행 경계

큐는 잠금과 실행 중 여부를 관리한다. Room마다 작업 순서를 유지하므로 해당 큐를 거치는 변경은 서로 겹쳐 실행되지 않는다. 이것은 Room별 전용 스레드를 하나씩 만드는 뜻이 아니다.

일반 작업에는 대기 수 제한이 있다. 수명·타이머용 제어 작업은 별도 등록 경로를 사용하되 기존 작업과의 FIFO 순서를 유지한다. 종료 상태에서는 새 작업을 받지 않도록 처리한다.

## 책임 분리

Handler는 요청을 검사하고 대상 Room을 찾는다. Room은 상태 변경 진입점이고, JobQueue는 변경 작업의 실행 순서를 관리한다. 큐를 거치지 않는 코드까지 자동으로 보호하는 것은 아니므로 Room 변경 경로를 큐에 모으는 규칙이 필요하다.

## 코드 근거

- `Server/ServerCore/Threading/JobQueue/JobQueue.h`
- `Server/ServerCore/Threading/JobQueue/JobQueue.cpp`
- `Server/Server/Model/Room/Room.h`
