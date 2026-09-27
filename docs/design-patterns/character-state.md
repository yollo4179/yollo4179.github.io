# 캐릭터 행동에 적용한 상태 패턴

## 적용 상황

캐릭터는 접지, 공중, 공격 상태에 따라 같은 입력도 다르게 처리한다. 각 상태가 행동과 전환 조건을 맡고, 상태 머신은 전환 순서를 맡는다.

```text
CharacterStateMachine
  → 현재 상태 Tick
  → 상태의 전환 조건 만족
  → 기존 상태 Exit
  → 다음 상태 Enter
```

| 구성 요소 | 책임 |
| --- | --- |
| ICharacterState<TContext> | 진입·갱신·종료 계약 |
| CharacterStateMachine<TContext> | 현재 상태 보관과 전환 순서 |
| PlayerGroundedState | 접지 중 이동·공격·점프 입력 처리 |
| PlayerAirborneState | 공중 상태 행동 |
| PlayerBasicAttackState | 기본 공격 상태 행동 |
| 상태 Context | Motor와 애니메이션 드라이버 등 필요한 객체 전달 |

접지 상태에서 공격 입력을 받으면 공격 상태로 전환한다. 점프 입력을 받으면 Motor에 점프를 적용하고 애니메이션에 점프를 알린 뒤 공중 상태로 전환한다.

## 책임 분리

- 상태는 어떤 행동과 전환이 가능한지 결정한다.
- Motor는 이동을 수행한다.
- 애니메이션 드라이버는 상태의 결과를 Animator에 전달한다.
- 상태 머신은 전환 전후의 호출 순서를 유지한다.

상태 패턴은 캐릭터의 상황에 따라 행동이 달라지는 구조다. 카메라 전략은 선택한 시점의 계산 방법을 바꾸는 구조다.

## 코드 근거

- `Client/Assets/Game/Core/StateMachines/ICharacterState.cs`
- `Client/Assets/Game/Core/StateMachines/CharacterStateMachine.cs`
- `Client/Assets/Game/Features/Player/Runtime/States/PlayerGroundedState.cs`
- `Client/Assets/Game/Features/Player/Runtime/States/PlayerAirborneState.cs`
- `Client/Assets/Game/Features/Player/Runtime/States/PlayerBasicAttackState.cs`
