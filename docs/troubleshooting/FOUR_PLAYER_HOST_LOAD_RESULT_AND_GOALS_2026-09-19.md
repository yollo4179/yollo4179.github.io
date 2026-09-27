# 4인 호스트 부하 테스트 결과와 개선 목표

- 작성일: 2026-09-19
- 대상 실행: 동일 PC의 창 모드 클라이언트 4개
- 분석 범위: `room=3`, `world=5`, `authority=5`
- 엄격한 4인 공통 구간: 클라이언트 시간 약 `154~385`, 호스트 `actors=4`

## 결론

이번 끊김의 직접적인 방아쇠는 한 PC에서 클라이언트 4개를 실행하면서 발생한 호스트 성능 저하다.
호스트의 Unity `Update`는 약 31Hz까지 떨어졌지만 권위 시뮬레이션은 한 프레임에 여러
`FixedUpdate`를 실행하여 약 60Hz를 따라잡았다. 이 과정에서 입력 처리와 스냅샷 송신이
프레임 단위로 몰렸다.

호스트 권위 구조에서는 호스트가 실제로 멈춘 동안 다른 클라이언트가 새 권위 상태를 받을 수
없으므로 일정 수준의 화면 끊김은 구조적으로 불가피하다. 다만 fallback 비율 자체가 입력 실패율은
아니다. `HeldFallback`은 직전 이동을 계속 적용한다. 개선 대상은 낮은 FPS에서 입력 생성보다 권위
틱 소비가 먼저 실행되어, 이미 읽어 둔 지속 입력조차 불필요하게 `NeutralFallback`으로 바뀌거나
수집한 edge가 유효한 권위 tick 명령에 연결되지 못하는 순서 문제다.

CharacterMotor의 이동 수학이나 점프 조건이 이번 끊김의 주원인이라는 증거는 발견되지 않았다.

## 측정 결과

### 호스트 실행 상태

| 항목 | 결과 |
|---|---:|
| 평균 Update 주기 | 31.08Hz |
| 권위 시뮬레이션 평균 | 59.96Hz |
| Update 최저 | 7.9Hz |
| 1초 구간별 최장 프레임 중앙값 | 77.5ms |
| 1초 구간별 최장 프레임 P95 | 214.8ms |
| 최대 프레임 정체 | 409.5ms |
| 50ms 초과 프레임이 있던 측정 구간 | 193 / 225 |
| 100ms 초과 프레임이 있던 측정 구간 | 54 / 225 |
| 200ms 초과 프레임이 있던 측정 구간 | 14 / 225 |

권위 틱의 평균 진행률은 유지됐지만 실시간으로 고르게 처리된 것이 아니다. 느린 프레임 뒤에
고정 업데이트를 몰아서 실행하는 catch-up 형태였다.

### 호스트의 입력 소비

| Entity | 역할 | 실제 입력 | Held fallback | Neutral fallback | 전체 fallback |
|---:|---|---:|---:|---:|---:|
| 1 | 권위 호스트 | 51.6% | 39.7% | 8.7% | 48.4% |
| 2 | 게스트 | 73.7% | 20.3% | 5.9% | 26.3% |
| 3 | 게스트 | 74.1% | 20.3% | 5.6% | 25.9% |
| 4 | 게스트 | 75.2% | 19.5% | 5.4% | 24.8% |

호스트 로컬 입력도 권위 버퍼와 fallback 경로를 통과한다. 부하 구간에서 입력 생성보다 권위
틱 소비가 먼저 진행되어 호스트 캐릭터의 `Received` 소비율은 51.6%에 그쳤다. 이 수치는 이동
실패율이 아니라, 해당 tick에 실제 명령 대신 fallback을 선택한 비율과 구분해서 읽어야 한다.

- `HeldFallback`은 마지막 이동 방향을 유지하지만 Jump/Fire 같은 pressed edge를 제거한다.
- `NeutralFallback`은 이동까지 중립으로 바꾼다.
- 따라서 `NeutralFallback`은 이동 정지를 만들 수 있다. 반면 fallback은 Jump/Fire edge를
  의도적으로 복제하지 않으므로, 점프 문제는 실제 edge가 어느 명령에 연결되고 소비됐는지를
  별도로 추적해야 한다.
- 클라이언트 입력 송신 실패, invalid, conflict, capacity reject는 관찰되지 않았다.
- stale 수치는 배치 재전송 때문에 원래 증가할 수 있지만, 이번 실행에서는 늦게 생성된
  backfill 명령도 이미 확정된 틱에 도착하면서 stale 증가에 포함됐다.

### 3틱 backfill 적용 결과

큰 틱 공백에서도 최대 3개의 held 명령을 생성하는 변경은 실행 빌드에 적용됐다. 게스트들은
Unity `FixedUpdate`가 약 50Hz인 상태에서도 backfill을 포함하여 약 59Hz의 명령을 생성했다.

다만 현재 구현에는 다음 한계가 있다.

1. 공백이 4틱 이상이면 현재 틱의 바로 앞 3틱이 아니라 공백의 앞쪽 3틱을 생성한다.
2. 호스트에서는 catch-up `FixedUpdate`가 먼저 실행된 뒤 `Update`에서 backfill을 생성한다.
3. 이때 앞쪽 3틱은 이미 fallback으로 확정됐으므로 호스트에서 stale 처리된다.
4. 따라서 “최대 3틱을 생성한다”는 계약은 지켜지지만 “그 3틱을 호스트가 실제 입력으로
   소비한다”는 보장은 없다.

엄격한 4인 구간에서 호스트 로컬 명령 생성은 약 40.7Hz였지만 실제 입력 소비는 약 31Hz였다.
현재 backfill만으로 호스트의 저성능 catch-up 문제를 해결할 수 없다는 뜻이다.

### 원격 캐릭터 표시

| 관찰 클라이언트 | 평균 FPS | 최대 도착 공백 | 외삽 프레임 비율 | 외삽 상한 도달 |
|---|---:|---:|---:|---:|
| Entity 2 | 51.4 | 393.5ms | 5.27% | 306회 |
| Entity 3 | 43.5 | 413.8ms | 5.18% | 255회 |
| Entity 4 | 73.0 | 413.6ms | 6.23% | 393회 |

대부분의 HostTick 간격은 정상 스냅샷 주기인 2틱이었다. 지속적인 패킷 유실보다는 호스트와
클라이언트 메인 스레드의 정체 때문에 스냅샷이 한 프레임에 묶여 처리된 정황이 강하다.

대표 상관관계는 다음과 같다.

- 호스트 시간 217초 부근: 최대 396.5ms 정체 후 관찰 클라이언트에서 393~401ms 도착 공백
- 호스트 시간 373초 부근: 최대 409.5ms 정체 후 관찰 클라이언트에서 약 413ms 도착 공백
- 두 구간 모두 외삽과 외삽 상한 도달이 증가했다.
- 두 번째 구간에서는 원격 Entity 4가 한 화면 프레임에서 약 92~96cm 이동했다.

원격 표시는 도착 시각이 아니라 HostTick을 기준으로 샘플링한다. 이 선택은 정상이다. 다만
400ms 동안 새 스냅샷이 없으면 현재 보간 지연과 외삽 상한만으로 공백을 감출 수 없다.

### 점프

현재 로그에서 식별 가능한 Entity 1, 2, 4의 점프는 다른 클라이언트의 수직 이동 진단에도
나타났다. 이 점프들은 권위 호스트에서 실행되어 원격 스냅샷으로 전달됐다.

문제로 보고된 “로컬 화면에서는 올라갔지만 호스트와 다른 게스트에게는 보이지 않은 점프”를
특정 입력 한 건으로 연결할 자료는 이번 로그에 없다.

- 로컬 점프 edge의 정확한 InputTick
- 해당 명령의 송신 배치 포함 여부
- 호스트 삽입 결과와 해당 틱 소비 source
- CharacterMotor의 점프 허용 또는 거절 결과
- 권위 Y, 수직 속도, 접지 상태
- 게스트의 권위 스냅샷 수신 및 Y축 reconcile

위 이벤트 연결 로그가 없고, 이번 실행은 일반 Release 빌드여서 `guest-reconcile` 진단도
활성화되지 않았다. 따라서 점프 실패 가능성은 현재 fallback 구조로 설명할 수 있지만 특정
실패 건의 소실 단계까지 확정하지는 않는다.

### 별도 발견 사항

- 4인 공통 구간의 서버 로그에서는 지속적인 UDP 실패, relay 실패 또는 silence가 없었다.
- 서버의 `host_snapshot_state_rejected`는 한 번 기록됐다. 지속적인 끊김을 설명할 빈도는 아니다.
- 게임 단계 전환 부근에서 여러 원격 캐릭터가 약 38~42m 이동했지만 `teleport=0`이었다.
  단계 전환 재배치라면 권위 상태에 teleport 의미를 표시해야 한다.
- 종료 구간의 `GameInstance에 UIRoot가 연결되지 않았습니다` 예외는 이동 끊김과 별개의
  씬 종료/UI 정리 문제다.

## 구조적으로 불가피한 부분

다음은 호스트 권위 구조를 유지하는 한 완전히 제거할 수 없다.

1. 호스트 프로세스가 정지한 동안 새 권위 상태를 만들거나 송신할 수 없다.
2. 호스트가 실시간 시뮬레이션 속도를 유지하지 못하면 모든 플레이어가 영향을 받는다.
3. 400ms 공백을 보간만으로 완전히 숨기려면 약 400ms의 상시 표시 지연 또는 강한 장기 예측이
   필요하다.
4. 호스트가 종료되거나 장시간 응답하지 않으면 host migration 또는 별도 권위 서버 없이는
   세션을 계속 진행할 수 없다.

## 수정 가능한 비정상 동작

다음은 호스트 권위 구조의 필연이 아니며 개선 대상이다.

1. 호스트 자신의 입력이 시뮬레이션 틱 뒤에 생성되는 것
2. 호스트의 실행 가능한 tick에 로컬 명령을 미리 준비하지 못해 불필요한 fallback이 생기는 것
3. 짧은 성능 정체가 Neutral 입력과 이동 정지로 변환되는 것
4. 수집한 점프 edge가 어느 단계에서 합쳐지거나 취소되거나 소비됐는지 확인할 수 없는 것
5. catch-up에서 생성된 여러 스냅샷이 한 프레임에 몰려 전달되는 것
6. 명시적인 위치 재배치가 teleport로 표시되지 않는 것

## 개선 목표

### P0. 호스트 입력을 권위 틱 전에 공급

- 입력 장치 샘플은 렌더 `Update`에서 최신 상태로 보관한다.
- 호스트 시뮬레이션이 각 틱을 소비하기 전에 최신 held 입력으로 해당 틱 명령을 만든다.
- Jump/Fire 같은 pressed edge는 pending 상태로 보관하고 다음 유효 권위 틱에서 정확히 한
  번만 소비한다. 소비 전 같은 종류의 연타는 현재 정책대로 첫 이벤트에 합친다.
- 호스트 로컬 입력은 네트워크 지연을 전제로 한 stale/fallback 경로에 의존하지 않게 한다.

완료 기준:

- `preparedTicks == eligibleSteps`
- `localFirstSubmitStale == 0`
- `heldMismatchTicks == 0`
- `avoidableNeutral == 0`
- 이동 해제를 수집한 다음 유효 HostTick의 이동 입력은 0

#### P0 적용 내용과 수치의 의미

2026-09-19 코드에는 다음 경로를 적용했다.

```text
Update 또는 입력 이벤트
  → 최신 held 샘플과 Jump/Fire edge 보관

HostWorldSimulation.Step(T)
  → TickPreparing(T)
  → T번 로컬 명령 생성 및 HostInputBuffer 삽입
  → ResolveTick(T)
  → 권위 물리 실행
```

`TickPreparing`은 실행 순서 설정값에 기대지 않고 `ResolveTick` 바로 앞에서 호출된다. 물리 실행
횟수는 늘리지 않는다. 호스트의 명령 `InputTick`과 `ViewTick`은 모두 실제
`Simulation.NextTick`을 사용한다. 게스트의 HostTick 추정·3틱 backfill·원격 HostTick 보간은
이번 변경에서 수정하지 않았다.

| 로그 필드 | 가리키는 값 | 통과 기준 |
|---|---|---:|
| `eligibleSteps` | 입력 소스와 최신 샘플이 준비되어 공급 규칙을 검사할 수 있었던 HostTick 수 | 기준값 |
| `preparedTicks` | `ResolveTick` 전에 같은 tick·같은 내용의 로컬 명령이 버퍼에 실제 존재했던 수 | `eligibleSteps`와 같음 |
| `localFirstSubmitStale` | 중계 재전송이 아니라 로컬 최초 제출이 stale로 거절된 수 | 0 |
| `heldMismatchTicks` | 준비한 양자화 이동·held 비트와 실제 소비값이 다른 tick 수 | 0 |
| `avoidableNeutral` | 유효한 비중립 명령을 준비했는데 `NeutralFallback`을 소비한 tick 수 | 0 |

1초 요약은 `[rubber-banding][host-local-pre-tick]`으로 기록한다. 검증식이 깨진 순간에는
`[host-local-pre-tick-failure]`가 해당 tick의 준비 결과·버퍼 삽입 결과·기대값·실제값을
기록한다. 시간 창은 FixedUpdate 시간이 아니라 `Time.realtimeSinceStartupAsDouble` 기준이다.

Jump/Fire에는 `eventId`를 붙여 `Captured → Coalesced/Cancelled 또는 Attached → Consumed`를
기록한다. 여기서 `Consumed`는 입력 버퍼가 edge 명령을 소비했다는 뜻이며 CharacterMotor가
실제 점프를 허용했다는 뜻은 아니다. 모터 허용·거절 이유와 Y/수직 속도/접지 상태 연결은
아래 P1 점프 진단의 후속 범위다.

자동 테스트는 최신 입력 캐시 → `TickPreparing` → `HostInputBuffer` → actor 소비 경로를 직접
통과한다. W 한 번 수집 후 6틱 유지, Jump 1회만 소비, 이동 해제, 입력 잠금 시 edge 취소,
소비 전 점프 2회의 합침, 중계 Duplicate의 중복 실행 방지를 검증했다. Unity EditMode 대상
테스트 결과는 67/67 통과다(`HostAuthorityServiceTests` 61,
`HostWorldSimulationTests` 6). 전체 EditMode는 662개 중 644 통과, 12 실패, 6 제외였다.
실패 12개는 변경 범위 밖의 UI·장비·ReadyPad·SkinChangePad 테스트이며 두 호스트 입력 테스트 묶음에는
실패가 없다.

이 결과는 코드 경로의 정확성을 증명한 것이며, 아래 재빌드 4인 테스트에서 실제 실행 지표도
별도로 확인했다.

#### P0 재빌드 4인 실측 결과

같은 PC에서 창 모드 클라이언트 4개를 실행한 약 4분간의 테스트에서 실제 권위 호스트는
`guest3.log`의 `host=1`, `entity=1` 프로세스였다. 파일명 `host.log`는 실행 순서 때문에 실제로는
게스트 `entity=2`를 기록했다. 따라서 권위 입력과 시뮬레이션 평가는 `guest3.log`를 기준으로
집계했다.

| 호스트 로컬 공급 지표 | 결과 |
|---|---:|
| 1초 요약 구간 | 255 |
| 전체 실행 `eligibleSteps / preparedTicks` | 15,495 / 15,495 |
| `actors=4`인 world 4·5 `eligibleSteps / preparedTicks` | 14,121 / 14,121 |
| 두 값이 달랐던 구간 | 0 |
| `localFirstSubmitStale` | 0 |
| `heldMismatchTicks` | 0 |
| `avoidableNeutral` | 0 |

따라서 이번 변경의 핵심 검증식 네 개는 실제 4인 부하에서도 모두 통과했다. 전체 실행
15,495개뿐 아니라 4명이 모인 구간만 분리한 14,121개 tick도 모두 해당 tick 소비 전에
준비됐다.

월드 초기화 직후 첫 tick에는 입력 소스가 아직 `NotReady`여서
`host-local-pre-tick-failure`와 `NeutralFallback`이 각각 1회 기록됐다. 이 tick은 최신 입력 샘플이
없는 상태이므로 `eligibleSteps`에는 포함되지 않았고 이후 재발하지 않았다. 즉 이번 결과는
모든 tick의 Neutral이 0이라는 뜻이 아니라, 준비할 수 있었던 입력을 놓쳐 발생한
`avoidableNeutral`이 0이라는 뜻이다.

호스트 로컬 edge는 Jump 23건과 Fire 1건이 기록됐다. 모두
`Captured → Attached → Consumed`로 연결됐으며 합치기·취소·미소비 이벤트는 없었다. 다만
`Consumed`는 입력 버퍼 소비를 가리키므로 CharacterMotor의 실제 점프 허용 23건을 증명하는
수치는 아니다.

#### P0 적용 뒤에도 남은 성능 정체

입력 공급은 정상화됐지만 권위 시뮬레이션과 화면 출력의 실제 정체는 남았다.

| 호스트 `actors=4` 지표 | 결과 |
|---|---:|
| 1초 측정 구간 | 232 |
| 평균 권위 시뮬레이션 | 59.84Hz |
| 최저 1초 구간 | 23.3Hz |
| `stepHz < 55` 구간 | 8 |
| 100ms 초과 프레임이 있던 구간 | 29 |
| 250ms 초과 프레임이 있던 구간 | 5 |
| 최대 프레임 정체 | 887.1ms |

최대 887.1ms는 4인 월드 전환 시작 시점에 기록됐다. 실제 플레이 후반에도 약 407.1ms와
459.6ms 정체가 있었고, 같은 시점의 게스트 로그에는 약 407~458ms 스냅샷 도착 공백과 외삽
상한 도달이 나타났다. 이는 pre-tick 입력 공급으로 제거할 수 있는 입력 누락과, 호스트가 새
권위 결과를 만들지 못하는 출력 공백이 서로 다른 문제임을 보여준다.

전체 실행 단순 합계에는 actor 재등록 때 진단 누계 기준선이 유지되어 음수 차이가 생긴 구간이
섞여 있었다. 예를 들어 `time=45.145`, world 4, Entity 4에는 `receivedResolved=-253`,
`heldFallback=-35`, `neutralFallback=-52`가 기록됐다. 실제 입력 처리량이 음수라는 뜻이 아니라
새 입력 버퍼 누계에서 이전 버퍼 누계를 뺀 진단 오류다. 따라서 기존 전체 실행 기준
16.7~18.5% 수치는 전후 비교 기준으로 사용하지 않는다.

음수 창이 없는 world 5의 완료된 195개 공통 요약 구간만 합산하면 Entity별 처리 tick은 모두
11,889개이며 결과는 다음과 같다.

| 역할 | 실제 명령 소비 | 전체 fallback | Neutral fallback |
|---|---:|---:|---:|
| Entity 1 — 호스트 | 100.00% | 0.00% | 0.00% |
| Entity 2 — 게스트 | 80.41% | 19.59% | 4.59% |
| Entity 3 — 게스트 | 80.53% | 19.47% | 3.54% |
| Entity 4 — 게스트 | 79.15% | 20.85% | 3.90% |

호스트 로컬 P0 수정은 게스트가 네트워크를 거쳐 보내는 입력 공급까지 바꾸지 않는다. 다음
입력 개선 대상은 같은 world·같은 완료 구간에서 측정한 게스트 첫 도착 기한과 Neutral 전환이다.

원격 표시 로그에서도 부하 영향이 확인됐다.

| 관찰 로그 | 최대 도착 공백 | 최대 HostTick 간격 | 외삽 상한 프레임 | 최대 화면 이동 |
|---|---:|---:|---:|---:|
| `guest1.log` | 458.3ms | 2 | 183 | 28.45cm |
| `guest2.log` | 442.5ms | 2 | 129 | 76.25cm |
| `host.log`의 실제 게스트 | 1,537.7ms | 78 | 144 | 259.62cm |

앞의 두 게스트는 HostTick 간격이 정상 스냅샷 주기인 최대 2tick인데도 도착이 400ms 이상
비었다. 호스트 정체 뒤 스냅샷이 메인 스레드에서 몰려 처리된 정황과 일치한다. 반면
`host.log`의 1.5초 구간은 해당 클라이언트 FPS도 약 1.3까지 함께 떨어진 개별 클라이언트
정체다. 이 구간을 호스트 전체 정체로 분류하면 안 된다.

테스트 종료 때 실제 호스트가 먼저 나가면서 세 게스트에 같은 Transition
`InvalidOperationException`이 1회씩 기록됐다. 세 로그 모두 `reason=HostLeft` 직후 발생했으므로
이번 이동 끊김이나 pre-tick 입력 공급 실패와는 별도의 종료/씬 전환 문제다.

#### 9087 tick 주변의 확인 사실과 해석 한계

Entity 4의 로컬 요약에는 `estimatedHostTick=9084`, `lastResolvedTick=9086`,
`nextInputTick=9087`, `lastRecordedTick=9087`, `nextLead=3`, `jump=1`이 함께 기록됐다. 같은
프레임의 원격 버퍼 최신 스냅샷도 9086이었다.

여기서 `nextLead=3`은 추정치 9084를 기준으로 한 값이다. 이미 수신한 확정 경계 9086을
기준으로 보면 9087 명령은 번호상 1tick 앞일 뿐이며, 실제 시간 16.7ms의 여유가 남았다는
보장도 없다. 권위 호스트가 Entity 4의 9084~9090을 `NeutralFallback`으로 소비한 사실은
확인됐다.

다만 `jump=1`은 요약 구간의 점프 횟수나 9087 명령의 Jump 비트가 아니라 마지막으로 읽은
입력 샘플 값이다. 같은 tick 명령이 이미 불변으로 생성된 뒤 새 Jump를 읽었다면 Jump는 다음
새 명령까지 pending일 수 있다. 또한 다른 게스트에 `jump-step`이 없다는 사실도 화면 수직
이동량이 진단 임계값을 넘지 않았다는 뜻일 수 있어 점프 미실행의 증거로 쓰지 않는다.

따라서 이번 로그로 확인한 범위는 “해당 구간에 호스트가 실제 입력을 소비하지 못했다”까지다.
9087 명령 자체의 Jump 비트, 첫 송신 시각, 첫 호스트 삽입 결과와 특정 점프 취소의 인과관계는
다음 진단 빌드에서 연결한다.

#### 다음 진단 패치 범위

호스트 로컬 pre-tick과 게임 물리는 바꾸지 않고 다음 관측 경계만 추가했다.

1. 게스트 edge를 `Captured → Attached → FirstSendRequested`로 같은 eventId에 연결한다.
2. 확정 경계가 명령을 지울 때 첫 송신 요청이 없었다면 `ResolvedBeforeFirstSend`를 남긴다.
   확정된 Jump를 새 tick으로 옮기거나 다시 실행하지 않는다.
3. `FirstSendRequested` 상태와 상세 edge 로그는 실제 `SendAsync` 호출이 동기 예외 없이
   반환된 뒤에만 기록한다. 호출 자체의 실패는 `phase=invoke`, 비동기 완료 실패는
   `phase=await`로 월드·Entity·첫/마지막 InputTick·명령 수와 함께 기록한다. 진단 구독자와
   문자열 로그가 실제 송신 호출보다 먼저 실행되어 송신 기한을 줄이지 않도록 한 경계다.
   `phase=invoke`의 예외 범위에는 `SendAsync` 호출만 포함한다. 비동기 완료 관찰을 먼저
   등록하고 모든 batch 명령의 최초 송신 상태를 메모리에 반영한 뒤 edge 진단을 출력한다.
   진단 구독자 예외는 별도 `입력 edge 진단 실패` 로그로 제한해 남기며 송신 실패 수에는
   포함하지 않는다.
4. `Attached`와 `FirstSendRequested`에는 실제 `PressedButtons`, `createdAt`,
   `firstSendRequestedAt`, clamp 전후 tick, 생성 당시 확정 경계·호스트 추정치와 clamp 이유를
   기록한다.
5. 호스트는 고유 EntityId·InputTick의 첫 도착만 구분해 삽입 결과와
   `insertSlackTicks = inputTick - lastResolvedTickAtInsert`를 기록한다. 재전송 Duplicate는 첫
   도착 통계에 다시 넣지 않는다.
6. 일반 이동 명령은 1초 요약으로 집계하고, Jump/Fire 또는 첫 삽입 거절만 상세 출력한다.
7. actor 제거 시 입력 진단 기준선도 제거한다. 누계가 역행한 창은
   `host-input-summary-reset`으로 표시하고 합산하지 않는다. actor 교체·제거가 집계 창 중간에
   발생하면 reset 로그에 `reason=actor-replaced` 또는 `reason=actor-removed`를 남기고, 같은
   Entity가 다시 등록된 다음 요약을 `summaryValid=0 partial=1`로 표시한다. 이 요약은
   `windowMs` 전체 구간의 입력 처리율 계산에서 제외한다.

게스트 프로세스 내부에서는 `firstSendRequestedAt - createdAt`만 계산한다. 게스트와 호스트의
서로 다른 `time=` 값을 빼서 네트워크 지연으로 해석하지 않는다. 현재 UDP 메시지에는 소켓
수신 큐 진입 시각이 없으므로 큐 대기시간은 이번 패치에서 측정하지 않는다.

`ResolvedBeforeFirstSend`는 해당 명령에 대해 동기 예외 없이 반환된 최초 송신 요청이 기록되기
전에 확정 제거됐다는 뜻이다. `SendAsync` 호출 자체가 `phase=invoke`로 실패한 시도도 이 상태로
남을 수 있으므로, 이를 곧바로 “API를 한 번도 호출하지 않았다”로 해석하지 않는다. 같은
월드·Entity·틱 범위의 `phase=invoke` 로그를 함께 확인한다.

새 분기 테스트는 첫 송신 전 확정, 실제 송신 API 호출 뒤 최초 송신 1회 집계, 동기 송신
예외가 최초 송신으로 잘못 기록되지 않는 조건, 송신은 정상인데 진단 구독자만 실패하는 조건,
ACK 12tick 상한의 clamp 전후 값을 검증한다. `HostAuthorityServiceTests` 66/66과 호스트
pre-tick 순서를 고정하는
`HostWorldSimulationTests` 6/6이 통과했다.

#### 송신 경계 진단 빌드 4인 실행 결과

실행 식별자는 다음과 같다.

```text
versionId: v0.1.0-2ef05998fa83-dirty-asm-754274e3ae74
runId:     20260919-120104-guest-send-trace-v6-4player
room:      Input4P-20260919-120104
```

사용자는 실제 조작 테스트 구간에 전원 어댑터를 연결했다고 확인했다. 다만 최초 실행 시점에는
어댑터가 빠져 있었고 로그에 전원 연결 시각 자체는 기록되지 않으므로, 전체 실행을 엄격한
AC-only 성능 표본으로 보지는 않는다. 입력 정확성 집계는 `world=5`, `actors=4`,
`summaryValid=1`이 동시에 성립한 93개 공통 요약만 사용했다. 첫 창은 월드 전환 직후
`steps=0`, `maxFrameMs=1594.4`인 전환 창이며, 정상 진행 성능 92개 창과 분리해 읽는다.

92개 진행 창에서 호스트는 평균 `stepHz=60.0`, 최저 `57.6`을 유지했다. 렌더 Update는 평균
38.63Hz, 최저 13.2Hz였고 최대 프레임 시간은 286.7ms였다. 렌더 부하는 컸지만 실행된 권위
물리 tick 수는 따라잡은 형태다.

| Entity | 권위 처리 tick | 실제 명령 소비 | Held fallback | Neutral fallback | 전체 fallback | 고유 첫 도착 stale |
|---|---:|---:|---:|---:|---:|---:|
| 1 — 호스트 | 5,594 | 5,594 | 0 | 0 | 0.00% | 해당 없음 |
| 2 — 게스트 | 5,594 | 4,476 | 934 | 184 | 19.99% | 975 / 5,451, 17.89% |
| 3 — 게스트 | 5,594 | 4,338 | 1,037 | 219 | 22.45% | 1,191 / 5,530, 21.54% |
| 4 — 게스트 | 5,594 | 4,435 | 948 | 211 | 20.72% | 1,108 / 5,544, 19.99% |

호스트 로컬 입력은 같은 구간에서 `eligibleSteps=5,594`, `preparedTicks=5,594`,
`localFirstSubmitStale=0`, `heldMismatchTicks=0`, `avoidableNeutral=0`이었다. 호스트 pre-tick
수정은 이번 실행에서도 유지됐다.

4인 공통 구간에서 실제로 반복 조작한 Guest2, Entity 2의 Jump 37건은 다음과 같이 연결됐다.

| 경계 | 결과 |
|---|---:|
| Captured | 37 |
| Attached | 37 |
| FirstSendRequested | 37 |
| ResolvedBeforeFirstSend | 0 |
| `phase=invoke` / `phase=await` 송신 실패 | 0 / 0 |
| 호스트 첫 삽입 Accepted | 32 |
| 호스트 첫 삽입 RejectedStale | 5 |

RejectedStale은 InputTick `2086`, `2255`, `2419`, `2575`, `5110`에서 발생했다. 삽입 당시
`insertSlackTicks`는 각각 `-1`, `0`, `0`, `0`, `0`이었다. 게스트 생성 당시 추정 HostTick
기준 선행량은 각각 `3`, `5`, `3`, `3`, `3`tick이었고, 생성부터 첫 송신 요청까지의 지연은
각각 28.580ms, 8.423ms, 16.174ms, 23.376ms, 24.246ms였다. 평균 20.160ms로 60Hz 기준 약
1.21tick을 정기 송신 예약을 기다리는 데 사용했다.

다섯 목표 tick 모두 호스트에서 `HeldFallback`으로 처리됐다. 이전 이동 입력은 유지됐지만
fallback이 Jump edge를 복제하지 않으므로 점프는 실행되지 않았고, 뒤늦게 도착한 명령은 이미
확정된 tick이라 거절됐다. 다섯 명령 모두 `clampReason=None`, `desiredTick=assignedTick`이어서
ACK +12tick 상한이 목표 tick을 낮춘 사례도 아니다.

따라서 이번 점프 누락은 “명령이 첫 송신 전에 확정 제거됨”이나 “송신 API 실패”로 설명되지
않는다. 적어도 5건은 호스트 입력 버퍼의 첫 관측 시점에 이미 확정 경계를 지난 것이 직접
확인됐다. 다음 개선 판단은 게스트 생성·송신 예약, 네트워크 전달, 호스트 수신 Pump를 거쳐
삽입될 때까지 줄어든 tick 여유를 대상으로 해야 한다. 현재 로그에는 소켓 수신 큐 진입 시각이
없으므로 네트워크 전달과 호스트 메인 스레드 대기를 아직 분리할 수 없다.

Entity 2 제거 이후의 Entity 4·3 점프 조작과 테스트 종료 구간은 `actors=4` 공통 집계에서
제외했다. actor 제거 뒤의 원격 `jump-step`은 화면 표시 관측이며, 권위 모터의 점프 허용
자체를 증명하는 값으로 사용하지 않는다.

#### Jump 명령 조기 송신 실험 패치

첫 동작 변경은 게스트가 **새 불변 InputTick 명령에 Jump를 실제로 연결한 경우**에만 해당
batch의 송신 요청을 정기 시각보다 앞당기는 것으로 한정했다.

처리 의도는 다음과 같다.

1. 단순히 최신 입력 샘플의 `JumpPressed`가 켜진 상태가 아니라, `Record()`가 새 명령을 만들고
   그 명령의 `HasJump`가 참인 상태를 조기 송신 조건으로 사용한다.
2. 같은 tick 명령이 이미 만들어져 있으면 기존 명령을 덮어쓰지 않는다. Jump edge는 다음 유효
   tick까지 pending 상태로 보존되고, 실제 새 명령에 연결된 시점에만 조기 송신한다.
3. 조기 송신 전에 배정된 InputTick, 명령 내용, 로컬 예측 Step 수, 재조정 이력은 바꾸지 않는다.
4. 정기 송신 예정 시각 `_nextSendAt`은 조기 송신 때문에 뒤로 밀지 않는다. 조기 송신과 정기
   시각이 같은 `Publish()`에 겹치면 같은 batch를 연속 두 번 보내지 않고, 다음 정기 시각 계산은
   기존 규칙대로 진행한다.
5. Fire 단독 명령은 기존 정기 송신을 사용한다. Jump와 Fire가 같은 불변 명령에 함께 들어 있으면
   Jump 조건으로 보낸 batch에 Fire도 자연스럽게 포함되지만 Fire 자체가 조기 송신을 유발하지는
   않는다.

이번 패치에서는 게스트 선행 tick, ACK 상한, 3tick backfill, 호스트 수신 Pump 순서, fallback
유지 시간, CharacterMotor, 원격 보간을 변경하지 않았다. 따라서 다음 4인 비교에서 나타나는
Jump 첫 송신 대기와 첫 삽입 지각 변화만 이 패치의 직접 효과로 본다.

자동 검증 결과는 다음과 같다.

| 테스트 | 결과 | 확인 내용 |
|---|---:|---|
| `HostAuthorityServiceTests` | 67/67 통과 | Jump 조기 송신, Fire 정기 송신 유지, 정기 시각 비드리프트, 최초 송신 추적과 예외 경계 |
| `HostWorldSimulationTests` | 6/6 통과 | 호스트 pre-tick 공급과 권위 월드 실행 순서 유지 |

다음 4인 테스트는 시작 전부터 전원 어댑터를 연결하고 같은 창 모드·같은 입력 시나리오로
수행한다. 비교 기준은 아래와 같다.

| 지표 | 변경 전 기준 | 조기 송신 빌드에서 확인할 값 |
|---|---:|---|
| 호스트 로컬 준비 | 5,594 / 5,594 | 정확성 유지 |
| Guest2 Jump 첫 삽입 지각 거절 | 5 / 37, 13.51% | 감소 여부 |
| 거절된 Jump 생성→첫 송신 대기 | 8.423~28.580ms, 평균 20.160ms | 정기 시각 대기 제거 여부 |
| 게스트 전체 fallback | 19.99~22.45% | 별도 추적하며 점프 전용 수정 효과로 단정하지 않음 |

조기 송신 뒤에도 `RejectedStale`이 남으면 다음 실험에서만 호스트의
`receiveQueueEnteredAt → bufferInsertedAt`을 연결해 Pump 대기와 도착 전 지연을 분리한다. 이번
패치에는 해당 계측이나 실행 순서 변경을 섞지 않았다.

#### Jump 조기 송신 빌드 4인 검증 결과

실행 식별자는 다음과 같다.

```text
versionId: v0.1.0-2ef05998fa83-dirty-asm-767d77950ef9
runId:     20260919-123516-jump-early-send-4player-ac
room:      Input4P-20260919-123516
```

실행 직전에 Windows `GetSystemPowerStatus`로 `ACLineStatus=1`, 배터리 93%를 확인했다. 실제
호스트는 `host.log`였고, 네 클라이언트가 모두 참가한 최종 `world=5`, `authority=5`에서
`actors=4`, `summaryValid=1`, `partial=0`이 같은 시각에 성립한 170개 요약 창만 합산했다.

사용자는 이 실행에서 기존의 “게스트가 점프한 직후 바닥으로 내려오는 현상”이 재현되지 않아
체감 문제는 해결됐다고 확인했다. 명령 단위 수치는 다음과 같다.

| Jump 경계 | 변경 전 | 조기 송신 빌드 |
|---|---:|---:|
| Attached | 37 | 172 |
| FirstSendRequested | 37 | 172 |
| ResolvedBeforeFirstSend | 0 | 0 |
| 생성→첫 송신 대기 | 8.423~28.580ms, 평균 20.160ms | 전부 0.000ms |
| 호스트 첫 삽입 Accepted | 32 / 37 | 169 / 172 |
| 호스트 첫 삽입 RejectedStale | 5 / 37, 13.51% | 3 / 172, 1.74% |
| 송신 `phase=invoke` / `phase=await` 실패 | 0 / 0 | 0 / 0 |

Entity별로 Entity 2는 122건 중 120건 Accepted·2건 RejectedStale, Entity 3은 50건 중 49건
Accepted·1건 RejectedStale였다. 즉 관찰 증상은 해결됐지만, “모든 Jump 명령이 제때 삽입됐다”는
정확성 기준까지 0건으로 만든 것은 아니다.

남은 지각 삽입은 InputTick `3519`, `4996`, `6499`이며 모두 다음 특징을 보였다.

- 새 명령 생성과 첫 송신 요청은 같은 게스트 시각으로 기록되어 대기시간이 0.000ms였다.
- `clampReason=None`, `desiredTick=assignedTick`이었다.
- 호스트 첫 삽입 시 `lastResolvedAtInsert=inputTick`, `insertSlackTicks=0`으로 거절됐다.
- tick 3519와 4996은 해당 Entity가 `NeutralFallback`, tick 6499는 `HeldFallback`으로 먼저
  확정된 뒤 Jump 명령이 도착했다.

따라서 조기 송신은 이번에 직접 겨냥한 정기 예약 대기를 제거했고 지각 거절률을 크게 낮췄다.
남은 3건은 같은 수정의 송신 예약 대기로 설명되지 않으므로, 추가 개선이 필요할 때는 계획대로
호스트 `receiveQueueEnteredAt → bufferInsertedAt` 대기를 먼저 분리한다. 지금 커밋에는 Pump 순서나
게스트 선행 tick 변경을 추가하지 않는다.

같은 170개 창의 회귀 지표는 다음과 같다.

| Entity | 권위 처리 tick | 실제 명령 소비 | Held fallback | Neutral fallback | 전체 fallback |
|---|---:|---:|---:|---:|---:|
| 1 — 호스트 | 10,310 | 10,310 | 0 | 0 | 0.00% |
| 2 — 게스트 | 10,310 | 8,047 | 1,842 | 421 | 21.95% |
| 3 — 게스트 | 10,310 | 7,945 | 1,920 | 445 | 22.94% |
| 4 — 게스트 | 10,310 | 7,821 | 2,056 | 433 | 24.14% |

호스트 로컬은 `eligibleSteps=10,310`, `preparedTicks=10,310`,
`localFirstSubmitStale=0`, `heldMismatchTicks=0`, `avoidableNeutral=0`으로 기존 정확성을 유지했다.
호스트 평균 `stepHz=59.48`, 최저 25.8이었고 최대 프레임 정체는 789.9ms였다. 전체 게스트
fallback은 점프 전용 조기 송신의 직접 목표가 아니며 21.95~24.14%로 별도 개선 대상으로 남는다.

#### 게스트 일반 입력 2001 pre-tick 전달 적용

점프 조기 송신 뒤 남은 게스트 일반 이동 fallback을 줄이기 위해, 이미 호스트 소켓에 도착한
`PlayerInputBatchNotification(2001)`만 권위 tick 확정 전에 전달하는 경로를 추가했다. fallback
held 시간을 늘리거나 입력 tick의 의미를 바꾼 것이 아니다.

##### Unity에서 FixedUpdate가 몰아서 실행될 수 있는 이유

`Update`와 `FixedUpdate`가 서로 다른 스레드에서 동시에 실행되는 것은 아니다. 둘 다 기본적으로
Unity 메인 스레드에서 순차 실행된다. 그러나 `FixedUpdate`는 운영체제 타이머가 실제 시간마다
정확히 한 번 호출하는 함수가 아니다. Unity 메인 루프가 이전 프레임 이후 누적된 시간을 확인하고,
고정 시간 간격을 따라잡는 데 필요한 횟수만큼 `FixedUpdate`를 먼저 연속 실행한다.

한 렌더 프레임의 개념적인 순서는 다음과 같다.

```text
누적 시간이 fixedDeltaTime 이상인 동안
  → FixedUpdate
  → 물리 step

Update 1회
LateUpdate 1회
렌더링
```

예를 들어 `fixedDeltaTime=1/60초`, 약 16.67ms인데 한 렌더 프레임이 100ms 걸렸다면 다음
렌더링 전에 약 6개의 고정 update를 연속 실행할 수 있다.

```text
FixedUpdate(T)
FixedUpdate(T+1)
FixedUpdate(T+2)
FixedUpdate(T+3)
FixedUpdate(T+4)
FixedUpdate(T+5)
Update 1회
렌더링 1회
```

여기서 “몰아서 실행한다”는 여러 `FixedUpdate`를 병렬 실행한다는 뜻이 아니다. 같은 메인
스레드에서 `Update`나 렌더링을 사이에 두지 않고 연속 실행한다는 뜻이다. 반대로 렌더링이
120FPS이고 물리가 60Hz라면 어떤 렌더 프레임에는 `FixedUpdate`가 한 번도 없고 다음 프레임에
한 번 실행될 수도 있다.

정체가 너무 길 때 Unity가 무한정 따라잡는 것은 아니다. `maximumDeltaTime` 등 고정 update
따라잡기 상한에 도달하면 한 프레임에서 처리할 시간을 제한하므로, 이때는 물리 시뮬레이션의
진행 자체가 실제 시간보다 뒤처질 수 있다.

비동기적으로 진행되는 경계는 `Update`와 `FixedUpdate` 사이가 아니라 UDP 소켓 수신 스레드와
Unity 메인 스레드 사이다.

```text
백그라운드 UDP 수신
  → 스레드 안전 수신 큐에 2001 저장

Unity 메인 스레드
  → 필요한 FixedUpdate를 연속 실행
  → Update
  → 렌더링
```

기존에는 백그라운드가 이미 2001을 큐에 넣었더라도 일반 `Update`에서만 그 큐를 게임 입력
버퍼로 전달했다. 따라서 낮은 FPS에서 다음 순서가 가능했다.

```text
2001이 수신 큐에 존재
→ FixedUpdate(T)에서 입력을 보지 못하고 fallback 확정
→ FixedUpdate(T+1)도 fallback 확정
→ FixedUpdate(T+2)도 fallback 확정
→ 뒤늦은 Update에서 2001 처리
→ 이미 확정된 명령은 stale
```

실제 4인 로그에도 같은 1초 구간에서 `Update`는 14회, `FixedUpdate`와 권위 simulation은
62회 실행된 사례가 있었다. 해당 구간의 `updateHz=12.3`, `fixedHz=54.7`, `stepHz=54.7`이었다.
즉 렌더 `Update` 한 번 사이에 여러 권위 tick이 진행될 수 있었고, 일반 Update만 기다리는 입력
전달 순서는 이 실행 모델과 맞지 않았다.

이번 변경은 UDP 수신 스레드에서 Unity 게임 로직을 직접 실행하지 않는다. 백그라운드는 전용
큐에 보관만 하고, 메인 스레드의 각 권위 `TickPreparing`이 `ResolveTick` 직전에 이미 도착한
2001을 꺼내 기존 입력 버퍼로 전달한다.

```text
UDP 백그라운드 수신
  ├─ 2001 PlayerInputBatchNotification
  │    → 2001 전용 수신 큐에 한 번만 보관
  └─ 그 밖의 메시지
       → 기존 메인 스레드 큐

HostWorldSimulation.Step(T)
  → TickPreparing(T)
  → 2001 전용 큐를 최대 64 batch 처리
  → 기존 World·Authority·Entity 검사
  → 기존 SubmitInput으로 명령별 삽입
  → 기존 호스트 로컬 pre-tick 입력 준비
  → ResolveTick(T)
  → 권위 물리 실행
```

백그라운드 수신 스레드는 큐에 넣기만 하고 Unity actor, 입력 버퍼 및 물리를 실행하지 않는다.
한 batch 안에 오래된 명령과 미래 명령이 함께 있으면 batch 전체를 버리지 않고 기존
`SubmitInput` 계약에 따라 각 명령을 별도로 판정한다. 이미 확정된 과거는 기존대로
`RejectedStale`이며 재실행하지 않는다.

웨이팅룸과 인게임룸은 같은 UDP 클라이언트를 사용하지만 2001만 전용 큐로 분리된다. 호스트
권위 시뮬레이션이 활성화된 동안에는 pre-tick이 먼저 처리하고, 권위 pre-tick이 없는 웨이팅룸이나
일반 게스트에서는 기존 `Update` Pump가 같은 전용 큐를 보조적으로 처리한다. 한 이벤트는 큐에서
한 번 꺼내므로 두 경로에서 중복 발행되지 않는다. 다른 룸·월드·채팅·스냅샷 메시지는 기존 큐와
처리 순서를 유지한다. 재연결 시 전용 큐를 비우고, 월드 전환 뒤 도착한 이전 월드 2001은 기존
`Accepts(world)` 검사로 거절한다. wire 본문과 서버 계약은 변경하지 않았다.

호출당 처리 상한은 64 batch다. 상한 때문에 남은 입력은 버리지 않고 다음 pre-tick 또는 Update
Pump로 이월한다. 큐 대기시간과 Pump 실행시간은 서로 다른 지표로 기록한다.

| 로그 필드 | 가리키는 값 |
|---|---|
| `batches`, `commands` | pre-tick에서 실제 구독자와 기존 입력 처리 경로까지 전달한 양 |
| `pumpCalls` | 빈 큐 확인을 포함해 pre-tick Pump를 호출한 횟수 |
| `nonEmptyPumpCalls` | 한 개 이상의 batch를 실제 전달한 Pump 호출 횟수 |
| `pumpTotalElapsedMs` | 빈 호출을 포함한 모든 Pump 호출의 경과시간 합계 |
| `nonEmptyPumpTotalElapsedMs` | batch를 실제 전달한 Pump 호출의 경과시간 합계 |
| `budgetExhausted` | 64 batch 상한 때문에 처리를 중단한 pre-tick 호출 수 |
| `maximumRemaining` | 상한 도달 뒤 전용 큐에 남은 최대 batch 수 |
| `maximumQueueWaitMs` | 처리한 batch 중 소켓 수신 큐 대기시간 최댓값 |
| `pumpMaxElapsedMs` | 집계 구간에서 가장 오래 걸린 단일 Pump 호출의 경과시간 |
| `oldestRemainingWaitMs` | 처리 후 남은 가장 오래된 batch의 대기시간 최댓값 |
| `queuedBeforeResolveStale` | 수신 큐에는 해당 명령이 있었지만 그 tick 확정 뒤 삽입되어 stale이 된 고유 명령 수 |
| `hostQueueWaitAvgMs`, `hostQueueWaitMaxMs` | 같은 호스트 단조 시계로 계산한 수신 큐 진입→버퍼 삽입 대기시간 |
| `maxFallbackRun` | Entity별 연속 fallback tick의 구간 최댓값 |
| `movingNeutralTicks` | 마지막 실제 명령이 이동 중이었는데 Neutral fallback을 선택한 tick 수 |

명령 상세 로그는 같은 호스트 프로세스의 `receiveQueueTimestamp`, `lastResolvedTimestamp`,
`bufferInsertTimestamp`를 함께 기록한다. 서로 다른 게스트·호스트 프로세스의 시각을 빼지 않고
`A < B <= C`인 `queuedBeforeResolve`만 구분하기 위한 값이다.

자동 검증 결과는 다음과 같다.

| 테스트 | 결과 | 검증 범위 |
|---|---:|---|
| `HostAuthorityServiceTests` | 71/71 통과 | Update 없는 pre-tick 소비, 확정 후 stale, 혼합 batch 미래 명령 보존, 상한·반복 Pump·월드 전환 격리 |
| `HostWorldSimulationTests` | 6/6 통과 | 기존 TickPreparing→ResolveTick→권위 물리 순서 유지 |
| `UdpTransportRecoveryTests` | 2/2 통과 | 실제 UDP datagram 2001이 전용 Pump에서 먼저 한 번만 발행되고 기존 Update에서 중복되지 않음 |

이 결과는 전달 순서와 기존 계약 유지에 대한 코드 검증이다. 이후 아래 조건으로 4인 실측을
진행했다.

- 게스트별 `receivedResolved / (receivedResolved + heldFallback + neutralFallback)` 증가 여부
- 전체 fallback과 지속 이동 중 `NeutralFallback` 감소 여부
- 고유 명령 첫 삽입 `RejectedStale` 및 `queuedBeforeResolveStale` 감소 여부
- 연속 fallback 최댓값 감소 여부
- `budgetExhausted=0`, 잔여 큐 비증가 및 `pumpMaxElapsedMs`가 물리 tick을 지연시키지 않는지
- 이동 해제와 방향 전환이 오래된 held 입력 때문에 늦어지지 않는지

이번 단계에서는 Jump 조기 송신, 게스트 lead, ACK +12 상한, 3틱 backfill, fallback held 시간,
CharacterMotor 및 HostTick 보간을 변경하지 않았다.

##### 2001 pre-tick 전달 빌드 4인 실측 결과

실행 식별자는 다음과 같다.

```text
versionId: v0.1.0-4870c107708a-dirty-asm-2e1d4f9794fa
runId:     20260919-171354-pre-tick-input-queue-4player-ac
room:      Input4P-20260919-171354
```

실행 직전에 `GetSystemPowerStatus`로 `ACLineStatus=1`, 배터리 34%를 확인했다. 같은 PC에서
창 모드 클라이언트 4개를 실행했고 실제 호스트는 `host.log`, Entity 1이었다. 최종
`room=11`, `world=5`, `authority=5`, `actors=4`, `summaryValid=1`, `partial=0`인 204개
요약 창을 합산했다. 네 프로세스는 사용자가 테스트를 마친 뒤 모두 종료됐고 로그 파일은
버전 디렉터리에 보존됐다.

| Entity | 권위 처리 tick | 실제 명령 소비 | Held fallback | Neutral fallback | 전체 fallback |
|---:|---:|---:|---:|---:|---:|
| 1 — 호스트 | 12,354 | 12,354, 100.00% | 0 | 0 | 0.00% |
| 2 — 게스트 | 12,354 | 11,789, 95.43% | 475 | 90, 0.73% | 4.57% |
| 3 — 게스트 | 12,354 | 11,804, 95.55% | 446 | 104, 0.84% | 4.45% |
| 4 — 게스트 | 12,354 | 11,972, 96.91% | 329 | 53, 0.43% | 3.09% |

직전 Jump 조기 송신 빌드의 같은 한 PC·4인·AC 연결 실행에서는 게스트 전체 fallback이
21.95~24.14%였다. 이번 실행은 입력 동작을 완전히 자동 재생한 일대일 비교는 아니지만,
fallback은 3.09~4.57%로 감소했다. 처리 건수 기준 상대 감소율은 Entity 2 약 79.2%, Entity 3
약 80.6%, Entity 4 약 87.2%다. 세 게스트 모두 P1 임시 목표인 실제 입력 소비율 95% 이상과
Neutral fallback 1% 미만을 충족했다. 따라서 이미 수신한 2001을 `ResolveTick` 전에 전달한
변경이 일반 이동 입력 소비를 늘렸다는 근거가 있다.

이 결과를 “이전보다 더 나쁜 전체 부하에서도 개선됐다”고 단정하지는 않는다. 1,115ms 최대
프레임은 `world=5`, `lastCompletedTick=7`인 첫 요약 창에서 발생했다. 이 초기 월드 전환 창을
제외한 나머지 203개 창의 최대 프레임은 257.8ms였다. 큰 정체가 포함된 실행에서도 입력 소비율
목표를 충족했다는 사실과, 두 실행 전체의 부하 우열은 구분해서 해석한다.

| 첫 삽입·fallback 진단 | Entity 2 | Entity 3 | Entity 4 |
|---|---:|---:|---:|
| 고유 명령 첫 도착 | 12,136 | 12,080 | 12,241 |
| 첫 삽입 stale | 346, 2.85% | 275, 2.28% | 268, 2.19% |
| 수신 큐에는 있었지만 확정 뒤 삽입 | 4 | 17 | 32 |
| 최대 연속 fallback | 18틱 | 14틱 | 20틱 |
| 이동 중 Neutral tick | 19 | 49 | 0 |

`queuedBeforeResolveStale`은 전체 고유 도착 36,457건 중 53건, 약 0.15%였다. 대표 사례는
수신 큐 진입 뒤 2~16ms 사이에 대상 tick이 확정되고 삽입된 명령이었다. 처리 상한 적체는
아니었다. 204개 전 구간에서 `budgetExhausted=0`, `maximumRemaining=0`이었고 총 20,242
batch·73,232 command를 pre-tick 경로가 전달했다.

호스트 로컬 정확성은 `eligibleSteps=12,354`, `preparedTicks=12,354`,
`localFirstSubmitStale=0`, `heldMismatchTicks=0`, `avoidableNeutral=0`으로 유지됐다. 게스트 Jump는
65건 모두 호스트 첫 삽입이 Accepted였고 stale은 0건이었다. 게스트 로컬 진단에서도 65건 모두
`Attached → FirstSendRequested`로 연결됐고 `ResolvedBeforeFirstSend=0`이었다. 따라서 일반 이동
큐 변경이 이전 Jump 조기 송신 개선을 깨뜨린 징후는 없다.

호스트는 206.8초 동안 12,354 tick을 처리해 가중 평균 59.74Hz를 유지했다. 최저 1초 구간은
6.9Hz였고, 100ms 초과 구간은 8개, 250ms 초과 구간은 2개였다. 최대 프레임 1,115ms는 위에서
구분한 초기 월드 전환 창의 값이다.

기존 로그의 `maximumPumpElapsedMs` 표본은 개별 Pump 호출 전체가 아니라, 각 1초 집계 창에서
가장 오래 걸린 호출 하나씩을 뽑은 204개 값이다. 이 204개 최대값의 가운데 두 값은 16.091ms와
16.211ms이므로 일반적인 두 값 평균 중앙값은 16.151ms다. P95는 30.452ms, 전체 최댓값은
72.680ms였다. 따라서 이를 “Pump 한 번이 보통 16ms 걸린다”거나 개별 호출의 중앙값·P95·평균을
나타내는 값으로 해석할 수 없다. 72.680ms 호출이 기록된 사실은 유효하지만, 이 경과시간에는
처리 함수의 CPU 계산뿐 아니라 호출 중 OS 스케줄링 정체도 포함된다.

다음 계측은 기존 pre-tick 전달과 입력 의미를 그대로 유지하면서 1초 요약에 `pumpCalls`,
`nonEmptyPumpCalls`, `pumpTotalElapsedMs`, `nonEmptyPumpTotalElapsedMs`, `pumpMaxElapsedMs`를 남긴다.
호출당 전체 평균은 `pumpTotalElapsedMs / pumpCalls`, 실제 batch가 있었던 호출의 평균은
`nonEmptyPumpTotalElapsedMs / nonEmptyPumpCalls`로 계산한다. 빈 큐 확인과 실제 처리 호출을
분리하되, 호출별 P95가 필요하면 별도 히스토그램이나 원표본이 여전히 필요하다.

Unity Profiler에는 다음 좁은 구간을 추가한다. Deep Profiling은 사용하지 않는다.

| ProfilerMarker | 가리키는 구간 |
|---|---|
| `Network.PlayerInputBatch.Pump` | 전용 큐 Pump 호출 전체 |
| `Network.PlayerInputBatch.Dequeue` | 전용 큐에서 수신 이벤트를 꺼내는 구간 |
| `Network.PlayerInputBatch.Deserialize` | 2001 본문 역직렬화 구간 |
| `Network.PlayerInputBatch.Diagnostics` | wire/debug 진단 기록 구간 |
| `Network.PlayerInputBatch.Publish` | 구독자 발행과 그 아래 Bridge 처리 전체 |
| `HostAuthority.PlayerInputBatch.Handler` | 월드·Entity 검증과 명령별 처리 전체 |
| `HostAuthority.PlayerInputBatch.SubmitInput` | 명령을 권위 입력 버퍼에 삽입하는 구간 |
| `HostAuthority.PlayerInputBatch.Diagnostics` | 최초 삽입 통계와 상세 출력 구간 |

`Publish` 안에 `Handler`, 그 안에 `SubmitInput`과 Bridge `Diagnostics`가 포함되므로 중첩된 시간을
서로 더하지 않는다. 상세 진단 출력을 켠 실행과 끈 실행을 비교할 때도 입력 검증·삽입·통계
카운터와 모든 tick 규칙은 유지하고 문자열 생성·출력 비용만 분리해서 판단한다.

이 호출별 통계와 ProfilerMarker를 추가한 뒤 `HostAuthorityServiceTests` 71/71,
`HostWorldSimulationTests` 6/6, `UdpTransportRecoveryTests` 2/2를 다시 통과했다. 이번 계측 패치는
pre-tick 처리 상한, fallback 규칙, Jump 조기 송신, lead, ACK 상한, backfill, 모터 및 보간을
변경하지 않았다.

Guest2에서 `Object request ... timed out` 예외가 1회 기록됐다. 스택은
`RequestNightEndDropAsync → HostAuthorityObjectService.RequestAsync`로, 2001 입력이나 캐릭터 이동과
다른 기능 경로다. 다만 경로가 다르다는 사실만으로 공통 메인 스레드 정체의 영향을 받지 않았다고
단정할 수는 없어 별도 기능 이슈로 추적한다. 다른 세 로그에는 예외가 없었고 네트워크 이동 연결
종료·ProtocolViolation·입력 송신 실패는 관찰되지 않았다.

##### 호출별 Pump 계측 빌드 4인 실측 — 상세 진단 ON

실행 식별자는 다음과 같다.

```text
versionId: v0.1.0-035fcee324b8-dirty-asm-fdac5bd2d1a3
runId:     20260919-181526-pump-cost-metrics-detail-on-4player-ac-retry
room:      Input4P-20260919-181526
```

처음 실행한 `20260919-180508-pump-cost-metrics-detail-on-4player-ac`는 Guest3가 Unity 입력 초기화
중 종료되어 유효한 4인 실행으로 사용하지 않았다. 테스트 도구의 클라이언트 실행 간격을 기본
4초로 늘린 뒤 새 방에서 다시 실행했다. 재시도 로그의 `room=15`, `world=5`, `authority=5`,
`actors=4`이며 네 Entity 모두 `summaryValid=1`, `partial=0`인 253개 공통 요약 창만 합산했다.

| Entity | 권위 처리 tick | 실제 명령 소비 | Held fallback | Neutral fallback | 전체 fallback |
|---:|---:|---:|---:|---:|---:|
| 1 — 호스트 | 15,420 | 15,420, 100.00% | 0 | 0 | 0.00% |
| 2 — 게스트 | 15,420 | 14,592, 94.63% | 690, 4.48% | 138, 0.90% | 5.37% |
| 3 — 게스트 | 15,420 | 14,615, 94.78% | 709, 4.60% | 96, 0.62% | 5.22% |
| 4 — 게스트 | 15,420 | 14,684, 95.23% | 571, 3.70% | 165, 1.07% | 4.77% |

직전 pre-tick 실행의 3.09~4.57%보다 이번 fallback은 조금 높지만, pre-tick 이전 기준인
21.95~24.14%보다는 여전히 약 75.5~80.2% 낮다. 입력 유지시간을 늘린 결과가 아니라 실제 명령
소비가 늘어난 상태도 유지됐다. Entity 4의 Neutral 1.07%는 임시 목표 1%를 소폭 넘었다.

호스트 로컬은 `eligibleSteps=15,420`, `preparedTicks=15,420`이었고
`localFirstSubmitStale`, `heldMismatchTicks`, `avoidableNeutral`은 모두 0이었다. 게스트 점프 116건은
모두 로컬 `Attached → FirstSendRequested`와 호스트 첫 삽입 `Accepted`로 연결됐다. 점프 첫 삽입
stale과 `ResolvedBeforeFirstSend`는 0건이다. 이는 삽입 단계까지의 성공이며 모터가 116건을 모두
실행했다는 계측은 아니다.

| 항목 | 상세 진단 ON 결과 |
|---|---:|
| 유효 4인 구간 | 257.478초, 15,420 tick |
| 전체 Pump 호출 | 15,420회 |
| batch가 있었던 Pump 호출 | 10,605회 |
| 모든 Pump 호출 경과시간 합계·평균 | 32,805.213ms · 2.127ms/호출 |
| batch가 있었던 호출 합계·평균 | 32,790.297ms · 3.092ms/호출 |
| 1초 창별 단일 호출 최대값의 중앙값·P95 | 18.142ms · 48.162ms |
| 단일 Pump 호출 전체 최댓값 | 88.333ms |
| 처리 batch·command | 25,136 · 93,712 |
| 처리 상한 도달·최대 잔여 큐 | 0 · 0 |

Pump 경과시간 합계는 유효 구간 실시간의 약 12.74%다. 이는 Profiler의 CPU 전용 시간이 아니라
각 호출의 단조 시계 경과시간 합계다. 실제 계산·대기·스케줄링 중 무엇이 포함됐는지는 이 값만으로
구분할 수 없다. 그래도 평균 2.127ms와 비어 있지 않은 호출 평균 3.092ms는 입력 의미를
유지하면서 내부 구간을 조사할 근거가 된다.
최대 Pump 88.333ms가 포함된 창은 최대 프레임 100.4ms였고, 긴 Pump 창들은 대체로 긴 프레임과
같이 나타났다. 상세 로그가 원인이라고 아직 확정하지는 않는다.

이 구간에서 호스트가 출력한 명령 삽입·fallback 상세 로그는 3,936줄이었다. 다음 비교 실행은
요약·입력 검증·삽입·통계 카운터·tick 규칙을 그대로 유지하고 이 상세 문자열 생성과 출력만 끈다.
상세 OFF에서 호출 평균·단일 최대·fallback이 함께 낮아지면 진단 출력 비용을 줄일 근거가 생긴다.
비슷하면 ProfilerMarker로 역직렬화·Publish·SubmitInput 구간을 다음 대상으로 좁힌다.

같은 실행파일에서 `-disable-rubber-banding-detail`을 전달하면 다음 항목만 OFF가 된다.

- 일반 명령의 Accepted·Duplicate·stale 삽입 상세 문자열과 출력
- tick마다 발생하는 `[host-input]` fallback 상세 문자열과 출력

입력 삽입·소비·stale·fallback 카운터, 1초 요약, Pump 시간, 오류와 예상하지 못한 검증 거절은
그대로 남는다. Jump/Fire가 연결된 명령은 저빈도 사건 추적을 위해 상세 OFF에서도
`[guest-input-insert]`를 남긴다. `[host-input-pre-tick-pump]`의 `detailOutput=0|1`로 실제 적용
상태를 확인한다.

프레임 통계는 첫 월드 구간의 730.8ms 정체와 이후 구간을 구분한다. 첫 구간을 제외한 최대
프레임은 301.0ms였다. Entity 2의 `maxFallbackRun=59`는 Guest1 창이 포커스를 잃으며 1초 요약
구간이 1.688초로 늘어난 시점과 겹쳤고 다음 구간에서 정상 송신으로 복귀했다.

Guest2와 Guest3에는 밤 종료 아이템 반환의 `Object request ... timed out`이 각각 1회 있었다.
호스트와 Guest1에는 예외 헤더가 없었다. 이 timeout은 입력 경로와 다른 기능이지만 공통 메인
스레드 정체의 영향을 배제하지 않고 별도 항목으로 유지한다.

##### 호출별 Pump 계측 빌드 4인 실측 — 상세 진단 OFF

실행 식별자는 다음과 같다.

```text
versionId: v0.1.0-035fcee324b8-dirty-asm-29ec57deef4f
runId:     20260919-194243-pump-cost-metrics-detail-off-4player-ac
room:      Input4P-20260919-194243
```

실행 시작 때 `ACLineStatus=1`, 배터리 50%를 확인했다. manifest의
`rubberBandingDetailEnabled=false`와 모든 호스트 Pump 요약의 `detailOutput=0`을 확인했다.
`room=17`, `world=5`, `authority=5`, `actors=4`이며 네 Entity 모두 `summaryValid=1`,
`partial=0`인 288개 공통 구간을 합산했다.

| Entity | 권위 처리 tick | 실제 명령 소비 | Held fallback | Neutral fallback | 전체 fallback |
|---:|---:|---:|---:|---:|---:|
| 1 — 호스트 | 17,605 | 17,605, 100.00% | 0 | 0 | 0.00% |
| 2 — 게스트 | 17,605 | 16,674, 94.71% | 690, 3.92% | 241, 1.37% | 5.29% |
| 3 — 게스트 | 17,605 | 16,691, 94.81% | 679, 3.86% | 235, 1.33% | 5.19% |
| 4 — 게스트 | 17,605 | 16,513, 93.80% | 709, 4.03% | 383, 2.18% | 6.20% |

호스트 로컬은 `eligibleSteps=17,605`, `preparedTicks=17,605`였고
`localFirstSubmitStale`, `heldMismatchTicks`, `avoidableNeutral`은 모두 0이었다. 처리 상한 도달과
잔여 큐도 0이었다. 따라서 상세 OFF가 호스트 로컬 준비·입력 계약·큐 상한을 바꾼 징후는 없다.

| Pump 항목 | 상세 ON | 상세 OFF | 관측 차이 |
|---|---:|---:|---:|
| 전체 호출 평균 | 2.127ms | 2.498ms | 17.4% 증가 |
| batch가 있었던 호출 평균 | 3.092ms | 3.809ms | 23.2% 증가 |
| 빈 큐 호출 평균 | 약 0.0031ms | 약 0.0030ms | 사실상 동일 |
| 1초 창별 단일 최대값 중앙값 | 18.142ms | 22.342ms | 23.2% 증가 |
| 1초 창별 단일 최대값 P95 | 48.162ms | 65.474ms | 35.9% 증가 |
| 단일 Pump 전체 최댓값 | 88.333ms | 306.594ms | 증가 |
| Pump 경과시간/유효 구간 실시간 | 12.74% | 14.95% | 증가 |
| 처리 batch·command | 25,136 · 93,712 | 28,652 · 111,981 | 실행 길이·처리량 다름 |
| Pump 경과시간/command | 0.350ms | 0.393ms | 12.2% 증가 |

일반 삽입·fallback 상세 줄은 3,936줄에서 123줄로 96.9% 감소했고, OFF 실행의 틱별
`[host-input]` fallback 상세는 0줄이었다. 남은 123줄은 Jump/Fire 또는 예상하지 못한 거절을
추적하기 위한 저빈도 로그다. 즉 OFF 스위치는 의도한 출력 범위를 실제로 제거했다.

두 실행은 같은 Git 커밋을 기반으로 하지만 Assembly-CSharp 해시가 다르다. ON은
`fdac5bd2d1a3`, OFF는 상세 스위치를 추가해 재빌드한 `29ec57deef4f`다. 따라서 동일 실행파일에서
옵션만 바꾼 엄밀한 A/B는 아니다. 비어 있지 않은 Pump 호출당 평균 command도 ON 약 8.84개,
OFF 약 9.71개로 OFF가 약 9.8% 많았다. 다음 반복에서는 한 번 만든 동일 Development Player를
ON/OFF 양쪽에 사용하고 manifest의 어셈블리 해시가 같은지 확인한다.

그런데 Pump 비용은 낮아지지 않았다. OFF 실행에는 단일 Pump 306.594ms·255.266ms와 최대 프레임
310.9ms·368.5ms가 같은 창에 나타나는 긴 경과시간이 있었다. 첫 월드 구간의 최대 프레임
710.9ms를 제외해도 이후 최대 프레임은 403.0ms였다. Pump 계산이 프레임을 길게 만들었는지,
Pump 도중 대기했는지, 실행 가능하지만 CPU를 받지 못했는지는 로그만으로 구분할 수 없다.
따라서 확인된 결론은 “상세 출력 감소에 따른 Pump 경과시간 개선이 이번 비교에서는 관측되지
않았다”까지다. 로그 비용이 0이라거나 나머지가 OS 스케줄링 원인이라고 확정하지 않는다.

게스트 Jump는 122건 모두 `Attached → FirstSendRequested`였고
`ResolvedBeforeFirstSend=0`이었다. 그중 120건은 호스트 첫 삽입 Accepted, Entity 4의 2건은
RejectedStale이었다. 두 stale은 생성→첫 송신 요청 대기가 0ms였지만, 게스트가 받은 확정 경계보다
1틱 앞에 배정된 명령이 호스트 삽입 시 `insertSlackTicks=0`이 된 경우다. 상세 OFF로 Jump 자료를
잃지 않았다. 두 건 모두 `receiveQueueTimestamp > lastResolvedTimestamp`, `queuedBeforeResolve=0`이므로
수신 큐에 기록될 때부터 해당 tick은 이미 확정된 상태였다. 일반 Pump 큐 대기 최적화와 구분해
큐 진입 이전 전달 경로·수신 처리·입력 선행 여유 대상으로 남긴다.

이번 실행의 실제 입력 소비율은 93.80~94.81%, Neutral fallback은 1.33~2.18%로 임시 목표인
95% 이상·1% 미만을 충족하지 못했다. pre-tick 이전보다 개선된 구조의 효과는 유지됐지만,
상세 OFF가 회귀를 만들었다고 확정할 수 없고 부하 내성 목표는 반복 검증이 필요하다.

Guest2·Guest3에는 밤 종료 아이템 반환 timeout이 각각 1회, 호스트에는 Vivox 표시 이름
`ArgumentException`이 1회 있었다. 별도 기능 경로로 관리하되 공통 메인 스레드 정체 영향은
배제하지 않는다.

다음 판단은 입력 규칙을 바꾸는 것이 아니라 기존 ProfilerMarker로
Deserialize·Diagnostics·Publish·SubmitInput 구간을 캡처하는 것이다. ON/OFF 차이를 더 확실히
보려면 실행 순서를 바꾼 반복도 필요하다. 상세 OFF는 측정 옵션으로 유지하되, 이번 결과만으로
운영 기본값을 OFF로 확정하지 않는다.

##### Development Player Profiler 캡처 계획

`ProfilerPlayerBuilder.BuildWindowsDevelopmentPlayer`는 `BuildOptions.Development`와
`BuildOptions.StrictMode`로 Windows Player를 만들고 Deep Profiling은 포함하지 않는다.
Development Build는 Profiler를 활성화하며, 실행 도구의 `-ProfileHost`는 호스트에만 다음 인자를
전달한다.

```text
-profiler-enable
-profiler-log-file <runDirectory>/host-profiler.raw
-profiler-capture-frame-count 30000
-profiler-maxusedmemory 268435456
```

게스트 세 개는 같은 Development Player를 사용하지만 profiler raw 수집은 하지 않는다. manifest는
`profiler.enabled`, `hostOnly`, `deepProfiling=false`, 캡처 프레임 수·메모리·raw 경로를 기록한다.
공식 Unity 6 문서 기준으로 Development Build는 Profiler를 활성화하며, 위 커맨드 라인 인자는
시작부터 `.raw` 파일로 프로파일 데이터를 스트리밍한다.

- Development Build: https://docs.unity3d.com/6000.0/Documentation/ScriptReference/BuildOptions.Development.html
- Profiler 커맨드 라인: https://docs.unity3d.com/6000.0/Documentation/Manual/profiler-command-line-arguments.html

캡처에서는 `Time ms`, `Self ms`, `Calls`, `GC Alloc`을 함께 보고, 중첩된
`Publish → Handler → SubmitInput/Diagnostics` 시간은 더하지 않는다. 느린 Pump 프레임과 평상시
프레임을 각각 비교한다. Unity 타임라인으로도 실제 계산과 대기의 원인이 분명하지 않을 때만
호스트 메인 스레드를 WPR/WPA로 이어서 확인한다.

## 입력 로그 버전 관리

앞으로 4인 입력 로그는 파일명을 재사용해 덮어쓰지 않고 아래 식별자로 실행별 보관한다.

```text
Client/Build/InputLogs/
  v{bundleVersion}-{gitCommit}-{dirty 여부}-asm-{Assembly-CSharp 해시 앞 12자리}/
    {yyyyMMdd-HHmmss}-{실행 라벨}/
      host.log
      guest1.log
      guest2.log
      guest3.log
      manifest.json
```

`manifest.json`은 bundle version, Git commit, dirty 여부, 실제 빌드의
`Assembly-CSharp.dll` SHA-256·크기·수정 시각, 실행 파일, 요청 역할, 관찰된 실제 호스트 역할을
기록한다. 커밋이 같아도 로컬 수정 또는 빌드 산출물이 다르면 별도 버전으로 분리된다.

이번 실행은 다음 버전으로 보관했다.

```text
v0.1.0-53ceccfae690-dirty-asm-37ae4c79d449/
  20260919-103418-pre-tick-4player-completed/
```

4인 실행과 기존 로그 가져오기는 `Start-VersionedFourPlayerInputTest.ps1`로 통일한다. 새 실행은
각 창에 고정된 역할별 `-logFile`을 전달하고, 1/4 화면 크기와 위치를 적용한 뒤 PID와 역할을
manifest에 남긴다. 여러 Unity Player의 그래픽·입력 초기화가 겹치지 않도록 기본 실행 간격은
4초이며 `-LaunchDelayMilliseconds`로 조절한다. 이미 끝난 실행은 `-ImportFrom`과
`-ActualHostLogName`으로 같은 구조에 가져올 수 있다.

상세 OFF 비교 실행은 같은 스크립트에 `-DisableRubberBandingDetail`을 전달한다. manifest의
`rubberBandingDetailEnabled=false`와 호스트 Pump 요약의 `detailOutput=0`을 둘 다 확인한다.
옵션 추가 뒤 `HostAuthorityServiceTests` 71/71, `HostWorldSimulationTests` 6/6,
`UdpTransportRecoveryTests` 2/2를 다시 통과했다.

### P1. 게스트 입력 지연 내성 개선

- 긴 틱 공백에서 채울 3틱의 의미를 명확히 정의한다.
- 이미 호스트가 소비했을 가능성이 큰 공백 앞쪽보다 현재 목표 틱과 가까운 명령을 우선하는
  방안을 검증한다.
- fallback의 held 유지 시간을 실제 네트워크 지연과 프레임 정체 기준으로 재검토한다.
- 연결 단절 시 영구 이동이 발생하지 않도록 held 유지에는 명확한 시간 상한을 둔다.

완료 기준:

- 로컬 loopback 4인 테스트에서 게스트 실제 입력 소비율 95% 이상
- 정상 부하에서 Neutral fallback 1% 미만
- 입력 송신이 정상인 동안 지속 이동이 주기적으로 정지하지 않음

### P1. 스냅샷 송신과 catch-up 정리

- catch-up으로 여러 권위 틱을 한 프레임에 처리했을 때 과거 스냅샷을 전부 몰아 보내지 않고
  최신 상태 중심으로 송신하는 정책을 검토한다.
- 렌더 프레임 정체와 네트워크 송신 주기의 결합을 줄인다.
- 도착 시각 진단이 소켓 수신 시각인지 메인 스레드 dispatch 시각인지 구분하여 기록한다.

완료 기준:

- 정상 4인 테스트에서 스냅샷 최대 도착 공백 100ms 미만
- 외삽 상한 도달 0에 수렴
- HostTick 간격이 정상인데 같은 프레임에 스냅샷이 대량 처리되는 구간 제거

`P95 67ms`, `최대 공백 100ms`, `부하 해제 뒤 정상화 250ms`는 현재 장비와 동일한 4인
창 모드 시나리오에서 비교할 임시 성능 목표다. 입력 정확성 기준처럼 모든 환경에서 보장되는
계약은 아니며, 이 숫자를 맞추기 위해 먼저 보간 지연을 늘리지는 않는다.

### P1. 점프 한 건 단위 진단

대량 주기 로그가 아니라 Jump edge가 발생한 경우에만 아래 식별자를 연결하여 기록한다.

1. 게스트의 InputTick 및 명령 생성
2. 실제 송신 배치 포함 여부
3. 호스트의 Accepted, Duplicate, Stale 또는 기타 거절 결과
4. 해당 권위 틱의 Received, HeldFallback 또는 NeutralFallback
5. CharacterMotor의 점프 허용 여부와 거절 이유
6. 권위 위치 Y, 수직 속도 및 접지 상태
7. 게스트의 권위 스냅샷 수신과 Y축 reconcile 크기

완료 기준:

- 실패한 점프 한 건을 동일 World, EntityId, InputTick으로 끝까지 추적 가능
- Jump edge가 실행되지 않았다면 어느 단계에서 제거됐는지 로그만으로 확정 가능

### P2. 원격 표시와 teleport 의미 정리

- 명시적인 스폰, 라운드 전환 및 장거리 재배치에는 teleport 플래그를 설정한다.
- 보간 지연 증가는 호스트 송신 정체를 수정한 뒤 실제 잔여 jitter를 기준으로 결정한다.
- 400ms 정체를 숨기기 위해 상시 400ms 지연을 도입하지 않는다.

완료 기준:

- 단계 전환 재배치가 일반 이동 보간이나 large-step 경고로 처리되지 않음
- 정상 이동에서 50cm 이상 비의도적 화면 이동이 발생하지 않음

### P2. 호스트 선택 및 운영 안전장치

- 호스트 선정 시 최근 프레임 시간과 시뮬레이션 진행률을 고려한다.
- 배터리 절전이나 열 제한으로 호스트 성능이 지속 하락하면 경고 또는 host migration을
  검토한다.
- 한 PC 4개 실행은 스트레스 테스트로 유지하되, 각 PC 한 클라이언트 구성에서도 같은
  진단 기준을 적용한다.

## 최종 목표

호스트 성능이 떨어졌을 때 화질과 화면 부드러움은 저하될 수 있다. 그러나 이동 입력의 의미,
점프의 실행 여부 및 권위 시뮬레이션 결과는 가능한 한 유지돼야 한다. 호스트가 실제로 장시간
정지한 경우에만 구조적 한계를 허용하고, 짧은 프레임 정체가 게임 입력 소실로 바뀌지 않는
상태를 목표로 한다.
## 2026-09-19 Development Profiler 4인 캡처 결과

실행 식별자는 다음과 같습니다.

```text
versionId: v0.1.0-035fcee324b8-dirty-asm-b83b6d5810a7
runId:     20260919-201537-profiler-marker-detail-off-4player-ac-valid
room:      I4P20260919201537
```

동일한 Development Player 네 개를 2×2 창모드로 실행했고, 호스트에만 Unity Profiler 원본 수집 옵션을 적용했다.
상세 입력 문자열 출력은 OFF이고 Deep Profiling은 사용하지 않았다. `host-profiler.raw`는 약 1.46GB로 정상 마감됐다.
아래 입력 통계는 `room=19`, `world=5`, `authority=5`, `actors=4`, `summaryValid=1`인 234개 공통 구간만 합산한 값이다.

| Entity | 권위 처리 tick | 실제 명령 소비 | Held fallback | Neutral fallback | 전체 fallback | 첫 도착 stale |
|---:|---:|---:|---:|---:|---:|---:|
| 2 — 게스트 | 14,889 | 7,704, 51.74% | 3,651, 24.52% | 3,534, 23.74% | 7,185, 48.26% | 249 / 7,953 |
| 3 — 게스트 | 14,889 | 9,253, 62.15% | 2,675, 17.97% | 2,961, 19.89% | 5,636, 37.85% | 247 / 9,504 |
| 4 — 게스트 | 14,889 | 11,707, 78.63% | 1,862, 12.51% | 1,320, 8.87% | 3,182, 21.37% | 200 / 11,908 |

이 수치는 일반 빌드의 fallback 회귀로 해석하지 않는다. Development Profiler 캡처 중 게스트별 입력 `Update` 처리량이 크게 달랐다. 요약 창 하나가 정확히 1초는 아니므로, 처리율은 요약 개수가 아니라 각 로그의 `windowMs` 합계를 시간 분모로 사용해 다시 계산했다.

| 게스트 로그 | 실제 집계시간 | Update 횟수 | Update/s | 생성 명령 | 생성 명령/s | 목표 tick 조정(`clamped`) |
|---|---:|---:|---:|---:|---:|---:|
| guest1.log — Entity 2 | 248.815초 | 2,205 | 8.86 | 7,907 | 31.78 | 300 |
| guest2.log — Entity 3 | 251.597초 | 7,758 | 30.84 | 9,615 | 38.22 | 1,739 |
| guest3.log — Entity 4 | 251.577초 | 15,711 | 62.45 | 12,045 | 47.88 | 4,867 |

`clamped`는 최대 3틱 backfill 제한 횟수가 아니다. `PlayerInputStream.ConstrainGuestTick()`이 목표 tick을 수신한 확정 경계보다 뒤로 끌어오거나, 확정 경계 `+12` 선행 상한으로 낮췄을 때 증가하는 진단값이다. 최대 3개의 이전 tick 보충은 별도 `Math.Min()`으로 제한되며 이 카운터를 증가시키지 않는다.

현재 `Record()`는 한 번의 입력 갱신에서 큰 tick 공백이 생겨도 이전 tick부터 최대 3개를 보충하고 현재 목표 tick 한 개를 기록한다. 따라서 Entity 2는 `8.86 Update/s × 최대 4개 = 약 35.45개 명령/s`가 이론상 상한이어서, 호스트의 60 tick/s를 모두 채울 수 없다. Entity 2의 낮은 Update 처리율은 명확한 입력 공급 한계다.

다만 Entity 3·4의 fallback을 평균 Update 처리율만으로 설명하면 안 된다. 예를 들어 Entity 4는 `time=211.149`의 약 1초 창에서 `updates=57`, `commands=8`, `noCommandUpdates=55`, `clamped=57`을 기록했다. 이때 `lastResolvedTick=12130`, `lastRecordedTick=12142`, `nextInputTick=12169`으로, 마지막 기록 tick은 확정 경계 `+12` 상한에 붙어 있었다. 즉 Update가 실행돼도 이미 기록한 constrained tick과 같아 `Record()`가 새 명령을 만들지 않는 구간이 존재한다. 3틱 backfill 제한과 ACK 기반 선행 상한은 서로 다른 제한으로 분리해 분석한다.

따라서 이번 캡처의 큰 게스트 fallback은 pre-tick Pump 잔여 큐가 아니라, Entity 2에서는 낮은 Update 처리율과 호출당 생성 상한, Entity 3·4에서는 그 영향에 더해 목표 tick 제한으로 명령 생성이 생략된 구간이 함께 나타난 결과다. Development Build 비용, 호스트 Profiler 캡처 부하, 동일 PC의 자원 경쟁 중 어느 것이 게스트 처리율 저하를 얼마나 만들었는지는 이 집계만으로 분리할 수 없다.

호스트 로컬 입력은 `eligibleSteps=14,889`, `preparedTicks=14,889`로 100% 준비됐다.
`localFirstSubmitStale`, `heldMismatchTicks`, `avoidableNeutral`은 모두 0이므로 기존 호스트 pre-tick 계약은 유지됐다.
게스트 Jump는 131건 모두 `Attached → FirstSendRequested`였고 `ResolvedBeforeFirstSend=0`이었다.
호스트 첫 삽입도 Entity 3의 61건과 Entity 4의 70건, 총 131건 모두 `Accepted`였다.

텍스트 계측 기준 pre-tick Pump 결과는 다음과 같다.

| 항목 | 결과 |
|---|---:|
| Pump 호출 | 14,889 |
| 배치를 처리한 호출 | 2,828 |
| 전체 호출 평균 | 0.765ms |
| 배치를 처리한 호출 평균 | 4.019ms |
| 1초 구간별 최대값의 중앙값 | 8.418ms |
| 1초 구간별 최대값의 P95 | 13.048ms |
| 단일 호출 최대 | 23.230ms |
| 처리 상한 도달 / 잔여 큐 | 0 / 0 |

전체 호출 평균 `0.765ms`는 Pump가 빨라졌다는 뜻이 아니다. 전체 14,889회 중 2,828회만 실제 batch를 처리했고, 약 81%는 빈 큐 확인 호출이었다. 따라서 이 평균은 약 19%의 비어 있지 않은 호출 평균 `4.019ms`와 약 81%의 빈 호출 약 `0.002ms`가 섞인 가중값이다. 처리량·빌드 조건이 다른 일반 Player 실행과 이 수치만 비교해 내부 처리 성능을 판단하지 않는다.

이 경과시간만으로 계산과 스레드 대기를 구분할 수 없다는 기존 제한은 그대로다. Development 캡처에서 호스트 최대 프레임은 555.4ms였으므로 절대 성능 수치를 일반 Player와 직접 비교하지 않는다.

### Profiler 원본 분석 상태

원본 위치:

```text
C:/ssafy/S15P21D204/Client/Build/InputLogs/
  v0.1.0-035fcee324b8-dirty-asm-b83b6d5810a7/
  20260919-201537-profiler-marker-detail-off-4player-ac-valid/
  host-profiler.raw
```

원본은 정상 생성됐지만 자동 분석용 Unity Editor를 batch mode로 실행할 때 이 PC에서 유효한 Editor 라이선스를 찾지 못해 마커별 `Time ms`, `Self ms`, `Calls`, `GC Alloc` 추출은 완료하지 못했다.
이는 캡처 실패나 raw 손상을 뜻하지 않는다. Unity Editor 라이선스가 활성화된 환경에서 원본을 열고 다음 계층을 확인해야 한다.

```text
Network.PlayerInputBatch.Pump
 ├─ Dequeue
 ├─ Deserialize
 ├─ Diagnostics
 └─ Publish
      └─ HostAuthority.PlayerInputBatch.Handler
           ├─ SubmitInput
           └─ Diagnostics
```

이번 실행에서 확정할 수 있는 결론은 다음과 같다.

- 호스트 로컬 pre-tick 준비와 Jump 조기 송신의 정확성은 유지됐다.
- 처리 상한 때문에 전용 큐가 남은 구간은 없었다.
- 캡처 중 큰 일반 이동 fallback은 Entity 2의 낮은 입력 Update 처리율과 호출당 생성 상한, Entity 3·4의 목표 tick 제한을 함께 분리해서 읽어야 한다. `clamped`를 3틱 backfill 제한으로 해석하지 않는다.
- 이 Development 캡처만으로 pre-tick Pump 내부의 주 비용이 Deserialize, Publish, SubmitInput 중 어디인지 확정할 수 없다.
- 일반 빌드의 성능 개선 수치와 이번 Development Profiler 수치는 분리해 관리하며, 새 재테스트보다 보존된 raw의 마커별 Time/Self/Calls/GC Alloc 분석을 먼저 수행한다.
