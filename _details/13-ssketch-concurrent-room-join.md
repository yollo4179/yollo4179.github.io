---
layout: ssketch-detail
asset_version: "20260903-4"
title: 유저 동시 Join 테스트
order: 101
number: "01"
project_slug: ssketch
domain: C++ IOCP 룸 서버
detail_category: 서버 테스트
category_slug: server-test
category_url: /projects/ssketch/server-test/
permalink: /projects/ssketch/server-test/01-concurrent-room-join/
summary: 정원 6명인 방에 Join 요청을 집중시켜 성공·정원 초과 응답과 최종 인원이 일치하는지 검증했습니다.
verified_at: 2026-09-03
validation_scope: 로컬 Windows · DummyClient2 · 단일 IOCP Dispatch 서버
result_label: 600건 중 5건 입장·595건 거절·최종 6명
status_tone: warning
tags:
  - C++
  - IOCP
  - TCP
  - 동시성
  - Mutex
  - IoT
  - 게임
nav_context: SSKETCH / 핵심 코드 / 서버 테스트
footer_label: SSKETCH / DETAIL ARCHIVE
---

<nav class="project-toc" aria-label="유저 동시 Join 테스트 목차">
  <p>핵심 코드 · 서버 테스트</p>
  <ol>
    <li><a href="#problem">검증하려던 문제</a></li>
    <li><a href="#critical-section">정원을 지키는 임계 구역</a></li>
    <li><a href="#test-design">테스트 구조</a></li>
    <li><a href="#result">측정 결과</a></li>
    <li><a href="#boundary">결과의 해석 범위</a></li>
  </ol>
</nav>

<h2 id="problem">검증하려던 문제</h2>

SSKETCH 대기방의 정원은 6명이다. 한 명씩 입장할 때는 현재 인원만 확인하면
그만이지만, Join 요청이 짧은 시간에 몰리면 정원 확인과 참가자 추가 사이에
경쟁 상태가 생길 수 있다.

예를 들어 인원이 5명일 때 두 요청이 동시에 정원을 확인하면, 둘 다 자신을
여섯 번째 참가자로 판단해버릴 수 있다. 그래서 이번 테스트의 성공 조건은
응답을 많이 받는 것이 아니라, 아래 불변식을 끝까지 지키는지였다.

```text
입장 성공 + 정원 초과 = 처리된 Join 요청
최종 인원 <= 방 정원
```

요청 처리 흐름은 패킷 핸들러가 방을 조회한 뒤, 해당 방의 `Enter()`에 상태
변경을 위임하는 구조다.

```text
C2SRoomJoinRequest
        ↓
RoomHandler::HandleRoomJoinRequest
        ↓
RoomManager::FindRoom
        ↓
Room::Enter
        ↓
Success 또는 RoomFull
```

<h2 id="critical-section">정원을 지키는 임계 구역</h2>

정원 제한을 담당하는 핵심은 `Room::Enter()`입니다. 정원 확인과 참가자 추가를
같은 방의 Mutex 임계 구역 안에서 처리합니다.

```cpp
Room::JoinResult Room::Enter(
    PlayerId playerId,
    const std::wstring& password)
{
    LockGuard lock(m_lock);

    const JoinResult validationResult =
        CanEnterLocked(playerId, password);

    if (validationResult != JoinResult::Success)
        return validationResult;

    m_playerIds.push_back(playerId);
    m_readyStates.emplace(playerId, false);
    return JoinResult::Success;
}
```

`CanEnterLocked()`는 현재 인원이 최대 인원 이상이면 `RoomFull`을 반환합니다.

```cpp
if (m_playerIds.size() >= m_maxPlayerCount)
    return JoinResult::RoomFull;
```

이 잠금은 방 룩업 테이블을 보호하는 `RoomManager::m_lock`과 역할이 다릅니다.
Manager의 잠금은 방 생성·조회·삭제용 `unordered_map`을 보호하고, Room의 잠금은
각 방의 참가자와 준비 상태를 보호합니다.

<h2 id="test-design">테스트 구조</h2>

서버 기능을 수동으로 확인하지 않도록 `DummyClient2` 아래에 공통 `Test` 인터페이스와
기능별 테스트 클래스를 분리했습니다.

```text
DummyClient2/Test/
├─ Test.h
├─ Common/
│  └─ RoomTestSupport.cpp
├─ ChattingTest/
├─ ManyClientsJoinOneRoomTest/
└─ ManyClientsLeaveJoinOneRoomTest/
```

각 테스트는 `Execute()`를 구현하며, 메인에서는 숫자로 실행 모드를 선택합니다.

```cpp
class Test
{
public:
    virtual ~Test() = default;
    virtual int Execute() = 0;
};
```

다중 Join 테스트는 방장이 먼저 입장한 정원 6명의 방을 준비한 뒤, 나머지
클라이언트의 Join 요청을 먼저 전송하고 응답을 모아 결과 코드별로 집계합니다.
연결·로그인·전송·수신 실패를 별도 지표로 분리해 네트워크 준비 실패가 `RoomFull`로
섞이지 않게 했습니다.

<h2 id="result">측정 결과</h2>

방장 1명이 들어간 방에 64건의 Join 요청을 집중시킨 결과, 남은 자리와 같은 5건만
성공하고 59건은 정원 초과로 거절됐습니다.

```text
[방 동시 입장 테스트]

방 정원          : 6
초기 인원        : 1
입장 요청        : 64

입장 성공        : 5
정원 초과        : 59
최종 인원        : 6

테스트 결과      : 통과
입장 처리 시간   : 12.31 ms
```

| 측정 항목 | 결과 |
|---|---:|
| 방 정원 | 6명 |
| 초기 인원 | 1명 |
| Join 요청 | 64건 |
| 입장 성공 | 5건 |
| 정원 초과 | 59건 |
| 최종 인원 | 6명 |
| 입장 처리 시간 | 12.31 ms |

`성공 5건 + 정원 초과 59건 = 전체 요청 64건`이었고, 최종 인원도 정원과 같은
6명을 유지했습니다.

같은 조건에서 요청 수를 600건으로 늘려 다시 실행했습니다. 600개 클라이언트가
모두 연결과 로그인 준비를 마쳤고, 전송·수신 실패도 발생하지 않았습니다.

| 측정 항목 | 결과 |
|---|---:|
| 방 정원 | 6명 |
| 초기 인원 | 1명 |
| Join 요청 | 600건 |
| 준비된 클라이언트 | 600개 |
| 연결·로그인·전송·수신 실패 | 0건 |
| 입장 성공 | 5건 |
| 정원 초과 | 595건 |
| 최종 인원 | 6명 |
| 클라이언트 준비 | 2,123.89 ms |
| 입장 처리 | 338.38 ms |

<figure class="verification-shot">
  <a href="{{ '/assets/images/projects/ssketch/server-test/concurrent-room-join-600.png' | relative_url }}" aria-label="빨간 테두리로 표시한 600개 클라이언트 방 동시 입장 테스트 결과와 서버 로그 크게 보기">
    <img src="{{ '/assets/images/projects/ssketch/server-test/concurrent-room-join-600.png' | relative_url }}" alt="왼쪽 콘솔에 정원 6명, 초기 인원 1명, 입장 요청 600건, 성공 5건, 정원 초과 595건과 최종 인원 6명이 표시되고 오른쪽 서버 콘솔의 같은 밀리초에 기록된 여섯 번째 인원 입장 성공과 이후 정원 초과 거절 로그가 빨간 테두리로 표시된 화면" width="2879" height="1799" loading="lazy">
  </a>
  <figcaption>빨간 테두리로 표시한 서버 로그의 00:34:26.614에 player_count=6 입장 성공과 result_code=11 입장 거절이 연이어 기록돼, 마지막 자리는 허용하고 그 직후 요청부터 정원 초과로 차단한 경계를 확인할 수 있다.</figcaption>
</figure>

이 실행에서는 `초기 1명 + 입장 성공 5명 = 최종 6명`이며,
`입장 성공 5건 + 정원 초과 595건 = 전체 요청 600건`입니다. 따라서 관측된 실행
결과에서는 일곱 번째 참가자가 추가되지 않았고, 서버가 반환한 결과 수와 최종 방
인원도 일치했습니다. 정원 제한의 설계상 근거는 이 실행 결과와 함께 앞서 설명한
`Room::Enter()`의 동일 Mutex 임계 구역입니다.

요청 수를 10,000건으로 높인 실행에서는 다른 한계가 먼저 드러났습니다.

| 측정 항목 | 결과 |
|---|---:|
| Join 요청 | 10,000건 |
| 준비된 클라이언트 | 7,618개 |
| TCP 연결 실패 | 2,382건 |
| 입장 성공 | 5건 |
| 정원 초과 | 7,613건 |
| 최종 인원 | 6명 |
| 클라이언트 준비 | 12,796.83 ms |
| 입장 처리 | 1,651.99 ms |

준비된 요청만 보면 `5 + 7,613 = 7,618`로 응답과 최종 인원은 일치했습니다.
그러나 목표한 10,000개 중 2,382개가 TCP 연결 단계에서 준비되지 않았으므로 전체
테스트 결과는 실패입니다. 이 수치를 “10,000명 동시 접속 성공”으로 사용하지 않고,
연결 계층의 한계를 별도 개선 과제로 남겼습니다.

<h2 id="boundary">결과의 해석 범위</h2>

이번 결과는 다량의 네트워크 Join 요청이 몰렸을 때 성공·정원 초과 응답과 최종
인원이 일치한다는 것을 보여줍니다. 다만 클라이언트가 여러 스레드에서 요청했다고
해서 서버의 `Room::Enter()`도 여러 스레드에서 동시에 실행됐다고 단정할 수는
없습니다.

현재 서버는 메인 루프 하나에서 `IocpCore::Dispatch()`를 호출합니다.

```cpp
while (iocpCore.Dispatch(INFINITE))
{
}
```

따라서 현재 E2E 테스트는 패킷 핸들러가 단일 Dispatch 스레드에서 처리된 조건의
결과입니다. Room Mutex의 실제 다중 서버 스레드 경합까지 입증하려면 여러 스레드가
동일한 `Room::Enter()`를 장벽에서 동시에 호출하는 도메인 테스트, 또는 여러 IOCP
Dispatch 워커가 핸들러를 병렬 실행하는 서버 구성이 추가로 필요합니다.

이번 테스트에서 얻은 핵심은 큰 요청 수 자체보다 측정 결과의 경계를 구분한
것입니다. 64건 요청에서는 정원 불변식을 재현 가능한 수치로 확인했고, 10,000건
시도에서는 TCP 연결 실패와 룸 로직 결과를 분리해 다음 병목 지점을 확인했습니다.
