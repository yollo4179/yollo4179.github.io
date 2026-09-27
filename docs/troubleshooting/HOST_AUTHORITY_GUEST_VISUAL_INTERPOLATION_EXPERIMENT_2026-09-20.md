# 호스트 권위 게스트 표시 위치 보간 실험

- 작성일: 2026-09-20
- 브랜치: `fix/resolve-rubber-banding`
- 상태: 코드·자동 테스트 완료, 실제 두 PC ON/OFF 비교 전
- 기본값: OFF

## 목적

두 PC 일반 빌드에서 입력 공급·소비 기준선은 통과했지만, 사용자는 호스트 화면에서 게스트
캐릭터가 로컬 캐릭터보다 조금 덜 부드럽게 움직인다고 관찰했다.

호스트는 게스트의 2003 snapshot 표현을 별도로 만들지 않고, 자신이 60Hz로 직접 시뮬레이션하는
권위 actor를 화면에도 사용한다. 렌더 FPS가 물리 60Hz보다 높으면 같은 권위 위치를 여러 렌더
프레임에 표시한 뒤 다음 물리 위치로 이동하므로 시각적인 계단 움직임이 생길 수 있다.

이번 변경은 그 가설을 검증하기 위한 **호스트 화면 전용 위치 보간 실험**이다. 보간 부재가
원인으로 확정된 것은 아니므로 같은 실행 파일에서 옵션으로 켜고 끌 수 있게 했다.

## 적용 범위

```text
권위 FixedUpdate T 완료
  → 권위 root·CharacterController 위치 확정
  → snapshot용 CharacterMotorState 확정
  → 표시 이력에 T-1, T 위치 보관

SRP 카메라 렌더 시작
  → VisualRoot 위치만 Lerp(T-1, T, alpha)

SRP 카메라 렌더 종료
  → VisualRoot를 즉시 권위 위치로 복원
```

정상 진행에서는 화면이 권위 시뮬레이션보다 최대 한 물리 tick, 60Hz 기준 약 16.7ms 늦다.
회전은 이번 실험에서 보간하지 않는다.

## VisualRoot를 상시 보간하지 않은 이유

현재 `CharacterRig.VisualRoot`는 순수 그림 전용 Transform이 아니다.

- `CharacterMotor.VisualYaw`가 공격 방향의 권위 yaw로 사용한다.
- 3인칭 무기와 `GunPoint`가 VisualRoot 또는 그 아래 뼈에 연결될 수 있다.
- 공격 처리에서 무기 replica의 Transform을 총구 위치 후보로 읽는다.

따라서 LateUpdate에서 보간 위치를 계속 남겨 두면 다음 Update·FixedUpdate의 공격과 상호작용이
표시 지연 위치를 읽을 수 있다. 이번 구현은 카메라 렌더 시작 직전에만 표시 위치를 적용하고
렌더 종료 즉시 복원한다. 입력 처리, 공격 판정, 물리, snapshot 캡처가 실행되는 평상시에는
권위 위치가 유지된다.

## ON/OFF 및 측정 방법

기본 실행은 OFF이며 보간 전용 계측도 만들지 않는다.

```text
SSketch.exe
```

OFF 상태의 비교 수치를 수집할 때는 호스트 Player에 측정 인자만 전달한다.

```text
SSketch.exe -measure-host-authority-guest-visual
```

호스트 Player에 다음 인자를 추가하면 보간과 같은 계측이 함께 ON이다. 게스트 Player에는
어느 인자도 필요 없다.

```text
SSketch.exe -enable-host-authority-guest-visual-interpolation
```

호스트 로그에서 실제 상태를 확인한다.

```text
[rubber-banding][host-authority-guest-visual-interpolation]
enabled=0|1 measurement=0|1 mode=position-only renderBoundary=srp-camera delayTicks=1
```

같은 실행 파일에 인자만 다르게 사용하므로 OFF/ON 빌드가 달라지는 문제를 피할 수 있다.

## 최종 표시 위치 계측

계측은 물리 root가 아니라 카메라가 실제 렌더를 끝낸 시점의 `VisualRoot.position`을 읽는다.
프레임마다 문자열을 만들지 않고 메모리에 누적한 뒤 Entity별로 약 1초마다 한 줄만 출력한다.

```text
[rubber-banding][host-authority-visual]
```

| 필드 | 의미 |
|---|---|
| `enabled` | 이번 표본의 표시 위치 보간 ON/OFF |
| `renderFrames` | 집계한 게임 카메라 렌더 프레임 수 |
| `frameMsAvg/P95/Max` | 실제 렌더 프레임 간격 |
| `movingFrames` | 최근 권위 tick 속도가 0.05m/s 이상인 렌더 프레임 |
| `frozenFrames`, `frozenPct` | 권위 actor가 움직이는데 최종 표시 이동이 1mm 이하인 프레임 수·비율 |
| `visualSpeedAvg` | 최종 표시 모델의 프레임 간 거리 ÷ 실제 프레임 간격 |
| `visualSpeedStdDev`, `visualSpeedCvPct` | 표시 속도 표준편차와 평균 대비 변동계수 |
| `visualSpeedP95` | 표시 속도의 P95 |
| `authoritySpeedAvg` | 최근 두 완료 tick으로 계산한 권위 이동 속도 평균 |
| `latestRootLagCmAvg` | 최종 표시 위치와 마지막 완료 tick 위치의 평균 거리 |
| `estimatedRenderLagCmAvg` | 일정 속도 가정으로 추정한 현재 렌더 시각 권위 위치와 최종 표시 위치의 평균 거리 |
| `estimatedDisplayDelayMsP95/Max` | 위 거리 ÷ 권위 속도로 추정한 표시 지연 |

표시 지연 추정은 최근 두 권위 위치의 속도가 다음 렌더 시각까지 일정하다고 가정한다. 따라서
카메라 고정·평지 직선·가속 종료 구간에서만 판정값으로 사용한다. 점프, 충돌, 급회전,
teleport 구간의 지연값을 같은 표에 합치지 않는다.

### 설명용 이론 예시

다음 값은 실제 플레이 측정 결과가 아니라, 계측값이 무엇을 보여 주는지 설명하기 위한
단순 계산 예시다. 캐릭터가 일정하게 3m/s로 이동하고 물리는 60Hz, 렌더링은 일정한
180FPS라고 가정한다. 물리 한 tick의 이동량은 5cm이고, 이상적인 렌더 한 프레임의 이동량은
약 1.67cm다.

| 구분 | 보간 OFF | 보간 ON |
|---|---|---|
| 표시 방식 | 마지막으로 완료된 물리 위치를 그대로 표시 | 최근 두 물리 위치를 정상적으로 보간해 표시 |
| 렌더 프레임별 표시 이동량 예시 | 0 → 0 → 5cm → 0 → 0 → 5cm → … | 1.67 → 1.67 → 1.67cm → 1.67 → 1.67 → 1.67cm → … |
| 이동 중 정지 프레임 비율 | 약 66.7% | 0% |
| 프레임별 표시 속도 예시 | 0m/s, 0m/s, 9m/s | 3m/s, 3m/s, 3m/s |
| 평균 표시 속도 | 3m/s | 3m/s |
| 표시 속도 표준편차 | 약 4.24m/s | 0m/s |
| 표시 속도 변동계수 | 약 141.4% | 0% |
| 추가 표시 지연 | 이 단순 위상 예에서 0~11.1ms로 변동 | 약 16.7ms로 일정 |

두 방식의 평균 표시 속도는 같아도 OFF는 렌더 프레임 두 번 동안 멈춘 뒤 한 번에 이동한다.
따라서 평균 속도만으로는 부드러움을 판정할 수 없고, `frozenPct`, `visualSpeedStdDev`,
`visualSpeedCvPct`를 함께 비교해야 한다. ON은 움직임을 고르게 만드는 대신 약 한 물리 tick의
표시 지연을 추가하므로 `estimatedDisplayDelayMsP95/Max`도 반드시 함께 확인한다.

실제 실행에서는 물리와 렌더의 위상, 렌더 FPS 변동, 가속과 충돌 때문에 위 숫자와 달라질 수
있다. 이 표는 합격 기준이나 예상 개선율이 아니며, 실제 개선율은 같은 조건의 OFF/ON 로그로
계산한다. 특히 위의 정지 프레임 비율 66.7%는 현재 게임에서 측정한 값이 아니다.

### 이번 비교의 핵심 지표

호스트 표시 보간의 ON/OFF 판정은 다음 세 지표로 한정한다. 아래 값은 기존 결과 문서에서
이미 측정된 값이 아니라, 이번 실험 로그로 새로 확보할 값이다.

| 지표 | 계산 | 판정 방향 |
|---|---|---|
| 이동 중 표시 정지 프레임 비율 | 일정 속도 이동 구간에서 최종 표시 모델의 프레임 간 위치 변화가 1mm 이하인 프레임 ÷ 해당 구간 프레임 | ON에서 감소할수록 고른 표시 |
| 표시 속도 흔들림 | 최종 표시 위치의 프레임 간 이동량 ÷ 실제 프레임 간격으로 구한 속도의 표준편차와 변동계수 | ON에서 감소할수록 고른 표시 |
| 권위 상태 변화의 표시 지연 | 권위 actor의 정지·이동 시작·이동 방향 변경 시각부터 같은 변화가 최종 표시 모델에 처음 나타난 렌더 시각까지의 시간 | 부드러움 개선과 함께 상태 변화 반응이 과도하게 늦어지지 않는지 확인 |

평균 표시 속도는 두 방식 모두 실제 이동 속도와 같을 수 있으므로 핵심 판정값으로 사용하지
않는다. 프레임 간격의 P95·최댓값은 두 실행의 렌더 조건이 비슷했는지 확인하는 보조값으로만
함께 기록한다.

현재 로그의 `estimatedDisplayDelayMsP95/Max`는 일정 속도 직선 이동에서 공간 오차를 속도로
나눈 추정치다. 정지·이동 시작·방향 전환 이벤트의 실제 반응 시간을 직접 측정한 값은 아니다.
권위 상태 변화 지연을 수치로 판정하려면 권위 변화 tick의 시각과 최종 표시 모델이 같은 변화를
처음 보인 렌더 시각을 짝지어 기록하는 계측이 추가로 필요하다. 그 계측 전에는 위 필드를
정지·방향 전환 지연의 증거로 사용하지 않는다.

## 구현 안전장치

- 호스트 자신의 로컬 캐릭터에는 적용하지 않는다.
- 호스트가 직접 시뮬레이션하는 게스트 actor에만 적용한다.
- 권위 actor root와 `CharacterController`는 이동하지 않는다.
- 위치만 보간하고 권위 yaw와 표시 회전은 변경하지 않는다.
- FixedUpdate 실행 순서는 `HostWorldRunner=10000`, 표시 이력 캡처 `=11000`으로 권위 tick 완료 뒤 기록한다.
- catch-up FixedUpdate가 여러 번 실행되면 완료 tick마다 최근 두 위치가 갱신된다.
- `StateRevision`이 바뀌면 이력을 즉시 초기화해 teleport·리스폰성 이동을 과거 위치에서 보간하지 않는다.
- 스킨 교체와 actor 재등록은 새 컴포넌트와 새 이력으로 시작한다.
- 렌더 callback이 비정상적으로 끝나더라도 다음 권위 tick 캡처 전에 표시 위치를 방어적으로 복원한다.
- `VisualRoot == 권위 root` 구성에는 적용을 거절한다.

## 변경 파일

- `Client/Assets/Game/Features/PlayerMovement/Runtime/HostAuthorityGuestVisualInterpolator.cs`
- `Client/Assets/Game/Features/PlayerMovement/Runtime/HostAuthorityWorldBridge.cs`
- `Client/Assets/Game/Tests/Editor/HostAuthorityGuestVisualInterpolatorTests.cs`

## 자동 검증

Unity `6000.3.22f1` EditMode 결과다.

| 테스트 | 결과 | 확인 범위 |
|---|---:|---|
| `HostAuthorityGuestVisualInterpolatorTests` | 8/8 통과 | 기본 OFF·측정 전용 OFF·옵션 ON, 두 tick 위치 보간, 렌더 시각 위치 추정, alpha 제한, 권위 root 불변, 단일·중첩 렌더 뒤 복원, revision 변경 즉시 snap |
| `HostAuthorityServiceTests` + `HostWorldSimulationTests` | 77/77 통과 | 기존 입력 삽입, pre-tick, fallback, Jump, 권위 tick·snapshot 순서 회귀 없음 |
| 위 세 묶음 최종 동시 실행 | 85/85 통과 | 최종 소스 컴파일과 신규·기존 회귀 동시 확인 |

컴파일 오류는 없었다. 기존 범위 밖 `BareHandAttack.cs`, `VisionEffectState.cs`의 unreachable code
경고 2건은 첫 컴파일 로그에 남았으며 이번 변경에서 새로 만든 경고가 아니다.

자동 테스트는 Transform 소유권과 기존 입력 계약을 검증한 것이다. 실제 렌더 부드러움 개선과
카메라 렌더 callback에서의 최종 화면 결과는 Player 실행으로 확인해야 한다.

## 두 PC ON/OFF 비교 절차

새 4인 Profiler 캡처부터 하지 않는다. 이전 기준선과 같은 일반 빌드, 호스트 1명과 게스트 1명으로
비교한다.

### 실행 방법

표시 계측은 호스트가 직접 시뮬레이션하는 게스트 모델에서 수행되므로 시각 지표 로그는 호스트
것만 있으면 된다. 게스트는 같은 일반 빌드를 별도 인자 없이 실행한다. Development Build와
Profiler, 정상 2001 상세 캡처는 사용하지 않는다.

호스트 PowerShell 실행 예시는 다음과 같다. 두 실행은 동시에 하지 않고 OFF 측정 종료 후 ON을
별도로 실행한다.

```powershell
# 보간 OFF + 계측 ON
Start-Process -FilePath "C:\ssafy\S15P21D204\Client\Build\SSketch.exe" `
    -ArgumentList @(
        "-measure-host-authority-guest-visual",
        "-logFile",
        "C:\ssafy\S15P21D204\Client\Build\visual-off-host.log"
    )

# 보간 ON + 계측 ON
Start-Process -FilePath "C:\ssafy\S15P21D204\Client\Build\SSketch.exe" `
    -ArgumentList @(
        "-enable-host-authority-guest-visual-interpolation",
        "-logFile",
        "C:\ssafy\S15P21D204\Client\Build\visual-on-host.log"
    )
```

시작 로그에서 다음 값을 먼저 확인한다.

```text
OFF: enabled=0 measurement=1
ON:  enabled=1 measurement=1
```

둘 다 `mode=position-only renderBoundary=srp-camera delayTicks=1`이어야 한다.

### 조작 조건

1. 같은 실행 파일의 호스트에 측정 인자만 주어 OFF 실행한다.
2. 월드 진입과 스폰이 끝난 뒤 호스트는 멈춰 카메라를 고정한다.
3. 게스트는 평지에서 가속이 끝난 뒤 한 방향으로 20~30초 동안 일정하게 이동한다.
4. 직선 측정이 끝난 뒤 좌우 방향 전환, 점프, 벽 충돌, 무기 조준·공격, 순간이동 또는
   스테이지 전환을 별도 기능 확인 구간으로 실행한다.
5. 실행을 완전히 종료하고 같은 실행 파일의 호스트에서 측정 인자 대신 enable 인자를 사용해
   ON 실행한다.
6. 해상도, 품질, 카메라 위치, 이동 방향·시간과 게스트 조작을 가능한 한 같게 유지한다.

로딩, 스폰 직후, 정지, 방향 전환, 점프와 충돌 구간은 직선 이동 수치 집계에서 제외한다.
호스트 로그의 `[rubber-banding][host-authority-visual]` 중 대상 게스트 `entity`와 일정 속도 구간만
선택한다.

### 집계 방법

- 전체 정지 프레임 비율은 1초별 `frozenPct`를 단순 평균하지 않고
  `sum(frozenFrames) / sum(movingFrames) * 100`으로 계산한다.
- 전체 표시 속도 평균과 표준편차는 각 창의 `movingFrames`, `visualSpeedAvg`,
  `visualSpeedStdDev`를 이용해 표본 수로 가중 결합한다. `visualSpeedCvPct`는 결합한 표준편차를
  결합한 평균으로 나누어 다시 계산한다.
- 로그에는 1초 창별 지연 P95만 남으므로 전 구간의 단일 P95로 오해하지 않는다. 안정 구간의
  `estimatedDisplayDelayMsP95` 중앙값과 `estimatedDisplayDelayMsMax` 최댓값을 OFF/ON으로
  비교한다.
- `authoritySpeedAvg`와 `frameMsP95/Max`가 두 실행에서 크게 다르면 동일 조건 비교로 판정하지
  않고 다시 조건을 맞춘다.

다음 조건을 함께 확인한다.

| 영역 | 통과 기준 |
|---|---|
| 표시 | 일정 속도 이동의 60Hz 계단 느낌이 OFF보다 줄어듦 |
| 표시 수치 | `frozenPct`, `visualSpeedStdDev`, `visualSpeedCvPct`가 OFF보다 감소 |
| 표시 지연 | `estimatedDisplayDelayMsP95/Max`가 허용한 약 1tick 지연 범위인지 확인 |
| 입력 | command/s, 실제 소비율, fallback이 기존 두 PC 기준선 범위 유지 |
| 물리 | 충돌 위치, 점프, 낙하, 순간이동 결과가 OFF와 동일 |
| 방향 | 공격 방향과 몸 방향이 기존 권위 결과와 동일 |
| 무기 | 총구·무기 소켓이 화면 모델과 함께 보이고, 명중 판정이 표시 지연 위치로 이동하지 않음 |
| 수명 | 스킨 교체·월드 전환 뒤 이전 위치에서 미끄러져 오지 않음 |

## 두 PC 2인 ON/OFF 실측 결과

커밋 `23bcf381`의 같은 Windows 일반 빌드를 사용해 호스트 1명과 게스트 1명으로 OFF와 ON을
각각 실행했다. Profiler와 Development Build는 사용하지 않았다. 사용자는 ON 화면이 특히
만족스럽다고 평가했다.

일정 속도 비교에는 다음 조건을 모두 만족한 1초 집계 창만 사용했다.

- `authoritySpeedAvg`가 3.95~4.05m/s
- `movingFrames == renderFrames`
- OFF는 `visual-off-host.log`, ON은 `visual-on-host.log`

각 창의 평균과 표준편차는 `movingFrames`로 가중 결합했다. 정지 프레임 비율은 창별 비율의
평균이 아니라 전체 `frozenFrames / movingFrames`로 계산했다.

| 지표 | OFF | ON | 해석 |
|---|---:|---:|---|
| 선택 창 | 94 | 63 | OFF 5,664프레임, ON 3,808프레임 |
| 이동 중 표시 정지 프레임 | 93, 1.642% | 0, 0% | 측정 구간에서 1mm 이하 표시 이동 표본이 사라짐 |
| 평균 표시 속도 | 4.030m/s | 4.010m/s | 이동 속도 자체를 높인 변경이 아님 |
| 표시 속도 표준편차 | 0.906m/s | 0.355m/s | 약 60.8% 감소 |
| 표시 속도 변동계수 | 22.48% | 8.85% | 평균 속도 대비 프레임별 흔들림 감소 |
| 창별 추정 지연 P95 중앙값 | 10.03ms | 16.67ms | ON은 허용한 약 1tick 표시 지연 범위 |

이 결과를 “화면 부드러움 61% 향상”으로 표현하지 않는다. 정확한 표현은 **선택한 일정 속도
구간에서 표시 속도 표준편차가 약 60.8% 감소했다**이다. 표준편차와 변동계수는 같은 표시
속도 표본에서 파생되므로 서로 완전히 독립적인 증거도 아니다.

전체 비교에서는 OFF의 프레임 간격이 더 불안정한 창도 포함됐다. 프레임 조건을
`frameMsP95 <= 20ms`, `frameMsMax <= 25.5ms`로 추가 제한한 결과는 다음과 같다.

| 지표 | OFF | ON |
|---|---:|---:|
| 선택 창·이동 프레임 | 33개·1,998 | 62개·3,747 |
| 이동 중 표시 정지 프레임 비율 | 0.250% | 0% |
| 표시 속도 표준편차 | 0.404m/s | 0.350m/s |
| 표시 속도 변동계수 | 10.06% | 8.73% |
| 평균 프레임 간격 | 16.664ms | 16.669ms |
| 창별 frame P95 중앙값 | 18.292ms | 18.150ms |
| 구간 frame 최댓값 | 24.992ms | 25.252ms |

프레임 조건을 제한하면 표준편차 감소 폭은 약 13.4%지만 개선 방향은 유지됐다. 따라서 전체
60.8%를 보간만의 순수 효과라고 단정하지 않고, **전체 비교에서 큰 개선이 관측됐으며 비슷한
프레임 조건에서도 개선 방향이 유지됐다**고 판정한다.

`10.03 -> 16.67ms`는 키 입력부터 화면 반응까지의 실제 지연이 아니다. 일정 속도를 가정해
공간 오차를 속도로 나눈 각 1초 창의 `estimatedDisplayDelayMsP95` 중앙값이다. 정지·이동 시작과
방향 전환의 실제 반응 시간을 직접 측정하지 않았으므로 “입력 지연이 6.64ms 증가했다”는
결론에는 사용하지 않는다.

## 두 PC·1호스트+3게스트 ON 회귀 검증

PC A에는 호스트 1개, PC B에는 게스트 3개를 실행했다. 실제 네 PC 분산 환경이 아니라
**두 PC·1호스트+3게스트 다중 실행 조건**이다. 호스트만 보간 ON 옵션을 사용했고 게스트에는 보간 옵션을
주지 않았다. 게스트 로그와 Entity 매핑은 다음과 같다.

| 로그 | Entity |
|---|---:|
| `guest1-log` | 3 |
| `guest2-log` | 2 |
| `guest3-log` | 4 |

### 호스트 표시·시뮬레이션

- 호스트는 actor 4명을 유지하면서 권위 `fixedHz/stepHz` 약 60Hz를 유지했다.
- 게스트 Entity 2, 3, 4 모두 `enabled=1` 표시 계측이 생성됐다.
- 임의 조작을 포함해 이동 표본이 30프레임 이상인 창을 합치면 Entity 2는 913프레임,
  Entity 3은 4,426프레임에서 표시 정지 프레임 0이었다.
- Entity 4는 5,828프레임 중 9프레임으로 표시 정지 비율 약 0.154%였다.
- 세 게스트의 이동 패턴과 속도가 서로 달라 표시 속도 표준편차를 Entity 사이의 성능 비교값으로
  사용하지 않는다.

이 조건에서는 호스트가 게스트 세 명에게 표시 보간을 동시에 적용하고도 권위 틱과 렌더 표시를
유지했다. 따라서 **호스트 표시 경로의 4 actor 기능 회귀는 두 PC·1+3 조건에서 통과**로
판정한다.

### 다중 실행 입력 부하와 관찰된 떨림

안정된 `room=5, world=5, authority=5` 구간의 호스트 입력 소비 결과는 다음과 같다.

| 게스트·Entity | 실제 명령 소비 | held fallback | neutral fallback | 최대 연속 fallback |
|---|---:|---:|---:|---:|
| guest1·Entity 3 | 95.42% | 4.06% | 0.52% | 9tick |
| guest2·Entity 2 | 89.44% | 9.29% | 1.28% | 18tick |
| guest3·Entity 4 | 87.41% | 10.00% | 2.59% | 15tick |

PC B의 백그라운드 인스턴스는 일부 구간에서 약 11~20FPS까지 내려갔다. 호스트 권위 틱은
60Hz를 유지했지만, 게스트 입력이 늦거나 stale 처리되면서 실제 명령 소비율이 기존 두 PC
1클라이언트 기준선보다 낮아졌다. 사용자는 guest1을 전진시키려 할 때 앞으로 떨리며 잠시
나가지 못하는 구간을 한 번 관찰했다.

이 관찰 시각을 별도로 표시하지 않아 해당 한 번의 현상을 입력 fallback, 충돌, 게스트 로컬
프레임 중 하나로 확정할 수는 없다. guest1에 대응하는 Entity 3은 안정 world 구간에서
`movingNeutralTicks=0`이었으므로 그 체감을 특정 neutral fallback과 직접 연결하지도 않는다.
다만 세 게스트 전체에서 늦은 입력과 fallback이 증가한 것은 확인됐다.

따라서 이를 “물리 엔진이 불안정했다”고 기록하지 않는다. 가능한 경로는 다음과 같다.

```text
게스트 PC 다중 실행 부하
  -> 입력 생성·송신 또는 처리가 늦어짐
  -> 권위 캐릭터가 held/neutral fallback으로 불균일하게 이동할 수 있음
  -> 그 권위 이동 결과가 화면 움직임에도 나타남
```

표시 보간은 정상적으로 계산된 두 권위 위치 사이를 고르게 보여 주지만, 입력 부하로 권위 상태
자체가 멈추거나 불연속이면 이를 제거할 수 없다. 이번 결과는 **2PC·4클라이언트 기능 회귀
확인**에는 사용할 수 있지만, 입력 정확성이나 실제 네 PC 분산 성능, 세 게스트 동시 이동을
통과한 결과로 확대하지 않는다.

## 현재 판정과 남은 범위

현재 확정한 내용은 다음과 같다.

- 표시 전용 위치 보간을 입력·물리 계약과 분리해 구현했고 자동 회귀 85/85가 통과했다.
- 두 PC 2인 A/B에서 같은 평균 이동 속도를 유지하면서 표시 속도 편차와 정지 프레임이 감소했다.
- ON의 일정 속도 추정 표시 지연은 허용한 약 1tick 범위였다.
- 사용자의 주관 평가와 표시 지표가 같은 개선 방향을 보였다.
- 두 PC·1호스트+3게스트 조건에서 게스트 세 명의 보간 활성화와 호스트 60Hz 권위 틱을 확인했다.

아직 다음을 확정하지 않는다.

- 실제 네 PC·1클라이언트씩 분산한 4인 성능
- 세 게스트의 동시 이동
- 정지·이동 시작·방향 전환의 실제 표시 반응 시간
- 두 PC·1호스트+3게스트 부하 조건의 입력 정확성 통과
- 게스트 화면에서 관찰된 일회성 snapshot 도착 지터까지 해결하는지

특히 게스트가 보는 원격 호스트의 snapshot 지터는 이 패치의 대상이 아니다.

다음 단계는 보간 활성화와 1초 표시 계측을 분리하는 것이다. 최종 기본값 후보는 호스트 게스트
표시 위치 보간 ON, 표시 품질 계측 OFF이며, 문제 재현을 위한 보간 OFF 옵션은 유지한다. 측정을
끌 때는 로그 출력뿐 아니라 표본 수집과 정렬도 생략한다. 그 뒤 보간 기본 ON 여부를 결정한다.

## 관련 문서

- [입력·fallback·원격 이동 개선 수치 추이](./INPUT_FALLBACK_IMPROVEMENT_TREND_2026-09-20.md)
- [두 PC 일반 빌드 입력 기준선](./TWO_PC_NORMAL_BUILD_INPUT_BASELINE_2026-09-19.md)
