# 입력 tick과 러버밴딩 로그 분석

- 분석일: 2026-09-18
- 브랜치: `fix/resolve-rubber-banding`
- 신규 로그: `Client/Build/host.log`, `guest2.log`, `guest3.log`, `guest4.log`
- 비교 로그: 바탕화면 `DOCS`의 이전 `guest2`/`host` 로그
- 빌드 확인: `Assembly-CSharp.dll` 수정 시각 15:35, 신규 로그 시작 15:36

## 1. 결론

중간 입력 tick backfill 수정은 신규 빌드에 포함됐다. 자기 화면에서 발생하는 일반 위치
보정은 감소했지만 완전히 없어지지는 않았다. 신규 `guest2`와 `guest3`의 일반 보정 125건은
모두 호스트의 같은 tick 또는 직전 tick fallback과 일치했다.

상대 화면에서 내 캐릭터가 끊겨 보이는 현상은 로컬 prediction/reconciliation과 다른
`HostAuthorityRemoteCharacter` 경로에서 발생한다. 현재 로그에는 원격 스냅샷 도착 간격과
보간/외삽 상태가 없어 직접 확정할 수는 없지만, 코드상 수신 시각 기반 보간과 상세 로그
부하가 스냅샷을 같은 프레임에 몰리게 할 가능성이 높다.

## 2. 로컬 보정 전후 비교

일반 이동의 `mode=smooth`만 집계했으며 순간이동은 제외했다.

| 실행 | 일반 보정 | 관찰 구간 | 초당 보정 | 평균 거리 | 중앙값 | 95백분위 | 최대 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 이전 guest2 | 179건 | 130.38초 | 1.365회 | 0.063m | 0.066m | 0.067m | 0.133m |
| 신규 guest2 | 59건 | 100.99초 | 0.574회 | 0.052m | 0.051m | 0.102m | 0.172m |
| 신규 guest3 | 66건 | 55.59초 | 1.169회 | 0.049m | 0.051m | 0.081m | 0.105m |

이전 guest2와 신규 guest2를 비교하면 보정 빈도는 약 58% 감소했고 평균·중앙값도 작아졌다.
신규 guest3은 이전 guest2보다 약 14% 낮은 빈도다. 다만 신규 guest2에서는 드물게
10~17cm 보정이 남아 있어 작은 보정만 줄고 큰 꼬리 구간은 완전히 제거되지 않았다.

## 3. 잔여 보정과 호스트 fallback의 관계

| 로그 | 일반 보정 | 같은 ack tick fallback | 직전 tick만 fallback | ±2 tick 안에 fallback 없음 |
|---|---:|---:|---:|---:|
| guest2 | 59 | 30 | 29 | 0 |
| guest3 | 66 | 35 | 31 | 0 |

스냅샷은 30Hz이고 물리는 60Hz이므로 홀수 tick fallback이 다음 짝수 tick 스냅샷의 보정으로
나타날 수 있다. 잔여 로컬 러버밴딩의 직접 원인은 여전히 권위 호스트가 정확한 tick 입력을
받지 못해 이전 입력 또는 중립 입력으로 확정한 것이다.

## 4. 신규 호스트 fallback 통계

| Entity | 관찰 tick | Received | Held | Neutral | fallback 비율 | 이동 중 Held |
|---:|---:|---:|---:|---:|---:|---:|
| 1 (호스트) | 12,667 | 9,787 | 2,857 | 23 | 22.74% | 10 |
| 2 (guest2) | 12,667 | 10,420 | 2,075 | 172 | 17.74% | 800 |
| 3 (guest3) | 12,338 | 9,753 | 2,385 | 200 | 20.95% | 538 |
| 4 (guest4) | 12,668 | 9,839 | 2,495 | 334 | 22.33% | 0 |

이전 실행과 비교하면 entity 2는 19.13%에서 17.74%, entity 3은 25.16%에서 20.95%,
entity 4는 35.29%에서 22.33%로 감소했다. entity 1은 8.77%에서 22.74%로 증가했지만
이동 중 HeldFallback은 10건뿐이고 대부분 정지 입력이었다.

guest2와 guest3에는 이동 중 fallback이 남아 있다. HeldFallback은 직전 이동을 계속하므로
직선 이동에서는 눈에 잘 띄지 않지만 방향 전환 시 이전 방향으로 한두 tick 더 진행한 뒤
새 방향으로 바뀔 수 있다. 로컬 prediction은 이를 숨겼다가 확정 스냅샷으로 보정하고,
다른 클라이언트는 호스트가 확정한 궤적을 그대로 보게 된다.

## 5. 상대 화면 끊김의 별도 경로

상대 캐릭터는 로컬 prediction/reconciliation을 사용하지 않는다.

```text
호스트 60Hz 물리
  -> 2 tick마다 30Hz snapshot 전송
  -> 수신 클라이언트 Update에서 UDP queue pump
  -> snapshot에 로컬 ReceivedAt 기록
  -> 80ms 과거 위치 보간
  -> 최신 snapshot 이후 최대 150ms 외삽
```

현재 `HostSnapshotBuffer`는 `HostTick`을 순서 판정에만 사용하고 보간 시간축에는 수신 측의
`ReceivedAt`을 사용한다. UDP pump는 한 프레임에 최대 200개 메시지를 처리한다. 여러
스냅샷이 같은 Unity 프레임에 처리되면 `Time.unscaledTime`이 같아질 수 있고,
`Normalize()`는 시간 간격이 0 이하일 때 `t=1`을 반환한다.

따라서 다음 현상이 가능하다.

```text
정상 보간
  -> 호스트 프레임 정체 또는 네트워크 burst
  -> 스냅샷 두 개 이상이 같은 수신 프레임에 처리됨
  -> 두 상태 사이의 시간 폭이 0이 되어 최신 위치로 즉시 이동
  -> 다음 snapshot 전까지 외삽
```

이 경로는 “내 화면은 부드러운데 상대 화면의 내 캐릭터만 간헐적으로 끊김”과 일치한다.
다만 현재 로그에는 `ReceivedAt` 간격이나 `t > 1` 비율이 없어 아직 코드 기반 가설이다.

## 6. 계측 로그 자체의 영향

신규 host 로그에는 전체 11,417개의 fallback 이벤트가 있고 파일 크기는 22,389,469바이트다.
이벤트 하나당 약 1,961바이트이며 매 이벤트에 Unity 전체 스택 트레이스가 붙는다.

월드 5에서는 211.12초 동안 10,541건, 초당 약 49.9건과 약 98KB의 텍스트를 기록했다.
`FixedUpdate`에서 반복되는 스택 생성과 파일 출력은 호스트 프레임 정체를 만들고, 30Hz
스냅샷이 한 렌더 프레임에 몰려 송수신되는 현상을 증폭할 수 있다. 따라서 이 상세 로그가
활성화된 상태의 원격 부드러움은 최종 성능으로 판단하면 안 된다.

## 7. 다음 실행에서 추가할 저비용 지표

fallback을 매 tick 출력하지 말고 1초 단위 집계와 no-stacktrace 출력으로 바꾼다.

| 위치 | 1초 집계 값 | 판정 목적 |
|---|---|---|
| 호스트 입력 | entity별 Received/Held/Neutral, 이동 중 fallback | 잔여 입력 확정 오류 |
| 호스트 snapshot | 전송 수, 같은 렌더 프레임 전송 수, hostTick 간격 | 호스트 프레임 정체·burst |
| 수신 snapshot | 수신 수, 도착 간격 avg/p95/max, 같은 frame 수신 수 | 네트워크 및 pump burst |
| 원격 렌더 | 보간 프레임, `t > 1` 외삽 프레임, 150ms 제한 도달 | 화면 끊김 직접 측정 |
| 화면 이동 | entity별 프레임 위치 변화 avg/p95/max | 실제 보이는 순간 이동 크기 |

## 8. 다음 실행 절차와 판정

1. 상세 fallback 로그를 경량 집계 로그로 교체한다.
2. 원격 snapshot·보간 지표를 추가한다.
3. 호스트와 guest2~4를 각각 별도 로그 파일로 실행한다.
4. 한 명은 좌우 왕복과 급격한 방향 전환을 반복하고 다른 화면에서 그 캐릭터를 관찰한다.
5. 끊긴 시각의 `sameFrameSnapshots`, 도착 간격, 외삽 비율, 이동 중 fallback을 비교한다.

| 결과 | 다음 수정 방향 |
|---|---|
| 같은 frame snapshot 또는 도착 간격 분산이 큼 | `HostTick` 기반의 단조로운 재생 시간축과 jitter buffer 적용 |
| 외삽 비율·150ms 도달이 큼 | snapshot 전달 지연과 호스트 프레임 정체 우선 해결 |
| 방향 전환 직전 이동 중 fallback이 반복 | 입력 lead/도착 마감과 호스트 처리 순서 보완 |
| 경량 로그에서 현상이 사라짐 | 기존 상세 로그 부하가 주요 증폭 원인 |

## 9. 이번 로그의 범위

- `NullReferenceException`, `MissingReferenceException`, `ArgumentException`은 발견되지 않았다.
- 각 프로세스에 미처리 packet 로그가 1건씩 있으나 현재 이동 packet과 직접 연결된 근거는 없다.
- 신규 빌드의 평균 렌더 FPS는 보정 이벤트 구간 기준 guest2 약 91.4, guest3 약 78.8이었다.
- 현재 자료만으로 원격 보간 문제를 확정할 수는 없다. 다음 실행에서 위 지표를 추가해야 한다.

## 10. 원격 렌더 계측 적용

`HostAuthorityRemoteCharacter`에 엔티티별 1초 집계 로그를 추가했다. 캐릭터 위치와 보간
결과는 변경하지 않고 이미 결정된 snapshot과 화면 위치를 관찰하기만 한다.

```text
[rubber-banding][remote-render]
```

| 필드 | 의미 | 정상 기대값 |
|---|---|---|
| `snapshots` | 1초 동안 관찰한 새 snapshot | 약 30 |
| `arrivalAvgMs` | 평균 도착 간격 | 약 33ms |
| `arrivalP95Ms`, `arrivalMaxMs` | 도착 지터와 긴 공백 | 낮을수록 좋음 |
| `sameArrival` | 같은 수신 시각으로 들어온 연속 snapshot | 0 |
| `tickGapMax` | 연속 snapshot의 최대 host tick 차이 | snapshot stride 기준 2 |
| `interpolation` | 앞뒤 상태 사이를 정상 보간한 frame | 대부분의 frame |
| `extrapolation` | 최신 상태보다 미래를 추정한 frame | 적을수록 좋음 |
| `extrapolationCapped` | 150ms 외삽 상한에 걸린 frame | 0 |
| `oldestHeld` | 버퍼가 부족해 가장 오래된 위치에 고정된 frame | 0 |
| `zeroSpan` | 보간 상태 두 개의 수신 시각 차이가 0인 frame | 0 |
| `movingFrozen` | 권위 속도는 있는데 화면 이동이 1mm 이하인 frame | 0에 가까움 |
| `visualStepAvgCm`, `visualStepMaxCm` | 프레임당 평균·최대 화면 이동 거리 | 최대값이 반복적으로 튀지 않아야 함 |

한 Update에서 여러 snapshot이 처리되는 경우를 놓치지 않도록 최신값 하나만 보는 대신
8칸 snapshot 버퍼에 남은 새 항목을 오래된 순서로 모두 집계한다. `guest-reconcile`,
`host-input`, `remote-render`는 stack trace 없이 출력해 진단 로그가 프레임을 흔드는 영향을
줄였다.

## 11. 수신·렌더 진단으로 확인한 수정 전 원인

수정 전 4클라이언트 로그(`*-before-tick-interpolation-20260918-165436.log`)에서 소켓은
대체로 30Hz 주기를 유지했지만 Unity pump가 한 프레임에 여러 snapshot을 처리했다.
연속 snapshot의 `tickGapMax`는 정상 stride인 2였으므로 일반적인 packet 유실이 원인은
아니었다. 문제 클라이언트에서는 다음과 같은 큰 화면 이동이 반복됐다.

```text
step=72.88cm, fromTick=..., toTick=..., t=3.409
step=73.47cm, fromTick=..., toTick=..., t=2.401
```

기존 보간은 각 snapshot의 로컬 `ReceivedAt` 차이를 시간 폭으로 사용했다. 같은 pump에서
snapshot이 몰리면 호스트상 2tick(33.3ms) 간격인 상태가 로컬에서는 8~16ms 간격으로
기록됐다. 화면 시계는 정상 속도로 진행하는데 보간 구간만 짧아져 `t`가 2~3을 넘었고,
그 결과 두 호스트 상태 사이를 몇 배 빠르게 재생했다. 이것이 상대 화면에서 보인
“뒤로 끌렸다가 앞으로 튀는” 현상의 직접 원인이다.

## 12. HostTick 시간축 수정

원격 화면 시계를 packet 도착 시각과 분리했다.

```text
세션 EstimatedHostTick
  -> 로컬 프레임 시간으로 소수 tick을 연속 진행
  -> 80ms에 해당하는 tick만큼 과거를 renderTick으로 선택
  -> HostSnapshotBuffer를 HostTick 기준으로 샘플링
  -> 최신 HostTick 이후일 때만 실제 외삽
```

- `HostSnapshotBuffer.TrySampleHostTick`: `HostAuthorityModels.cs`
- `HostTickRenderClock`: `HostAuthorityModels.cs`
- 실제 적용: `HostAuthorityRemoteCharacter.LateUpdate`
- 세션 시계 전달: `HostAuthorityCharacterSpawner`

`HostTickRenderClock`은 세션의 정수 tick 사이를 로컬 프레임 시간으로 연속 진행한다.
정수 내림으로 생기는 1tick 이내 차이는 무시하고, 작은 시계 오차는 초당 최대 2tick만
보정한다. 0.5초 이상 벌어진 월드 전환·재동기화만 즉시 맞춘다. uint wrap-around도
현재 render tick에 가장 가까운 연속 값으로 펼쳐 처리한다.

외삽 시간도 `renderTime - ReceivedAt`이 아니라 `(renderTick - latestHostTick) / SimulationHz`
로 계산한다. 따라서 Unity pump가 늦게 실행됐다는 이유만으로 외삽 시간이 늘어나지 않는다.

## 13. 수정 전후 동일 이동 구간 비교

수정 후 로그는 `*-after-hosttick-20260918-172004.log`이다. 로딩과 결투장 전환을 제외하고,
entity 4가 약 21초 동안 연속 이동한 구간을 비교했다.

| 구분 | 관찰 클라이언트 | 평균 FPS | arrival p95 | sameArrival | 외삽 frame | movingFrozen | 평균 step | 최대 step | 25cm 이상 step |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 수정 전 | host 이름 로그 | 45.7 | 69.1ms | 28 | 3/971 | 7 | 7.92cm | **73.47cm** | **37회** |
| 수정 전 | guest3 | 48.0 | 54.1ms | 16 | 0/1,023 | 7 | 7.50cm | 24.91cm | 0회 |
| 수정 후 | guest3 | 41.7 | 65.7ms | **76** | 1/887 | 0 | 8.71cm | **23.06cm** | **0회** |
| 수정 후 | guest4 | 42.5 | 63.9ms | **67** | 1/861 | 0 | 8.63cm | **21.32cm** | **0회** |

수정 후가 FPS는 더 낮고 같은 pump에서 처리된 snapshot 수는 더 많았다. 그럼에도 두 관찰
클라이언트 모두 25cm 이상 큰 step이 0회였다. `tickGapMax=2`도 전후 동일했다. 따라서
개선은 packet 유실이나 실행 환경이 좋아진 결과가 아니라 HostTick 시간축 적용의 결과로
판단한다.

수정 전 큰 step 37회 중 `t > 1`로 기록된 최악 구간은 최대 `t=3.409`였다. 수정 후 동일
이동 구간에는 large-step 로그 자체가 없었다. 별도의 두 번째 이동 구간에서 28.41cm step이
한 번 있었으며, 이는 실제 snapshot 공백으로 37.4ms 외삽한 경우(`t=2.122`)였다.

## 14. fallback과 로컬 reconciliation 비교

동일 21초 구간에서 entity 4의 호스트 입력 fallback은 다음과 같다.

| 구분 | fallback | 60Hz tick 대비 | 이동 입력 fallback |
|---|---:|---:|---:|
| 수정 전 | 182 | 14.4% | 134 |
| 수정 후 | 233 | 18.5% | 207 |

fallback은 오히려 증가했지만 원격 화면의 25cm 이상 step은 37회에서 0회로 줄었다. 따라서
fallback은 방향 전환 궤적을 다소 부자연스럽게 만들 수 있는 별도 문제이지만, 이번에 관찰한
큰 순간 가속의 직접 원인은 아니었다.

로컬 entity 4의 reconciliation은 수정 전 10회, 수정 후 31회였다. 평균 보정 거리는
5.16cm에서 4.49cm로 감소했고 최대는 5.70cm에서 10.40cm로 증가했다. 모든 보정은
`smooth`였고 `distance-snap`은 0회였다. 즉 로컬 캐릭터가 즉시 확정 위치로 순간이동한
사례는 없으며 기존 0.15초 visual offset 감쇠가 적용됐다.

## 15. 결투장 이후와 남은 현상

월드 전환 시각 약 169초에는 캐릭터들이 40m 떨어진 결투장 spawn으로 이동해 38~41m
step이 기록됐다. 이것은 의도된 위치 전환이므로 이동 러버밴딩 통계에서 제외했다.

전환 직후 안정화 구간을 제외한 결투장 이동에서는 최대 step이 관찰자별 약 30.41cm와
31.96cm였다. 이때 FPS는 약 37~41이고 large-step의 보간계수는 모두 `t <= 1`이었다.
기존처럼 packet 도착 간격을 압축 재생한 것이 아니라, 한 PC에서 비활성 창 4개를 동시에
실행한 낮은 FPS와 빠른 이동·점프가 합쳐진 프레임 간 이동이다.

추가로 한 비활성 클라이언트에서 정지 중 `tickGapMax=28`, `arrivalMax=701.8ms`가 한 번
관찰됐다. 해당 1초의 entity 4 화면 이동은 0cm였고 동일 이동 재현 구간에서는
`tickGapMax=2`였으므로 이번 끊김과 직접 연결되지는 않는다. 실제 여러 PC 환경에서도
반복된다면 네트워크 또는 비활성 창 scheduling을 별도로 조사해야 한다.

## 16. 최종 판정

- 수신 시각 기반 보간이 만든 급가속·되감기형 원격 러버밴딩: **해결 확인**
- 중간 입력 tick backfill: 1차 조치였으며 아래 §25의 고정 tick 구조로 대체
- 방향 전환 때의 HeldFallback: 일부 남음, 별도 최적화 대상
- 한 PC 4창의 저FPS 프레임 step: 남음, 네트워크 보간 문제와 구분 필요
- Unity EditMode 관련 테스트: develop 병합 후 **22/22 통과**
- 적용 커밋: `7c871d1d fix: 원격 캐릭터 러버밴딩 보간 안정화`

## 17. 19:59 실행 로그에서 확인한 잔여 문제

추가 계측을 넣은 Development Build 4개를 같은 PC에서 실행한 로그를 다시 분석했다.

- `Client/Build/Logs/rubber-host-20260918-195905.log`
- `Client/Build/Logs/rubber-guest2-20260918-195905.log`
- `Client/Build/Logs/rubber-guest3-20260918-195905.log`
- `Client/Build/Logs/rubber-guest4-20260918-195905.log`

| 항목 | guest2 | guest3 | guest4 | 합계 |
|---|---:|---:|---:|---:|
| 원격 렌더 1초 집계 | 756 | 748 | 743 | 2,247 |
| large-step 집계 | 30 | 27 | 11 | 68 |
| jump-step 집계 | 52 | 13 | 44 | 109 |

large-step 68건 중 9건은 결투장 이동으로 생긴 36~43m 순간이동이었다. 이를 제외한 일반
large-step은 59건이고 최대 프레임 이동은 61.1cm였다. 그중 23건은 렌더 프레임 자체가
50ms보다 길었으며, 이 경우 실제 속력으로 한 프레임 동안 이동할 거리와 대체로 일치했다.
즉 이 23건은 네트워크 보간 오류라기보다 낮은 화면 FPS에서 보이는 큰 프레임 간 이동이다.

## 18. 실제 스냅샷 정체 후 보정 점프

같은 Entity와 같은 HostTick에서 서로 다른 두 관찰 클라이언트가 약 60cm의 화면 점프를
동시에 기록했다.

| 관찰자 | Entity | from/to tick | 화면 step | 현재 frame | snapshot 수신 공백 | 외삽 최대 |
|---|---:|---:|---:|---:|---:|---:|
| guest2 | 3 | 9074/9076 | 61.10cm | 17.3ms | 161.6ms | 132.1ms |
| guest4 | 3 | 9074/9076 | 60.23cm | 16.1ms | 166.7ms | 유사 구간 |

두 경우 모두 현재 화면 프레임은 약 16~17ms로 정상이었고, 실제 snapshot 도착 간격의
최대값은 226~235ms였다. 따라서 이 점프는 현재 프레임 저하 때문이 아니다.

```text
snapshot이 160~235ms 동안 늦음
  -> 80ms 지연 버퍼를 모두 소비
  -> 최신 확정 속도로 계속 외삽
  -> 뒤늦게 새 snapshot 묶음 도착
  -> 새 확정 궤적으로 한 프레임에 약 60cm 보정
```

HostTick 기반 보간은 같은 프레임에 들어온 snapshot을 잘못 빠르게 재생하던 문제를
해결했지만, 실제 도착 공백이 현재 80ms 지연 버퍼보다 긴 경우까지 숨길 수는 없다.

## 19. 증상별 판정

| 사용자에게 보인 현상 | 로그·코드 판정 |
|---|---|
| 렉이 심하면 로컬 게스트가 거의 이동하지 못함 | 렌더 프레임 사이에 4tick 이상 비면 기존 `PlayerInputStream`이 중간 tick을 하나도 만들지 않음 |
| 상대 캐릭터가 순간적으로 빨라짐 | 외삽 위치와 뒤늦은 새 확정 궤적의 차이를 한 프레임에 적용하는 화면 보정 점프 |
| 대시 중 툭툭 떨림 | 7m/s 속력 때문에 같은 보정 오차가 걷기보다 크게 보이며, snapshot 정체 후 보정이 더 부각됨 |
| 점프 뒤 갑자기 아래로 꽂힘 | 오래된 수직 속도로 외삽한 뒤 새 확정 Y 위치로 즉시 복귀하는 경로가 확인됨 |
| 실제 천장 접촉 뒤 수직 상태가 이상함 | `CharacterController.Move`의 `CollisionFlags.Above`를 무시해 양수 수직 속도가 남을 수 있음 |

이번 19:59 실행에서는 호스트 입력 fallback과 게스트 reconciliation이 사실상 발생하지
않았다. 따라서 이 실행의 약 60cm 점프를 입력 fallback이나 로컬 reconciliation 문제로
설명할 수 없다.

## 20. 저 FPS 입력 공백 1차 보완(폐기됨)

> 이 절의 최대 3tick backfill 방식은 2026-09-18 최종 수정에서 폐기됐다. 현재 구조는
> 렌더 `Update`에서 공백을 사후 보충하지 않고 §25처럼 `FixedUpdate`마다 한 tick을 만든다.

`MaximumBackfilledMissingTicks`는 3이지만 기존 구현은 `missingTicks <= 3`인 경우에만
backfill했다. 따라서 4tick이 비면 3tick을 채우는 것이 아니라 0tick을 채우고 현재 tick만
기록했다. 낮은 FPS가 계속되면 로컬 예측과 호스트 입력 모두 이동 시간을 잃는다.

수정 원칙은 다음과 같다.

```text
비어 있는 tick 1~3개: 모두 직전 held 입력으로 채움
비어 있는 tick 4개 이상: 앞쪽 최대 3개만 채우고 현재 tick 기록
Jump/Fire edge: 중간 tick에 복제하지 않고 현재 tick에만 1회 기록
```

오래된 입력을 무제한 재생하지 않는 3tick 상한은 유지한다. 긴 공백은
`[rubber-banding][input-gap]` 로그에 `missingTicks`와 `backfilledTicks`를 남겨 다음
저전력/비활성 창 테스트에서 확인한다.

## 21. 원격 화면 보정 수정 원칙

다음 snapshot이 들어왔을 때 raw 보간 위치를 즉시 화면에 대입하지 않는다. 직전 화면
위치와 새 raw 위치의 차이를 **시각 오프셋**으로 잡고 짧은 시간 동안 0으로 감쇠한다.

```text
물리·판정 위치: 최신 호스트 확정 위치를 즉시 사용
raw 화면 목표: HostTick 보간/제한 외삽 결과
보이는 위치: raw 화면 목표 + correction offset
correction offset: 직전 보이는 궤적과 raw 목표의 차이에서 시작해 짧게 0으로 감쇠
```

적용 조건과 예외는 다음과 같다.

- 새 snapshot으로 표본 tick이 바뀌었고 외삽 궤적과 새 궤적 사이에 비정상 step이 있을 때만 시작한다.
- 정상 보간 프레임마다 offset을 다시 만들지 않는다.
- `Teleport`와 `SnapDistance` 이상의 의도된 위치 변경에는 감쇠를 적용하지 않는다.
- 수평과 수직을 함께 보정해 대시 떨림과 점프의 아래 방향 꽂힘을 같은 원리로 완화한다.
- 물리 충돌 proxy와 확정 상태는 늦추지 않으며 화면 모델만 보정한다.

## 22. 천장 충돌 수정 원칙

호스트 `CharacterMotor`와 게스트 `PredictiveCharacterMotor`가 수직 `Move`의 반환값을 함께
검사한다. 위쪽 충돌(`CollisionFlags.Above`)인데 수직 속도가 양수면 즉시 0으로 만든다.
한쪽 모터에만 적용하면 snapshot마다 prediction이 갈라지므로 반드시 둘을 같은 순서와
같은 규칙으로 수정한다.

## 23. 검증 기준

1. 기존 HostTick 보간, uint wrap-around, 고정 입력 tick 테스트가 모두 통과해야 한다.
2. 텔레포트는 즉시 적용되고 일반 보정만 감쇠해야 한다.
3. 160ms 이상 snapshot 공백 뒤 첫 화면 step이 기존 약 60cm보다 작아야 한다.
4. 보정은 유한 시간 안에 0이 되어 캐릭터가 목표 위치에 영구적으로 뒤처지지 않아야 한다.
5. 점프 중 실제 천장 충돌 후 호스트와 게스트 예측의 수직 속도가 모두 0 이하가 되어야 한다.
6. 저 FPS에서도 각 `FixedUpdate`는 명령과 예측 물리를 최대 한 tick만 실행해야 한다.
7. 걷기 다리 배율 변경은 물리 속도와 무관해야 한다. 로컬은 기존 실제 속도 환산을
   유지하고, CharacterController가 꺼진 원격은 고정 배율을 사용해야 한다.

## 24. 실제 적용 결과

위 원칙에 따라 다음 변경을 적용했다. 아직 실제 4클라이언트 재현 로그 전이므로
“코드·단위 테스트 완료” 상태이며 체감 완료 판정은 다음 Development Build 실행 뒤에 한다.

| 변경 | 적용 내용 |
|---|---|
| 원격 화면 보정 | 비정상 raw step에서 직전 화면 궤적을 source로 offset 생성 후 기본 0.15초 감쇠 |
| 보정 시작 기준 | 정상 속력 × 현재 frame 시간보다 8cm 이상 더 큰 step이며 sample tick이 바뀐 경우 |
| 텔레포트 | `Teleport` 상태 또는 4m 이상 raw step은 보정 없이 즉시 적용 |
| 수직 보정 | 수평과 같은 offset에 Y도 포함해 늦은 점프 snapshot의 아래 방향 꽂힘 완화 |
| 천장 충돌 | 호스트와 게스트 예측 모두 `CollisionFlags.Above`에서 양수 수직 속도를 0으로 설정 |
| 긴 입력 공백 | 1차로 최대 3tick backfill을 적용했으나 §25의 고정 tick 구조로 대체 |
| 걷기 애니메이션 | 5종 캐릭터의 다리 배율을 1.15로 올림. 로컬은 기존 속도 기반, 원격은 고정 1.15배 사용 |

원격에 확정 수평속도(m/s)를 로컬 식 그대로 공급하는 첫 시도는 폐기했다. 원본 애니메이션
속도가 약 0.3m/s라서 걷기 4m/s는 약 13배, 달리기 7m/s는 약 23배로 환산돼 상대 화면의
다리가 지나치게 빨라졌다. 원격 CharacterController는 의도적으로 비활성 상태이므로
물리 속도 환산을 재현하지 않고 프리팹의 `_footSpeedScale=1.15`를 재생 배율로 직접 쓴다.

새 원격 1초 집계에는 다음 필드가 추가됐다.

| 필드 | 의미 |
|---|---|
| `correctionStarts` | 새 비정상 궤적 차이 때문에 화면 보정을 시작한 횟수 |
| `correctionFrames` | 보정 offset이 실제로 남아 있던 화면 frame 수 |
| `correctionOffsetMaxCm` | 해당 1초 구간에서 감쇠한 최대 화면 차이 |

순수 로직 테스트는 다음을 고정한다.

- 61cm raw 점프가 첫 frame에는 기존 3.2m/s 속력의 정상 이동거리 5.44cm만 보인다.
- offset은 0.15초 후 정확히 0이 된다.
- 정상적인 7m/s frame 이동에는 보정을 시작하지 않는다.
- 4m 이상 텔레포트에는 보정을 시작하지 않는다.
- 위쪽 충돌은 상승 속도만 0으로 만들고 측면 충돌이나 하강 속도는 보존한다.
- Jump/Fire edge는 렌더 `Update`에서 래치되고 다음 유효 고정 tick에 한 번만 남는다.

Unity EditMode 관련 테스트 결과: **80/80 통과**.

## 25. 최종 수정: 렌더 입력과 고정 예측 tick 분리

### 25.1 폐기한 접근

4클라이언트 로그에서 최대 11tick 공백이 보였다는 이유로 backfill 상한을 11tick으로
올리고 최근 12개 명령을 두 UDP datagram으로 보내는 변경을 시도했지만 폐기했다.
관측된 PC의 최대 공백과 기존 `MaximumResolvedTickLead=12`에 맞춘 값이라 더 느린 PC나
더 긴 정체에서 같은 문제가 다시 발생하기 때문이다. 이 시도는 커밋·푸시하지 않았다.

### 25.2 현재 구조

```text
Update
  -> 최신 held 입력 저장
  -> Jump/Fire edge 래치
  -> 송신 주기일 때 최근 미확정 명령 전송

FixedUpdate
  -> 세션의 RTT 반영 NextInputTick 확인
  -> 입력 명령을 최대 1개 생성
  -> 비호스트 게스트만 예측 motor를 정확히 1tick 실행

authoritative snapshot
  -> LastResolvedInputTick 이하 history 제거
  -> 확정 상태 복원 후 아직 미확정인 명령만 재실행
```

`LastResolvedInputTick + 12`에 도달하면 입력 생성 자체를 멈추던
`MaximumResolvedTickLead=12`와 `ConstrainGuestTick`을 제거했다. 확정 tick은 이제 history
정리와 reconciliation 경계로만 사용하며, 게스트 입력 목표는 왕복 지연을 반영한
`HostAuthoritySession.NextInputTick`을 따른다.

### 25.3 긴 정체 처리

씬 로딩이나 OS 정지 뒤의 수백 tick을 한 프레임에 무제한 재생하지 않는다. 복구 가능한
tick 수는 하드코딩하지 않고 아래 값으로 매 FixedUpdate 계산한다.

```text
maximumCatchUpTicks = ceil(Time.maximumDeltaTime / (1 / SimulationHz))
```

목표와 마지막 기록 tick 차이가 이 범위를 넘으면 Unity가 이미 폐기한 과거 물리 시간은
건너뛰고, 실제로 실행할 최근 고정 tick 구간부터 한 tick씩 진행한다. 이때 Development
Build에는 다음 로그가 남는다.

```text
[rubber-banding][prediction-resync]
baselineTick=... desiredTick=... skippedTicks=... catchUpTicks=...
```

HUD 진단값은 `PredictionResyncs`와 `PredictionTicksSkipped`이며, 기존 ACK 기반
`InputTicksClamped`는 제거했다.

### 25.4 해결 범위

| 항목 | 결과 |
|---|---|
| 렌더 FPS가 낮을 때 한 Update에서 입력 tick이 여러 칸 비는 문제 | 고정 tick 생성으로 제거 |
| ACK가 200ms 이상 늦으면 로컬 예측이 멈추는 문제 | ACK+12 제한 제거로 해결 |
| 중간 tick 상한을 PC 로그값에 맞추는 문제 | 하드코딩 backfill 제거 |
| Jump/Fire edge 중복·유실 | Update 래치 후 다음 고정 tick에 1회 적용 |
| 패킷당 최대 8개 규격 | 그대로 유지. 시뮬레이션 tick 제한으로 사용하지 않음 |
| 관전자 자체가 저FPS라 화면이 끊기는 문제 | 별도 문제. 프레임 제한·원격 보간 로그로 계속 확인 |
| 실제 패킷 유실·호스트 물리 정지 | 별도 문제. 이번 변경만으로 숨기지 않음 |

관련 Unity EditMode 테스트 결과: **80/80 통과**.

## 26. 4클라이언트 재검증에서 발견한 게스트 고정 주기 불일치

### 26.1 증상

첫 고정 tick 빌드를 4개 실행했을 때 웨이팅룸의 비호스트 게스트가 제자리에서 심하게
떨리고, 이동 키를 눌러도 벽에 막힌 것처럼 거의 움직이지 않았다. 같은 방의 호스트는
정상적으로 움직였다.

### 26.2 원인

프로젝트 기본 `Time.fixedDeltaTime`은 `0.02초`, 즉 50Hz다. 호스트는
`HostWorldRunner`가 세션 시작 시 이를 `1 / SimulationHz`(현재 협상값 60Hz)로 바꾸지만,
게스트는 권위 Runner를 만들지 않으므로 50Hz가 그대로 남았다.

따라서 게스트의 새 구조는 입력과 예측을 초당 50회만 만들고, 호스트 권위 월드는 초당
60tick을 확정했다. 부족한 약 10tick/초는 호스트가 입력 fallback으로 처리했다. 확정
snapshot이 게스트 예측보다 계속 앞서므로 게스트는 매번 과거 입력을 재생해도 따라잡지
못했고, 로컬 화면에는 되감김·제자리 떨림·이동 저항으로 나타났다.

이 경우 `prediction-resync` 로그가 없을 수 있다. snapshot의
`LastResolvedInputTick`이 fallback을 포함해 계속 앞으로 이동하므로, 입력 스트림 관점의
기준 tick도 갱신되어 큰 누적 gap 조건에 도달하지 않기 때문이다.

### 26.3 수정

`HostAuthorityLocalCharacter`가 비호스트 게스트일 때만 세션 시작 시
`Time.fixedDeltaTime = 1 / SimulationHz`를 적용한다. 세션 종료나 오브젝트 파괴 시에는
시작 전 값을 복원한다. 호스트는 기존처럼 `HostWorldRunner`가 유일하게 고정 주기를
소유하므로 두 컴포넌트가 같은 전역 값을 중복 관리하지 않는다.

```text
호스트: HostWorldRunner -> FixedUpdate를 협상된 SimulationHz에 맞춤
게스트: HostAuthorityLocalCharacter -> FixedUpdate를 같은 SimulationHz에 맞춤
결과:   입력 생성 / 로컬 예측 / 호스트 권위 처리 = 동일한 tick 빈도
```

이 값은 특정 PC에서 관측된 11tick·12tick 같은 제한값이 아니다. 서버가 세션에 전달한
`SimulationHz`를 사용하므로 프레임 성능이나 장치가 달라도 같은 시뮬레이션 시간축을
공유한다. 수정 후 관련 Unity EditMode 테스트는 다시 **80/80 통과**, Development Build도
성공했다.
