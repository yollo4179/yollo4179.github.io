# 카메라 모드에 적용한 전략 패턴

## 적용 상황

1인칭, 3인칭, 조준 모드는 카메라 위치와 시야 계산이 다르다. 카메라 제어기는 모드 선택을 맡고, 각 모드의 계산은 전략 객체가 맡는다.

## 실행 흐름

```text
PlayerCameraController
  → 선택된 ICameraViewStrategy
  → FirstPerson / ThirdPerson / Aim
  → 해당 모드의 카메라 위치 계산
```

전략 계약은 모드 진입, 프레임 갱신, 종료, 즉시 위치 맞춤을 제공한다. 제어기는 모드를 바꿀 때 기존 전략을 종료하고 새 전략에 진입한다. 같은 모드로의 중복 전환은 건너뛴다.

| 전략 | 적용 상황 |
| --- | --- |
| FirstPersonCameraStrategy | 1인칭 시점 |
| ThirdPersonCameraStrategy | 캐릭터를 외부에서 보는 시점 |
| AimCameraStrategy | 조준 시점과 오프셋 적용 |

조준 전략은 3인칭 전략을 내부에서 사용해 배치·충돌·완화 계산을 재사용한다. 공통 계산은 객체 합성으로 공유하고, 모드 차이는 전략에 둔다.

## 책임 분리

제어기는 어느 전략을 사용할지 결정한다. 전략은 해당 시점에서 카메라를 어떻게 배치할지 계산한다. 시점 변경으로 수정되는 코드를 모드별 클래스에 모은 구조다.

## 코드 근거

- `Client/Assets/Game/Features/Player/Runtime/PlayerCameraController.cs`
- `Client/Assets/Game/Features/Player/Runtime/CameraStrategies/ICameraViewStrategy.cs`
- `Client/Assets/Game/Features/Player/Runtime/CameraStrategies/FirstPersonCameraStrategy.cs`
- `Client/Assets/Game/Features/Player/Runtime/CameraStrategies/ThirdPersonCameraStrategy.cs`
- `Client/Assets/Game/Features/Player/Runtime/CameraStrategies/AimCameraStrategy.cs`
