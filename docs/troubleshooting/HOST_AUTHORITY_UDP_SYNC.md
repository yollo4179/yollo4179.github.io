# 호스트 권위 UDP 동기화 중단 진단

- 작성일: 2026-09-08
- 대상: Windows Unity 클라이언트, C++ IOCP 서버, 호스트 권위 패킷 `2000~2003`, `2505~2508`

## 증상

다음 증상이 동시에 발생하면 로컬 이동 자체보다 UDP 송수신 경로를 먼저 확인한다.

- 게스트 화면에서 호스트가 공중에 뜬 위치에 멈춘다.
- 호스트 화면에서 게스트가 움직이지 않는다.
- TCP 재접속이나 서버 재시작 뒤에도 기존 클라이언트의 원격 캐릭터만 계속 멈춰 있다.
- 점프나 이동을 오래 반복한 뒤 양쪽 원격 상태가 더 이상 갱신되지 않는다.

## 확인된 원인

Windows의 연결형 UDP 소켓은 대상 포트가 닫혀 있을 때 ICMP Port Unreachable을 받으면
다음 `ReceiveAsync`에 `WSAECONNRESET(10054)`을 전달할 수 있다. 기존 Unity 클라이언트는 이를
영구 수신 실패로 처리해 receive loop를 종료했다. TCP가 다시 연결되거나 서버가 같은 포트로
재시작해도 이미 끝난 UDP receive loop는 살아나지 않았으므로, 자신의 캐릭터는 로컬에서
움직여도 상대 캐릭터의 `2003`이 멈췄다.

클라이언트는 이제 Windows `SIO_UDP_CONNRESET`을 끄고, 런타임이 계속 10054 또는
`ConnectionRefused`를 전달하더라도 해당 datagram만 유실된 것으로 처리한다. 서버가 같은
주소와 포트로 돌아오면 기존 UDP 소켓에서 다음 입력·스냅샷 송수신을 자동 재개한다.

> 이 수정 전 빌드에서 receive loop가 이미 종료됐다면 서버만 재시작해도 복구되지 않는다.
> 수정된 클라이언트로 다시 실행해야 하며, 이후의 짧은 서버 재시작부터 자동 복구된다.

## 서버 로그 위치

서버 프로세스의 작업 디렉터리를 기준으로 다음 파일을 확인한다.

- `Utils/logs/host-authority.log`: 호스트 권위 UDP 전용 진단 로그
- `Utils/logs/server.log`: 위 로그가 함께 복제되는 중앙 로그
- 서버 콘솔: 동일 이벤트를 실시간 출력

PowerShell에서 전용 로그를 실시간 확인하는 예시는 다음과 같다.

```powershell
Get-Content -LiteralPath '.\Utils\logs\host-authority.log' -Wait -Tail 100
```

저장소 루트에서 `Server/Binary/Release/Server.exe`를 실행했다면 실제 로그가 생성된 작업
디렉터리를 먼저 확인한다. 현재 서버는 상대 경로 `Utils/logs`를 사용한다.

## 주요 이벤트 해석

| 이벤트 | 의미 | 우선 확인 대상 |
|---|---|---|
| `host_input_stream_silent` | 유효한 게스트 `2000` 입력이 3초 이상 없음 | 게스트 UDP send, 서버 주소·포트, 클라이언트 receive/send loop |
| `host_snapshot_stream_silent` | 유효한 호스트 `2002` snapshot이 3초 이상 없음 | 호스트 `HostWorldRunner`, 호스트 UDP send, 권위 epoch |
| 두 `*_stream_silent` 동시 발생 | 입력과 snapshot이 모두 서버에 도착하지 않음 | 서버 UDP 소켓/IOCP 또는 양쪽 클라이언트의 UDP 수명 |
| `host_snapshot_stalled` | 인게임에서 10초간 유효한 snapshot이 없어 권위 세션 종료 | 직전 snapshot 거부 로그, 호스트 프로세스·Runner |
| `*_binding_rejected` | UDP endpoint와 TCP Session/Player 연결이 맞지 않음 | TCP 재접속 뒤 UDP 바인딩, Player/Entity ID |
| `*_context_rejected` | Room/World/Authority epoch가 현재 방과 다름 | `2502`, `2600` 수신 순서와 이전 epoch 패킷 |
| `*_sequence_rejected` | 중복 또는 오래된 UDP sequence | 클라이언트 sequence 초기화, endpoint 재사용 |
| `*_malformed` | 크기·개수·수치 검증에 실패한 datagram | 클라이언트와 서버 패킷 구조체 버전 |
| `*_relay_failed` | 목적 endpoint가 없거나 서버 UDP 송신 등록 실패 | 대상의 UDP 바인딩과 직전 socket 오류 |
| `udp_receive_*_failed` | 서버 IOCP 수신 완료/등록 실패 | `error_code`, UDP 소켓과 서버 상태 |
| `udp_send_*_failed` | 서버 IOCP 송신 완료/등록 실패 | `error_code`, 목적 endpoint와 네트워크 상태 |

거부·소켓 오류 이벤트는 종류별 최대 1초에 한 번 기록하며 `count`는 누적 발생 횟수다.
입력·snapshot 정지 감지는 첫 유효 패킷 이후 3초부터 시작하고, 계속 조용하면 5초마다
`silence_ms`와 `accepted_count`를 갱신한다.

캐릭터 레코드 수치 검증에서 실패한 `host_snapshot_malformed`는 `host_tick`, 실제 실패한
`entity_id`, `invalid_field`도 함께 남긴다. 예를 들어 `invalid_field=motor_velocity_y`이면
패킷 크기 문제가 아니라 호스트 모터의 수직 속도가 유효 범위를 벗어난 것이다.

## 실제 사례: 3000틱 뒤 전체 동기화 중단

다음 로그 순서는 UDP 유실이 아니라 호스트 snapshot 값의 발산을 뜻한다.

1. `accepted_count=1500`, `last_host_tick=3000`까지 30Hz snapshot이 정상 수락된다.
2. 이후 `host_snapshot_malformed`가 초당 약 30개씩 증가한다.
3. 마지막 정상 snapshot으로부터 3초 뒤 `host_snapshot_stream_silent`가 발생한다.
4. 10초 뒤 `host_snapshot_stalled`로 권위 세션이 종료된다.
5. 종료된 context를 쓰는 구형 클라이언트가 `2505`를 계속 보내
   `host_clock_context_rejected`가 누적된다.

원인은 `CharacterController`의 수평 `Move`가 직전 Below 충돌 플래그를 지울 수 있는데,
수직 모터가 수평 이동 뒤의 `isGrounded`만 확인한 것이다. 바닥 위에서도 중력 `-20`이
60Hz로 누적되어 약 50초, 즉 3000틱 뒤 `MotorVelocityY`가 서버 허용치 `-1000`을 넘었다.
서버는 안전을 위해 레코드가 하나라도 잘못된 snapshot 전체를 거부했고 양쪽 원격 캐릭터가
마지막 정상 상태에 멈췄다.

권위 모터와 예측 모터는 이제 수평 이동 전 접지 상태를 보존해 음수 수직 속도를 매 tick
접지 유지값으로 되돌린다. 실제 공중 낙하는 50m/s 종단속도로 제한한다. 9106으로 권위
세션이 종료된 뒤에는 클라이언트가 시계 probe를 보내지 않는다.

## 해당 증상에서의 판별 순서

1. 새 서버 바이너리로 재시작하고 `host-authority.log`를 연다.
2. 호스트와 게스트가 같은 방에 들어간 뒤 양쪽에서 10초 이상 이동·점프한다.
3. 게스트 화면의 호스트만 멈추면 `host_snapshot_stream_silent`와 snapshot 거부 이벤트를 본다.
4. 호스트 화면의 게스트만 멈추면 `host_input_stream_silent`와 input 거부 이벤트를 본다.
5. 양쪽 원격 캐릭터가 함께 멈추면 두 silence 이벤트와 `udp_receive_*_failed`를 같은 시각대로 본다.
6. 서버를 3초간 내렸다 같은 UDP 포트로 다시 올린 뒤, 클라이언트를 재시작하지 않고 이동한다.
7. 수정된 클라이언트에서는 다음 `2000/2002`부터 원격 이동이 다시 시작되어야 한다.

로그에 silence가 없는데 화면만 멈추면 서버까지의 UDP는 살아 있는 상태다. 이때는 클라이언트의
`LastSnapshotReceivedAt`, snapshot decode/registry, 원격 캐릭터 spawner와 Animator 경로를
확인한다.

## 완료 기준

- 서버 중단 중 10054가 발생해도 클라이언트 UDP 상태가 `Connected`로 유지된다.
- 같은 포트로 서버가 돌아오면 기존 UDP 소켓에서 송수신이 재개된다.
- 정상 이동 중에는 입력·snapshot silence 이벤트가 발생하지 않는다.
- 동기화가 다시 멈추면 서버 로그만으로 입력, snapshot, 바인딩, context, sequence,
  socket/relay 중 어느 단계에서 끊겼는지 구분할 수 있다.

## 2026-09-09 사례: 참가자 입장 직후 컨텍스트 전환

### 관찰된 로그

- 두 번째 플레이어 입장 직후 `host_snapshot_state_rejected`가 발생했다.
- 같은 UDP endpoint에서 `host_input_context_rejected`가 발생했다.
- 이후 호스트의 `object_spawn_accepted`는 정상적으로 기록됐다.

### 발생 흐름

```text
기존 WorldContext로 2000 입력·2002 스냅샷 송신 중
                    ↓
두 번째 플레이어 입장으로 권위 actor 집합 변경
                    ↓
서버가 ConfigureWaitingRoomAuthority(..., true) 실행
                    ↓
서버는 기존 UDP 세대를 즉시 폐기하고 새 epoch 활성화
                    ↓
새 2502 AuthorityContext와 2600 SimulationStarted를 TCP로 송신
                    ↓
Unity가 TCP 메시지를 Pump하기 전까지 구 epoch의 2000/2002가 일부 도착
                    ↓
서버 epoch fence가 해당 UDP 패킷을 context rejected로 폐기
                    ↓
Unity가 새 2502 → 2600을 적용하고 새 컨텍스트로 송신 재개
```

UDP 거절 때문에 TCP 컨텍스트 패킷이 도착하지 않는 것은 아니다. 2000/2002는 UDP이고
2502/2600은 TCP이므로 서로 독립적이다. 거절 로그는 새 컨텍스트가 서버에서 먼저 활성화됐고
클라이언트 적용이 아직 끝나지 않았다는 전환 결과다.

Unity Editor의 프레임 저하나 메인 스레드 정체는 네트워크 Pump를 늦춰 이 전환 구간을 길게
만들 수 있다. 그러나 PC 성능만의 문제로 보아서는 안 된다. 서버의 즉시 epoch 전환과
클라이언트의 송신 중단 사이에 명시적인 handoff barrier가 없는 구조도 원인이다.

### 정상과 오류의 경계

- 정상: 참가 직후 소수의 `*_context_rejected`가 기록된 뒤 누적이 멈추고 이동이 재개된다.
- 오류: 새 2502/2600 처리 뒤에도 거절 횟수가 계속 증가하거나 캐릭터가 계속 멈춰 있다.
- 로컬 캐릭터도 계속 멈춘다면 UDP 거절만으로 설명할 수 없다. `IsSimulating`, 로컬 입력 잠금,
  Host Runner 재시작 여부를 별도로 확인해야 한다.
- 호스트 화면에서 게스트만 멈춘다면 2000 입력 경로를, 게스트 화면에서 호스트만 멈춘다면
  2002/2003 스냅샷 경로를 우선 확인한다.

### 기대 동작

클라이언트가 새 2502와 2600을 적용한 뒤에는 반드시 다시 움직여야 한다. 전환 중 패킷은
의도적으로 버릴 수 있지만, 지속적인 이동 중단은 정상 동작이 아니다. 근본 보완 시에는
참가자 변경을 인지한 클라이언트가 구 epoch 송신을 멈추고 새 2502 → 2600 적용 후 송신을
재개하도록 컨텍스트 handoff를 명시적으로 관리한다.

## 2026-09-10 보완: 첫 확정 전 게스트 예측 폭주와 페이즈 정지

게스트의 입력 tick 상한은 원래 첫 `2003` 확정을 받은 뒤에만 적용됐다. 따라서 호스트
스냅샷이 계속 거절되면 게스트는 로컬 시계만 따라 예측을 계속 진행해, 비호스트 캐릭터가
과도하게 빨리 움직이는 것처럼 보일 수 있었다. 이제 첫 확정 전에는 `StartHostTick`을 임시
기준선으로 사용하며, 이후와 동일하게 기준선보다 최대 12 tick까지만 예측한다. 정상적인
스냅샷이 오면 기존 `LastResolvedInputTick` 기준으로 자동 전환된다.

Drawing에서 Chaos로 넘어가지 않던 문제는 UDP 이동과 별개였다. 네트워크 페이즈 컨트롤러는
타이머가 0이어도 로컬에서 페이즈를 바꾸지 않는데, 실제 서버에 호스트 페이즈 확정 경로가
없었다. 다음 경로를 추가했다.

```text
권위 호스트: C2HWorldTransactionRequest(2709, Phase change)
    → Room: WorldContext + host player + eventSequence 검증
    → 서버: H2CWorldTransactionNotification(2710)을 호스트 포함 방 전체에 방송
    → 모든 클라이언트: 동일한 PhaseEndTick과 roundIndex 적용
```

정상 실행 시 서버 로그에는 첫 낮과 이후 경계마다 `world_phase_accepted`가 기록된다.
Drawing의 `phase=1` 다음에는 설정된 낮 시간이 지난 뒤 Chaos의 `phase=2`가 와야 한다.

## 2026-09-19 보완: 긴 입력 tick 공백의 제한 backfill

Unity 클라이언트의 `PlayerInputStream`은 렌더 프레임 사이에 목표 입력 tick이 여러 칸
전진하면 직전 held 입력으로 중간 tick을 보충한다. Jump와 Fire는 edge이므로 보충 tick에
복제하지 않고 현재 목표 tick에만 한 번 기록한다.

기존 구현은 중간 tick이 3개 이하일 때만 전부 보충했다. 중간 tick이 4개 이상이면 상한
3개를 보충하는 대신 중간 tick 전체를 생략하고 현재 목표 tick만 기록했다. 저FPS나 순간
프레임 정체가 클수록 이동 입력 시간이 더 많이 사라질 수 있는 구조였다.

수정된 정책은 공백 크기와 관계없이 앞쪽 중간 tick을 최대 3개까지 보충한다.

```text
직전 기록 tick 1000, 목표 tick 1004
    → 1001~1003: 직전 held 입력
    → 1004: 현재 입력과 Jump/Fire edge

직전 기록 tick 1000, 목표 tick 1005
    → 1001~1003: 직전 held 입력
    → 1004: 생성하지 않음
    → 1005: 현재 입력과 Jump/Fire edge
```

상한을 유지하는 이유는 씬 로딩이나 긴 OS 정지 뒤의 과거 입력을 한 프레임에 무제한
재실행하지 않기 위해서다. 보충되지 않은 tick은 Unity 호스트의 `HostInputBuffer`가 기존
정책대로 최근 held 입력 또는 neutral fallback으로 확정한다. 따라서 이 변경은 긴 공백을
완전히 연속화하는 것이 아니라, 최소 3tick의 이동 의도를 보존하는 제한적 개선이다.

회귀 테스트는 다음 계약을 확인한다.

- 중간 tick이 3개이면 세 개 모두 직전 held 입력으로 생성한다.
- 중간 tick이 4개 이상이어도 앞쪽 세 개를 생성하고 현재 목표 tick을 추가한다.
- 보충 tick에는 Jump/Fire edge와 shot identifier를 복제하지 않는다.
- Jump/Fire edge는 긴 공백 뒤에도 현재 목표 tick에 정확히 한 번 기록한다.
- 호스트가 fallback으로 이미 확정한 tick은 뒤늦게 backfill하거나 게스트에서 다시 예측하지 않는다.

2026-09-19 Unity 6000.3.22f1 EditMode에서 `HostAuthorityServiceTests` **55/55 통과**로
위 계약과 기존 입력 history·snapshot 동작을 함께 확인했다.

이 개선만으로 간헐적 점프 실패 원인이 해결됐다고 판단하지 않는다. 점프 실패는 같은
WorldContext·EntityId·InputTick을 기준으로 게스트 명령 생성과 송신, 호스트 입력 삽입 결과,
호스트의 실제 점프 허용 여부, 확정 snapshot과 게스트 Y축 재조정을 연결해 별도로 확인한다.
`LastResolvedInputTick`은 fallback으로 확정한 tick도 전진하므로 점프 실행 성공의 증거가 아니다.
