# Host Profiler Pump 비교 결과 (2026-09-19)

## 범위와 추출 상태

- 원본: `Client/Build/InputLogs/v0.1.0-035fcee324b8-dirty-asm-b83b6d5810a7/20260919-201537-profiler-marker-detail-off-4player-ac-valid/host-profiler.raw`
- Unity Editor: `6000.3.22f1`
- `ProfilerDriver.LoadProfile` 성공
- 캡처 프레임: `996`~`2995` (2,000개 Pump 행)
- 선택 스레드: `thread=0`, `Main Thread`
- 느린 행: 중간 90% 구간에서 Pump `Time ms` 최대
- 보통 행: 같은 구간에서 Pump `Time ms` 중앙값에 해당하는 행
- raw에는 로딩/씬 전환 같은 의미론적 phase 라벨이 없으므로, 선택 행을 초기 로딩/전환이라고 판정하지 않았다. 두 행 모두 캡처 중간의 steady 후보로만 표시한다.

`Time ms`는 하위 샘플을 포함하고 `Self ms`는 하위 샘플을 제외한다. 따라서 `Publish` 아래의 `Handler`·`SubmitInput`을 다시 더하지 않았다. `GC Alloc`은 Hierarchy의 `columnGcMemory` 값(바이트)이다.

## 비교 표

| 구분 | 프레임 | 스레드 | 프레임 Time ms | 마커 | Time ms | Self ms | Calls | GC Alloc (B) |
|---|---:|---|---:|---|---:|---:|---:|---:|
| 느림 | 2209 | Main Thread (0) | 118.143600 | `Network.PlayerInputBatch.Pump` | 23.245700 | 0.119200 | 5 | 164,404 |
| 느림 | 2209 | Main Thread (0) | 118.143600 | `Network.PlayerInputBatch.Deserialize` | 0.109900 | 0.105900 | 5 | 2,901 |
| 느림 | 2209 | Main Thread (0) | 118.143600 | `Network.PlayerInputBatch.Diagnostics` (Pump 직속) | 22.841400 | 13.852800 | 10 | 161,303 |
| 느림 | 2209 | Main Thread (0) | 118.143600 | `Network.PlayerInputBatch.Publish` | 0.161100 | 0.036100 | 5 | 200 |
| 느림 | 2209 | Main Thread (0) | 118.143600 | `HostAuthority.PlayerInputBatch.Handler` (Publish 하위) | 0.124400 | 0.066800 | 5 | 0 |
| 느림 | 2209 | Main Thread (0) | 118.143600 | `HostAuthority.PlayerInputBatch.SubmitInput` (Handler 하위) | 0.048300 | 0.048300 | 28 | 0 |
| 느림 | 2209 | Main Thread (0) | 118.143600 | `HostAuthority.PlayerInputBatch.Diagnostics` (Handler 하위) | 0.009300 | 0.009300 | 14 | 0 |
| 보통 | 2540 | Main Thread (0) | 139.214584 | `Network.PlayerInputBatch.Pump` | 5.262700 | 0.045700 | 10 | 251,542 |
| 보통 | 2540 | Main Thread (0) | 139.214584 | `Network.PlayerInputBatch.Deserialize` | 0.096600 | 0.082200 | 7 | 4,335 |
| 보통 | 2540 | Main Thread (0) | 139.214584 | `Network.PlayerInputBatch.Diagnostics` (Pump 직속) | 4.852900 | 4.300500 | 14 | 246,927 |
| 보통 | 2540 | Main Thread (0) | 139.214584 | `Network.PlayerInputBatch.Publish` | 0.252400 | 0.028000 | 7 | 280 |
| 보통 | 2540 | Main Thread (0) | 139.214584 | `HostAuthority.PlayerInputBatch.Handler` (Publish 하위) | 0.223700 | 0.192100 | 7 | 0 |
| 보통 | 2540 | Main Thread (0) | 139.214584 | `HostAuthority.PlayerInputBatch.SubmitInput` (Handler 하위) | 0.024800 | 0.024800 | 43 | 0 |
| 보통 | 2540 | Main Thread (0) | 139.214584 | `HostAuthority.PlayerInputBatch.Diagnostics` (Handler 하위) | 0.006800 | 0.006800 | 16 | 0 |

## 판단

- 느린 Pump의 약 98.26%가 Pump 직속 `Network.PlayerInputBatch.Diagnostics`의 포함 시간이다. 보통 행에서도 약 92.21%로 가장 큰 비중이다.
- 느린 행의 Diagnostics Self는 13.8528ms, 보통 행은 4.3005ms다. 따라서 현재 자료에서 가장 먼저 확인할 병목 후보는 `Diagnostics`다.
- `Deserialize`는 두 행에서 각각 0.1099ms와 0.0966ms로 작다. `SubmitInput`도 0.0483ms와 0.0248ms이며, 이번 표만으로 주 병목이라고 볼 근거가 없다.
- Pump Self은 0.1192ms/0.0457ms다. 나머지는 표에 열거하지 않은 하위 샘플과 호출 오버헤드로 남으며, 중첩 마커를 합산해 설명하지 않았다.
- 선택한 두 행만 비교하면 GC Alloc이 느린 행에서 더 크지 않다(164,404B 대 251,542B). 이 결과만으로 GC 할당을 시간 병목으로 판정하지 않는다.

따라서 결과가 나오기 전의 입력 구조 변경은 보류하고, 다음 분석·수정 후보를 `Network.PlayerInputBatch.Diagnostics` 내부로 한정하는 것이 타당하다. `lead`·ACK 상한·backfill·fallback 규칙은 변경하지 않았다.

## 후속 패치와 검증

정상 수신된 2001 `PlayerInputBatchNotification`의 전체 payload 디버그 캡처를 전용 opt-in으로 분리했다. 기본값은 OFF이며, `NetworkDebugStream.Add()`가 payload 포맷팅을 시작하기 전에 반환한다.

- 2001을 `PlayerMovement` 도메인으로 분류한다.
- 정상 `Received` 2001은 전용 opt-in만 따르고, 일반 고빈도 스위치로 다시 차단하지 않는다.
- `DeserializationFailed` 등 정상 수신이 아닌 2001 상태는 전용 opt-in과 일반 고빈도 스위치가 꺼져 있어도 기록한다.
- 전역 `IsCaptureEnabled=false`의 기존 의미는 유지한다.
- 입력 메시지 `Publish`, pre-tick, `SubmitInput`, lead·ACK 상한·backfill·fallback 규칙은 변경하지 않았다.
- reflection 포맷터, 디버그 레코드 자료구조와 스레딩은 변경하지 않았다.

검증 결과는 다음과 같다.

- 분류·포맷터 미호출·전용 opt-in·오류 보존·실제 UDP Publish: 8/8 통과
- 기존 호스트 입력 삽입·시뮬레이션 회귀: 77/77 통과
- 컴파일 오류: 0

## 패치 후 4인 재캡처

같은 Unity `6000.3.22f1` Development Player, 호스트 전용 Profiler, 30,000 프레임 버퍼, 상세 진단 OFF 조건으로 한 번 재캡처했다. 전용 `IsPlayerInputBatchDetailCaptureEnabled`는 기본값 OFF였다. 사용자가 약 2분 뒤 실행을 종료했으므로 이전 약 250초 실행보다 짧으며, 처리량이 완전히 같은 엄밀한 A/B는 아니다.

- 버전: `v0.1.0-035fcee324b8-dirty-asm-bebb313a20df`
- 실행: `20260919-223059-profiler-2001-detail-capture-off-4player`
- 유효 공통 구간: room 23, world 5, authority 5, actors 4의 108개 창, 합계 117.517초
- Profiler raw: 755,379,267바이트, `ProfilerDriver.LoadProfile` 성공
- 캡처 프레임: 308~2307, Pump 행 2,000개, Main Thread

### 텍스트 Pump 계측 비교

| 항목 | 패치 전 | 패치 후 | 관측 차이 |
|---|---:|---:|---:|
| 전체 Pump 호출 | 14,889 | 7,023 | 실행 길이가 달라 직접 비교하지 않음 |
| 입력이 있던 Pump 호출 | 2,828 | 1,583 | 실행 길이가 달라 직접 비교하지 않음 |
| 전체 호출 평균 | 0.765ms | 0.025273ms | 96.7% 감소 |
| 입력이 있던 호출 평균 | 4.019ms | 0.106660ms | 97.3% 감소 |
| 단일 호출 최대 | 23.230ms | 4.233ms | 81.8% 감소 |
| 처리 상한 도달 합계 | 0 | 0 | 동일 |
| 최대 잔여 큐 | 0 | 0 | 동일 |

패치 후 구간은 5,900개 batch, 27,966개 command를 처리했다. 호출 수와 처리량이 다르므로 합계 시간이 아니라 호출 평균과 raw 마커 분해를 함께 본다.

### 패치 후 raw의 느린 행과 보통 행

선택 방법은 패치 전과 같다. 캡처 중간 90%에서 Pump 포함 시간이 가장 큰 행을 느린 행, 중앙값 행을 보통 행으로 골랐다. raw 자체에는 로딩·전환 라벨이 없어 두 행 모두 steady 후보로만 취급한다.

| 구분 | 프레임 | 스레드 | 프레임 Time ms | 마커 | Time ms | Self ms | Calls | GC Alloc (B) |
|---|---:|---|---:|---|---:|---:|---:|---:|
| 느림 | 2200 | Main Thread (0) | 48.523201 | `Network.PlayerInputBatch.Pump` | 4.243000 | 0.029000 | 5 | 2,236 |
| 느림 | 2200 | Main Thread (0) | 48.523201 | `Network.PlayerInputBatch.Deserialize` | 4.128200 | 0.494100 | 4 | 2,076 |
| 느림 | 2200 | Main Thread (0) | 48.523201 | `Network.PlayerInputBatch.Diagnostics` (Pump 직속) | 0.004200 | 0.004200 | 8 | 0 |
| 느림 | 2200 | Main Thread (0) | 48.523201 | `Network.PlayerInputBatch.Publish` | 0.074200 | 0.025300 | 4 | 160 |
| 느림 | 2200 | Main Thread (0) | 48.523201 | `HostAuthority.PlayerInputBatch.Handler` (Publish 하위) | 0.048500 | 0.032200 | 4 | 0 |
| 느림 | 2200 | Main Thread (0) | 48.523201 | `HostAuthority.PlayerInputBatch.SubmitInput` (Handler 하위) | 0.011900 | 0.011900 | 19 | 0 |
| 느림 | 2200 | Main Thread (0) | 48.523201 | `HostAuthority.PlayerInputBatch.Diagnostics` (Handler 하위) | 0.004400 | 0.004400 | 9 | 0 |
| 보통 | 1002 | Main Thread (0) | 16.646400 | `Network.PlayerInputBatch.Pump` | 0.070900 | 0.013900 | 3 | 866 |
| 보통 | 1002 | Main Thread (0) | 16.646400 | `Network.PlayerInputBatch.Deserialize` | 0.021500 | 0.020000 | 2 | 786 |
| 보통 | 1002 | Main Thread (0) | 16.646400 | `Network.PlayerInputBatch.Diagnostics` (Pump 직속) | 0.001900 | 0.001900 | 4 | 0 |
| 보통 | 1002 | Main Thread (0) | 16.646400 | `Network.PlayerInputBatch.Publish` | 0.029500 | 0.012100 | 2 | 80 |
| 보통 | 1002 | Main Thread (0) | 16.646400 | `HostAuthority.PlayerInputBatch.Handler` (Publish 하위) | 0.017400 | 0.011100 | 2 | 0 |
| 보통 | 1002 | Main Thread (0) | 16.646400 | `HostAuthority.PlayerInputBatch.SubmitInput` (Handler 하위) | 0.004200 | 0.004200 | 6 | 0 |
| 보통 | 1002 | Main Thread (0) | 16.646400 | `HostAuthority.PlayerInputBatch.Diagnostics` (Handler 하위) | 0.002100 | 0.002100 | 6 | 0 |

직접 Diagnostics는 느린 행에서 22.8414ms·161,303B에서 0.0042ms·0B로, 보통 행에서 4.8529ms·246,927B에서 0.0019ms·0B로 줄었다. 선택 행의 작업량과 Calls가 다르지만, 상세 포맷팅을 시작하기 전에 반환한다는 패치 목표와 일치한다. Pump 전체 GC Alloc도 선택된 느린 행에서 164,404B에서 2,236B, 보통 행에서 251,542B에서 866B로 감소했다.

패치 후 느린 행에서는 Pump 4.2430ms 중 Deserialize 포함 시간이 4.1282ms로 집중됐다. 다만 Deserialize Self는 0.4941ms이고 나머지는 이 표에 열거하지 않은 하위 샘플이므로, 역직렬화 내부의 어느 작업인지는 이 결과만으로 더 좁히지 않는다. 보통 행의 Pump는 0.0709ms다. `Publish` 아래의 `Handler`·`SubmitInput`은 중첩 시간이므로 다시 합산하지 않았다.

### 입력 정확성과 체감 성능 분리

- 호스트 입력 준비: 7,023/7,023, 100%
- 호스트 local first-submit stale, held mismatch, avoidable Neutral: 모두 0
- Pump 처리 상한 도달과 잔여 큐: 모두 0
- 유효 구간 Jump 상세 삽입: 60/60 Accepted

반면 게스트별 실제 입력 Update 처리율은 약 53.97/s, 24.27/s, 7.76/s였고 생성 command는 약 36.32/s, 30.94/s, 26.03/s였다. 게스트 fallback은 Entity 2~4에서 각각 45.76%, 53.41%, 62.27%였다. 사용자가 관측한 “호스트를 제외한 게스트가 매우 느림”과 일치한다.

이전 Profiler 실행에서는 가장 느린 게스트가 8.86 Update/s였지만 이번에는 다른 게스트가 7.76 Update/s였다. 한 PC에서 네 Development Player와 호스트 Profiler를 함께 실행할 때 게스트별 스케줄링·공유 자원 부하가 크게 달라지는 현상이 반복됐으며, 정상 2001 상세 캡처 제거만으로 게스트 렌더·Update 처리율이 회복되지는 않았다.

실행 중 한 창에서 빨간 오류 후 종료가 관측됐다는 사용자 보고가 있다. 로그에는 Guest2의 Vivox HTTP Timeout 예외가 기록됐지만 2001 역직렬화·입력 Publish 오류나 Windows Application 로그의 SSketch/UnityPlayer 충돌 이벤트는 확인되지 않았다. 따라서 빨간 오류를 Vivox로 단정하거나 프로세스 비정상 종료 원인을 확정하지 않는다. 종료 직전까지 4인 유효 구간은 보존됐지만, 이 실행을 일반 빌드 안정성 자료로 사용하지 않는다.

결론은 두 갈래다. 정상 2001 상세 캡처 제거는 호스트 Diagnostics 시간과 할당량을 제거하고 Pump 비용을 크게 낮춘 것으로 확인됐으므로 패치를 유지한다. 게스트 체감 저하와 큰 fallback은 이번 Development/Profiler 동시 실행에서도 별도로 재현됐으며, 이번 패치의 실패로 해석하거나 입력 규칙을 되돌릴 근거는 아니다.
