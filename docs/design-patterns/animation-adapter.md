# 게임 상태와 Animator 사이의 어댑터

## 적용 상황

이동 상태와 네트워크 상태가 Animator 파라미터 이름이나 레이어 구성을 직접 다루면 애니메이션 변경이 여러 기능에 퍼진다. 애니메이션 드라이버가 두 표현을 연결한다.

```text
로컬 캐릭터 상태 → PlayerAnimatorDriver → Animator
원격 확정 상태 → RemoteAnimatorDriver → PlayerAnimatorDriver → Animator
```

## 적용 방식

`PlayerAnimatorDriver`는 이동, 점프, 접지, 공격 동작을 Animator 파라미터와 트리거로 변환한다. 애니메이션 설정에 정의된 파라미터는 해시로 보관한다. 상태 클래스는 Animator 문자열을 직접 선택하지 않는다.

`RemoteAnimatorDriver`는 원격 캐릭터의 확정 상태를 같은 드라이버의 입력으로 변환한다. 원격 캐릭터도 공통 애니메이션 규칙을 사용한다. 네트워크가 애니메이션 클립 자체를 전송하는 구조는 아니다.

이동 파라미터의 단위도 맞춘다. 로컬 이동 입력의 크기를 사용하는 규칙에 맞춰 원격 이동은 방향의 유무를 정규화해서 전달하고, 달리기 여부는 별도 값으로 전달한다. 물리 속도의 m/s 값을 그대로 이동 입력 크기로 사용하지 않는다.

## 장비 전략과의 연결

장비 전략은 사용할 컨트롤러와 공격 설정을 결정한다. Context가 컨트롤러를 교체하면 드라이버가 공격 상태와 레이어 설정을 갱신한다. `PlayerUpperBodyAnimator`는 장비·상체 표현을 담당한다.

캐릭터를 다시 구성할 때 Animator를 다시 바인딩하므로 풀에서 재사용한 캐릭터가 이전 재생 상태를 그대로 이어받지 않도록 처리한다.

## 코드 근거

- `Client/Assets/Game/Features/Player/Runtime/PlayerAnimatorDriver.cs`
- `Client/Assets/Game/Features/Player/Runtime/PlayerUpperBodyAnimator.cs`
- `Client/Assets/Game/Features/PlayerMovement/Runtime/RemoteAnimatorDriver.cs`
- `Client/Assets/Game/Features/Player/Runtime/CharacterModes/CharacterModeContext.cs`
