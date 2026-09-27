# SSketch 네트워크 이동·입력 트러블슈팅 아카이브

- 정리 기준: 2026-09-20
- 원본 브랜치: `fix/resolve-rubber-banding`
- 문서 기준 커밋: `b1d3ec4f`
- 구현 기준 커밋: `23bcf381`
- 범위: 원격 이동 떨림, 호스트·게스트 입력 fallback, Jump 입력 누락, 2001 입력 처리 비용, 호스트 화면의 게스트 표시 보간

이 디렉터리는 문제를 처음 계측한 시점부터 호스트 표시 보간의 2인 A/B와 1호스트+3게스트 회귀 검증까지 보존한다. `troubleshooting/`에는 판단과 수치가 있고, `logs/`에는 각 단계의 원본 실행 로그가 있다. `test-results/`에는 단계별 Unity EditMode 실행 로그와 NUnit XML 결과가 있다.

## 관련 커밋

| 순서 | 커밋 | 변경 |
|---:|---|---|
| 1 | `7c871d1d52b8eb57ddb69821ceb1d3cd41e6f358` | `fix: 원격 캐릭터 러버밴딩 보간 안정화` |
| 2 | `2ef05998fa83eab87cf2695bddc109aa04904981` | `fix: 권위 입력 공급과 부하 진단 개선` |
| 3 | `4870c107708a48f42a9520bbd24d1b882e90f1de` | `fix:점프 누르면 바닥으로꽂히는 문제 해결_점프 선행 입력` |
| 4 | `035fcee324b88480a2093f87333f45cecf096c27` | `fix: 게스트 입력을 호스트 틱 전에 처리` |
| 5 | `d6d69221e21e3d3f44f0d501211be4d6c37c47c0` | `fix: 플레이어 입력 배치 상세 캡처 비용 제거` |
| 6 | `23bcf38196cfc0f69636958d02cbde3f2338ce40` | `feat: 호스트 권위 게스트 표시 보간 실험 추가` |
| 7 | `b1d3ec4f44003d3dc31f16abd530ffe794c5f56f` | `docs: 게스트 표시 보간 실측 결과 기록` |

실행 디렉터리의 `versionId`에 `dirty`가 포함된 경우 Git 커밋 뒤에 미커밋 변경이 포함된 빌드다. 같은 Git 커밋이라도 `asm-...` 값이 다르면 실제 `Assembly-CSharp` 바이너리가 다를 수 있으므로, 각 실행 폴더의 `manifest.json`을 로그와 함께 보존한다.

## 핵심 개선 수치

| 주제 | 변경 전 | 변경 후 | 정확한 해석 |
|---|---:|---:|---|
| 원격 캐릭터 25cm 이상 화면 이동 | 37회 | 0회 | HostTick 시간축 적용 뒤 대표 구간의 큰 화면 step 제거 |
| 원격 캐릭터 대표 최대 화면 이동 | 73.47cm | 21.32~23.06cm | 패킷 수신 시각 압축 재생으로 생긴 급가속형 러버밴딩 감소 |
| 동일 PC 4인 호스트 실제 입력 | 51.6% | 100% | 호스트 로컬 입력을 권위 `ResolveTick` 직전 준비 |
| 동일 PC 4인 호스트 fallback | 48.4% | 0% | 호스트 로컬 입력 공급 순서 개선 결과 |
| Jump 첫 삽입 `RejectedStale` | 13.51% | 1.74% | 새 Jump 명령 조기 송신 뒤 상대 약 87.1% 감소 |
| 지각 Jump 생성→첫 송신 대기 | 평균 20.160ms | 0ms | 정기 송신 대기를 제거한 결과 |
| 후속 pre-tick 실행 Jump 첫 삽입 | - | 65/65 Accepted | 입력 버퍼 삽입 기준이며 CharacterMotor의 실제 점프 허용 횟수와는 구분 |
| 게스트 fallback | 21.95~24.14% | 3.09~4.57% | 호스트가 이미 받은 2001 입력을 권위 tick 전에 전달한 결과 |
| 입력이 있던 Pump 평균 | 4.019ms | 0.106660ms | 정상 2001 전체 payload 상세 캡처를 기본 OFF로 바꾼 뒤 97.3% 감소 |
| 느린 Profiler 행 직접 Diagnostics | 22.8414ms / 161,303B | 0.0042ms / 0B | 상세 포맷팅 전 조기 반환 결과 |
| 두 PC 일반 빌드 게스트 명령 | - | 59.986/s | 호스트 권위 tick 60.004/s와 사실상 일치 |
| 두 PC 일반 빌드 실제 입력 소비 | - | 99.461% | steady 207.087초 구간 |
| 두 PC 일반 빌드 fallback | - | 0.539% | 67/12,426 tick |
| 호스트 화면 표시 속도 표준편차 | 0.906m/s | 0.355m/s | 선택한 일정 속도 구간에서 약 60.8% 감소 |
| 호스트 화면 표시 정지 프레임 | 1.642% | 0% | 1mm 이하 이동 표본 기준, 2인 A/B 선택 구간 |
| 비슷한 프레임 조건의 표시 속도 표준편차 | 0.404m/s | 0.350m/s | 약 13.4% 감소로 개선 방향 유지 |

`0.906m/s → 0.355m/s`는 “화면 부드러움이 61% 향상”이라는 뜻이 아니다. 정확한 표현은 **선택한 일정 속도 구간에서 표시 속도 표준편차가 약 60.8% 감소했다**이다.

## 처음부터 끝까지의 문제와 해결 순서

### 1. 원격 캐릭터 떨림과 큰 위치 이동

원격 보간이 snapshot의 HostTick이 아니라 로컬 수신 시각을 시간 폭으로 사용했다. Unity가 한 프레임에서 여러 snapshot을 처리하면 상태 간 시간이 압축돼 급가속·되감기처럼 보였다. HostTick 시간축 적용 뒤 25cm 이상 화면 step이 37회에서 0회로 줄었다.

- 상세 문서: [`troubleshooting/INPUT_FALLBACK_IMPROVEMENT_TREND_2026-09-20.md`](./troubleshooting/INPUT_FALLBACK_IMPROVEMENT_TREND_2026-09-20.md)
- 초기 분석 원문: [`troubleshooting/RUBBER_BANDING_POST_BACKFILL_LOG_ANALYSIS_2026-09-18.md`](./troubleshooting/RUBBER_BANDING_POST_BACKFILL_LOG_ANALYSIS_2026-09-18.md)
- 초기 로그: [`logs/2026-09-18-rubber-banding/`](./logs/2026-09-18-rubber-banding/)

### 2. 호스트 입력 fallback 증가

동일 PC 4인 부하에서 호스트 Update가 약 31Hz로 낮아졌지만 권위 시뮬레이션은 약 60Hz로 catch-up했다. 입력 생성보다 물리 소비가 앞서 호스트 실제 입력은 51.6%, fallback은 48.4%였다. 호스트가 각 권위 tick의 `ResolveTick` 직전에 입력을 준비하도록 바꾼 뒤 실제 입력은 100%, fallback은 0%가 됐다.

- 상세 문서: [`troubleshooting/FOUR_PLAYER_HOST_LOAD_RESULT_AND_GOALS_2026-09-19.md`](./troubleshooting/FOUR_PLAYER_HOST_LOAD_RESULT_AND_GOALS_2026-09-19.md)
- 단계 로그: [`logs/2026-09-19-input-pipeline/01-host-pre-tick/`](./logs/2026-09-19-input-pipeline/01-host-pre-tick/)

### 3. Jump 입력이 씹히거나 바닥으로 돌아오는 현상

반복 Jump를 생성부터 첫 송신·첫 삽입까지 연결한 결과, 정기 송신을 기다린 명령이 호스트의 확정 tick 뒤에 도착해 `RejectedStale`이 되는 경로를 확인했다. 새 불변 명령에 Jump가 연결된 경우만 즉시 송신해 지각 거절률을 13.51%에서 1.74%로 낮췄고, 후속 2001 pre-tick 실행에서는 첫 삽입 65/65가 Accepted였다.

- 진단 로그: [`logs/2026-09-19-input-pipeline/02-jump-send-boundary/`](./logs/2026-09-19-input-pipeline/02-jump-send-boundary/)
- 개선 로그: [`logs/2026-09-19-input-pipeline/03-jump-early-send/`](./logs/2026-09-19-input-pipeline/03-jump-early-send/)

### 4. 게스트 입력 fallback 증가

게스트 입력 datagram이 소켓에 이미 도착했어도 Unity Update Pump까지 기다리는 동안 호스트 권위 tick이 먼저 확정되는 문제가 남았다. 2001 전용 큐를 권위 `ResolveTick` 전에 Pump하도록 바꿔 게스트 fallback을 21.95~24.14%에서 3.09~4.57%로 낮췄다.

- 개선 로그: [`logs/2026-09-19-input-pipeline/04-player-input-pre-tick/`](./logs/2026-09-19-input-pipeline/04-player-input-pre-tick/)

### 5. 입력 처리 진단 비용

Profiler에서 느린 Pump의 98.26%, 보통 Pump의 92.21%가 `Network.PlayerInputBatch.Diagnostics` 포함 시간이었다. 정상 2001 payload의 reflection 기반 전체 포맷팅을 기본 OFF로 분리한 뒤 입력이 있던 Pump 평균은 4.019ms에서 0.106660ms로 줄었다.

- 상세 문서: [`troubleshooting/HOST_PROFILER_PUMP_COMPARISON_2026-09-19.md`](./troubleshooting/HOST_PROFILER_PUMP_COMPARISON_2026-09-19.md)
- 텍스트 로그: [`logs/2026-09-19-input-pipeline/05-pump-detail-on/`](./logs/2026-09-19-input-pipeline/05-pump-detail-on/), [`06-pump-detail-off/`](./logs/2026-09-19-input-pipeline/06-pump-detail-off/), [`07-profiler-before-capture-removal/`](./logs/2026-09-19-input-pipeline/07-profiler-before-capture-removal/), [`08-profiler-after-capture-removal/`](./logs/2026-09-19-input-pipeline/08-profiler-after-capture-removal/)
- Profiler `.raw` 원본은 각각 약 1.46GB와 755MB이므로 GitHub 파일 제한을 넘는다. 이 아카이브에는 텍스트 로그와 manifest만 두고, raw 경로와 추출 수치는 상세 문서에 보존한다.

### 6. 두 PC 일반 빌드 입력 기준선

Profiler를 끈 두 PC 2인 steady 구간에서 게스트는 59.986 command/s를 생성했고 호스트는 99.461%를 실제 소비했다. fallback은 0.539%였다. 이 결과는 두 PC 2인 입력 공급·소비 기준선이며 4인 전체 성능을 의미하지 않는다.

- 상세 문서: [`troubleshooting/TWO_PC_NORMAL_BUILD_INPUT_BASELINE_2026-09-19.md`](./troubleshooting/TWO_PC_NORMAL_BUILD_INPUT_BASELINE_2026-09-19.md)
- 원본 로그: [`logs/2026-09-19-two-pc-input-baseline/`](./logs/2026-09-19-two-pc-input-baseline/)

### 7. 호스트 화면의 게스트 표시 떨림

입력 기준선과 별개로 호스트는 권위 actor의 60Hz 물리 위치를 렌더 프레임에 직접 표시했다. 물리 root와 판정은 유지하고 표시 모델 위치만 최근 두 권위 tick 사이에서 보간했다. 두 PC 2인 A/B에서 평균 표시 속도는 4.030m/s와 4.010m/s로 거의 같았고, 표시 속도 표준편차는 0.906m/s에서 0.355m/s로 줄었다.

- 상세 문서: [`troubleshooting/HOST_AUTHORITY_GUEST_VISUAL_INTERPOLATION_EXPERIMENT_2026-09-20.md`](./troubleshooting/HOST_AUTHORITY_GUEST_VISUAL_INTERPOLATION_EXPERIMENT_2026-09-20.md)
- 2인 A/B 로그: [`logs/2026-09-20-visual-interpolation/01-two-player-ab/`](./logs/2026-09-20-visual-interpolation/01-two-player-ab/)
- 1호스트+3게스트 ON 로그: [`logs/2026-09-20-visual-interpolation/02-four-player-on/`](./logs/2026-09-20-visual-interpolation/02-four-player-on/)

### 8. 두 PC·1호스트+3게스트 회귀 검증

PC A에서 호스트 1개, PC B에서 게스트 3개를 실행했다. 호스트는 약 60Hz 권위 tick을 유지했고 세 게스트 Entity 모두 표시 보간이 활성화됐다. 이동 표본의 표시 정지 프레임은 Entity 2와 3에서 0, Entity 4에서 9/5,828(약 0.154%)이었다.

다만 게스트 3개를 실행한 PC의 일부 인스턴스는 약 11~20FPS까지 내려갔다. 호스트의 실제 명령 소비율은 Entity별 95.42%, 89.44%, 87.41%였다. 이 부하에서 관찰된 전진 떨림은 순수 물리 엔진 오류로 확정하지 않는다. 입력 생성·송신 또는 처리가 늦어 권위 이동이 held/neutral fallback으로 불균일해지고, 그 권위 이동 결과가 화면에도 나타날 수 있는 경로로 기록한다.

## 문서 목록

| 문서 | 주제 |
|---|---|
| [`FOUR_PLAYER_HOST_LOAD_RESULT_AND_GOALS_2026-09-19.md`](./troubleshooting/FOUR_PLAYER_HOST_LOAD_RESULT_AND_GOALS_2026-09-19.md) | 4인 부하, fallback, Jump, pre-tick, Pump 계측의 전체 진행 기록 |
| [`INPUT_FALLBACK_IMPROVEMENT_TREND_2026-09-20.md`](./troubleshooting/INPUT_FALLBACK_IMPROVEMENT_TREND_2026-09-20.md) | 처음부터 최종 기준선까지 핵심 수치 추이 |
| [`TWO_PC_NORMAL_BUILD_INPUT_BASELINE_2026-09-19.md`](./troubleshooting/TWO_PC_NORMAL_BUILD_INPUT_BASELINE_2026-09-19.md) | 두 PC 일반 빌드 2인 입력 기준선 |
| [`HOST_PROFILER_PUMP_COMPARISON_2026-09-19.md`](./troubleshooting/HOST_PROFILER_PUMP_COMPARISON_2026-09-19.md) | 정상 2001 상세 캡처 제거 전후 비용 비교 |
| [`HOST_AUTHORITY_GUEST_VISUAL_INTERPOLATION_EXPERIMENT_2026-09-20.md`](./troubleshooting/HOST_AUTHORITY_GUEST_VISUAL_INTERPOLATION_EXPERIMENT_2026-09-20.md) | 호스트 화면의 게스트 표시 위치 보간 A/B와 4인 회귀 |
| [`HOST_AUTHORITY_UDP_SYNC.md`](./troubleshooting/HOST_AUTHORITY_UDP_SYNC.md) | UDP 동기화 중단과 context handoff 진단 |
| [`RUBBER_BANDING_POST_BACKFILL_LOG_ANALYSIS_2026-09-18.md`](./troubleshooting/RUBBER_BANDING_POST_BACKFILL_LOG_ANALYSIS_2026-09-18.md) | 초기 backfill 이후 러버밴딩 원인 분리와 HostTick 보간 전후 분석 |

## 자동 테스트 원본

[`test-results/`](./test-results/)에는 fallback backfill, 호스트 pre-tick, Jump 조기 송신, 2001 pre-tick Pump, 진단 출력 분리, Profiler 계측, 호스트 게스트 표시 보간 회귀 실행에서 생성된 `.log`와 `.xml` 60개를 보존한다. 이 파일들은 프로젝트 빌드에 필요한 소스가 아니라 재생성 가능한 테스트 산출물이므로 원래 프로젝트 브랜치에는 커밋하지 않는다. 블로그에서는 상세 문서의 집계값을 사용하고, 테스트 결과 원본은 근거 확인용으로만 참조한다.

## 해석 범위

- Jump 수치는 입력의 생성·송신·호스트 입력 버퍼 삽입을 연결한 값이다. 입력 버퍼 `Consumed`만으로 CharacterMotor가 실제 점프를 허용한 횟수를 단정하지 않는다.
- 표시 보간은 정상적으로 계산된 권위 위치 사이의 렌더 움직임을 고르게 한다. 입력 부하로 권위 상태 자체가 멈추거나 불연속이면 표시 보간만으로 제거할 수 없다.
- `10.03ms → 16.67ms`는 키 입력부터 화면 반응까지의 실제 지연이 아니다. 일정 속도에서 공간 오차를 속도로 나눈 `estimatedDisplayDelayMsP95`의 창별 중앙값이다.
- 두 PC·1호스트+3게스트 실행은 기능 회귀 확인 자료다. 실제 네 PC 분산 성능이나 세 게스트 동시 이동을 통과한 결과로 확대하지 않는다.
