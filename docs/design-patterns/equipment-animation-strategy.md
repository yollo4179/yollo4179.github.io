# 장비별 행동과 애니메이션 구성에 적용한 전략 패턴

## 적용 상황

장비가 바뀌면 공격 행동, 손에 붙이는 위치, Animator Controller가 함께 바뀐다. 장비 모드 전략은 이 정책을 하나의 계약으로 묶는다.

## 실행 흐름

```text
장착 아이템 변경
  → CharacterModeSelector가 장비 전략 선택
  → 기존 전략 Exit / 새 전략 Enter
  → Catalog에서 캐릭터에 맞는 Animator Controller 선택
  → 컨트롤러 교체와 공격 상태 설정
```

| 구성 요소 | 역할 |
| --- | --- |
| ICharacterModeStrategy | 장비 모드, 주 행동, 근접 장비 부착 정책 |
| DefaultCharacterModeStrategy | 기본 컨트롤러 복원과 맨손 행동 |
| ConfiguredCharacterModeStrategy | Catalog 정의에 따른 Bat/Gun 공통 실행 |
| CharacterModeCatalog | 장비별 모드, 공격 상태, 컨트롤러 변형, 손 부착 위치 정의 |
| CharacterModeContext | 실제 Animator와 애니메이션 드라이버 연결 |

Bat/Gun을 각각 별도 전략 클래스로 늘리는 대신, 설정 기반 전략이 장비 데이터를 받는다. Catalog는 기본 캐릭터 컨트롤러에 대응하는 장비용 컨트롤러를 선택한다.

## Animator를 교체하는 과정

컨트롤러가 달라지면 Context는 `runtimeAnimatorController`를 교체하고 Animator를 다시 바인딩한다. 이후 이동·공격 드라이버와 상체 드라이버가 컨트롤러에 맞는 설정을 갱신한다.

장비 전략은 공격 레이어의 진입과 종료도 관리한다. 공격 진행률이나 진입 대기 시간을 확인해 임시 공격 설정을 정리하고, 모드 종료 시에도 공격 레이어를 정리한다.

## 상태 패턴과의 관계

장비 전략은 공통 캐릭터 상태 계약도 사용한다. **장비에 맞는 행동을 선택하는 부분은 Strategy**, **기존 모드를 종료하고 새 모드에 진입하는 부분은 상태 머신의 수명 처리**다.

애니메이션 전체를 하나의 전략으로 부르기보다 다음처럼 설명한다.

> 장비 모드에 전략 패턴을 적용해 공격 행동과 Animator Controller 구성을 교체했다. 게임 상태를 Animator 파라미터로 전달하는 처리는 별도의 어댑터로 분리했다.

## 코드 근거

- `Client/Assets/Game/Features/Player/Runtime/CharacterModes/ICharacterModeStrategy.cs`
- `Client/Assets/Game/Features/Player/Runtime/CharacterModes/CharacterModeSelector.cs`
- `Client/Assets/Game/Features/Player/Runtime/CharacterModes/CharacterModeStrategies.cs`
- `Client/Assets/Game/Features/Player/Runtime/CharacterModes/CharacterModeContext.cs`
- `Client/Assets/Game/Features/Player/Config/CharacterModeCatalog.cs`
