---
layout: ssketch-article
ssketch_styles: true
featured: true
project_slug: ssketch
number: '12'
order: 12
learning_order: 12
title: 캐릭터 행동·애니메이션·카메라의 변경 지점을 분리한 구조
short_title: 캐릭터와 카메라 설계
short_category: 행동과 표현의 분리
series_category: Client Framework
detail_category: 게임 클라이언트
permalink: /projects/ssketch/technical/framework-character-camera/
summary: 캐릭터의 접지·공중·공격 행동은 상태로 나누고 장비와 카메라는 전략으로 교체했다. 게임 상태를 Animator 파라미터로 바꾸는 처리는 어댑터로 분리했다.
result_label: State · Strategy · Animator Adapter
tags: [Architecture, Unity, State, Strategy, Adapter]
nav_context: projects
---

## 상황·장비·시점에 따라 달라지는 동작을 나눴다

접지와 공중에서는 입력 처리 방식이 다르고, 장비가 바뀌면 공격과 애니메이션 구성이 달라진다. 카메라 시점마다 위치 계산도 다르다. 캐릭터의 상황은 상태로, 교체할 행동 정책은 전략으로 분리했다.

## 디렉터리와 파일 구조

```text
Client/Assets/Game/
├─ Core/StateMachines/
│  ├─ ICharacterState.cs
│  └─ CharacterStateMachine.cs
└─ Features/
   ├─ Player/
   │  ├─ Config/
   │  │  └─ CharacterModeCatalog.cs
   │  └─ Runtime/
   │     ├─ PlayerCameraController.cs
   │     ├─ PlayerAnimatorDriver.cs
   │     ├─ PlayerUpperBodyAnimator.cs
   │     ├─ States/
   │     │  ├─ PlayerStateContext.cs
   │     │  ├─ PlayerGroundedState.cs
   │     │  ├─ PlayerAirborneState.cs
   │     │  └─ PlayerBasicAttackState.cs
   │     ├─ CharacterModes/
   │     │  ├─ ICharacterModeStrategy.cs
   │     │  ├─ CharacterModeSelector.cs
   │     │  ├─ CharacterModeStrategies.cs
   │     │  └─ CharacterModeContext.cs
   │     └─ CameraStrategies/
   │        ├─ ICameraViewStrategy.cs
   │        ├─ CameraStrategyContext.cs
   │        ├─ FirstPersonCameraStrategy.cs
   │        ├─ ThirdPersonCameraStrategy.cs
   │        └─ AimCameraStrategy.cs
   └─ PlayerMovement/Runtime/
      └─ RemoteAnimatorDriver.cs
```

## 캐릭터 행동에는 상태 패턴을 적용했다

상태 머신은 현재 상태를 보관하고 진입·갱신·종료 순서를 관리한다. 상태는 해당 상황에서 가능한 행동과 전환 조건을 판단한다.

```text
현재 상태의 Tick
  → 상태별 입력과 전환 조건 처리
  → 기존 상태 Exit
  → 다음 상태 Enter
```

| 상태 | 책임 |
| --- | --- |
| 접지 | 지상 이동, 공격 진입, 점프와 공중 전환 |
| 공중 | 공중 행동과 상태 전환 |
| 기본 공격 | 공격 상태의 행동과 전환 |

접지 상태가 점프 입력을 받으면 Motor에 점프를 적용하고 애니메이션에 점프를 알린 뒤 공중 상태로 전환한다. **상태는 행동을 결정하고 Motor는 이동을 수행한다.**

## 장비 전략이 행동과 Animator 구성을 교체한다

장비 선택기는 아이템에 맞는 전략을 선택한다. 기본 전략은 맨손의 컨트롤러를 복원하고, 설정 기반 전략은 Catalog의 장비 정의를 사용한다.

```text
아이템 변경
  → 장비 전략 선택
  → 기존 전략 종료 / 새 전략 진입
  → 캐릭터에 맞는 장비용 Animator Controller 선택
  → 컨트롤러와 공격 설정 갱신
```

Catalog에는 장비 모드, 기본 공격 상태, 캐릭터별 컨트롤러 변형, 손 부착 위치를 정의했다. Bat/Gun마다 클래스를 늘리는 대신 공통 설정 기반 전략이 장비 데이터를 받아 실행한다.

전략은 주 행동과 장비 부착 정책을 제공하고 공격 레이어의 진입·종료도 관리한다. 컨트롤러가 달라지면 Context가 Animator를 다시 바인딩하고 이동·공격 및 상체 드라이버의 설정을 갱신한다.

장비 전략은 캐릭터 상태 계약도 사용한다. **장비별 행동 선택은 전략의 책임이고, 모드 전환의 진입·종료 순서는 상태 머신을 재사용한다.**

## 애니메이션 드라이버는 게임 상태를 변환한다

```text
로컬 행동 상태 → 애니메이션 드라이버 → Animator
원격 확정 상태 → 원격 드라이버 → 공통 애니메이션 드라이버 → Animator
```

애니메이션 드라이버는 이동·점프·접지·공격을 Animator 파라미터와 트리거로 변환하는 <span class="notice-pink">어댑터</span>다. 상태 클래스가 파라미터 문자열과 레이어 구성을 직접 다루지 않도록 경계를 뒀다.

원격 드라이버도 같은 애니메이션 규칙을 사용한다. 원격 이동 정보는 로컬 입력 크기의 규칙에 맞게 변환하고 달리기 여부는 별도로 전달한다. 장비 전략이 컨트롤러 구성을 선택하면 드라이버가 그 설정에 맞춰 게임 상태를 반영한다.

## 카메라 계산에는 전략 패턴을 적용했다

```text
PlayerCameraController
  → ICameraViewStrategy
     ├─ FirstPersonCameraStrategy
     ├─ ThirdPersonCameraStrategy
     └─ AimCameraStrategy
```

카메라 제어기는 사용할 전략을 선택하고, 전략은 시점별 배치 계산을 맡는다. 모드를 바꿀 때 제어기는 기존 전략을 종료하고 새 전략에 진입한다. 같은 모드의 중복 전환은 건너뛴다.

조준 전략은 3인칭 전략을 내부에서 사용해 카메라 배치·충돌·완화 계산을 재사용한다. 조준 차이는 전략에 두고 공통 계산은 객체 합성으로 공유한다.

## 변경할 책임을 구분했다

| 변경 | 담당 |
| --- | --- |
| 캐릭터 상황별 행동과 전환 | 캐릭터 상태 |
| 장비별 공격과 컨트롤러 구성 | 장비 전략과 Catalog |
| 게임 상태의 Animator 표현 | 애니메이션 드라이버 |
| 시점별 카메라 계산 | 카메라 전략 |

**행동 결정, 장비 정책, 애니메이션 변환, 카메라 계산의 변경 지점을 나눈 구조**다. 게임 페이즈는 별도의 전략 객체로 구성하지 않고 진행 상태의 매핑과 전환 조정으로 연결했다.
