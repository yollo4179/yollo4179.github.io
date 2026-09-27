---
layout: ssketch-detail
asset_version: "20260903-5"
title: 방 입장·삭제 경합 테스트
order: 102
number: "02"
project_slug: ssketch
domain: C++ IOCP 룸 서버
detail_category: 서버 테스트
category_slug: server-test
category_url: /projects/ssketch/server-test/
permalink: /projects/ssketch/server-test/02-room-leave-join-race/
summary: 마지막 참가자의 퇴장과 신규 Join 요청을 같은 시점에 전송해, 처리 순서가 바뀌어도 방 삭제와 참가 상태가 일관적인지 1,000회 검증했습니다.
verified_at: 2026-09-03
validation_scope: 로컬 Windows · DummyClient2 · 단일 IOCP Dispatch 서버
result_label: 1,000회 정상 결과 100%·정리 실패 0건·방 누수 0건
status_tone: warning
tags:
  - C++
  - IOCP
  - TCP
  - 경쟁 상태
  - Mutex
  - IoT
  - 게임
nav_context: SSKETCH / 핵심 코드 / 서버 테스트
footer_label: SSKETCH / DETAIL ARCHIVE
---

<nav class="project-toc" aria-label="방 입장 삭제 경합 테스트 목차">
  <p>핵심 코드 · 서버 테스트</p>
  <ol>
    <li><a href="#problem">검증하려던 문제</a></li>
    <li><a href="#outcomes">두 가지 정상 결과</a></li>
    <li><a href="#consistency">방 종료와 Join의 일관성</a></li>
    <li><a href="#test-design">테스트 구조</a></li>
    <li><a href="#result">측정 결과와 로그</a></li>
    <li><a href="#boundary">결과의 해석 범위</a></li>
  </ol>
</nav>

<h2 id="problem">검증하려던 문제</h2>

한 명만 남은 방에서 마지막 참가자가 퇴장하면 서버는 빈 방을 룩업 테이블에서
삭제한다. 그런데 같은 순간 다른 사용자의 Join 요청이 도착하면, 두 요청의 처리
순서에 따라 결과가 달라질 수 있다.

위험한 건 승자가 어느 쪽인지가 아니라 처리 후 상태가 서로 어긋나는 것이다.
예를 들어 삭제된 방에 Join 성공을 반환하거나, Join에 성공한 참가자가 있는데
방을 룩업 테이블에서 지우거나, 두 요청이 끝난 뒤 빈 방이 남는 상황은 허용할
수 없다.

<h2 id="outcomes">두 가지 정상 결과</h2>

이 경합에는 두 가지 정상적인 처리 순서가 있다.

| 먼저 처리된 요청 | Join 응답 | 처리 후 상태 |
|---|---|---|
| 신규 참가자의 Join | `Success` | 참가자를 방에 남긴 뒤, 테스트 정리 퇴장으로 빈 방을 삭제 |
| 마지막 참가자의 Leave·방 삭제 | `RoomNotFound` 또는 `InvalidState` | Join을 거절하고 삭제된 방을 남기지 않음 |

따라서 `입장 선점`과 `삭제 선점`의 비율은 50:50일 필요가 없다. 테스트의 통과
조건은 매 반복이 위 두 경로 중 하나로 끝나고, 예상하지 않은 응답·정리 실패·방
누수가 한 건도 없는 것이다.

<h2 id="consistency">방 종료와 Join의 일관성</h2>

`Room::TryCloseIfEmpty()`는 Room Mutex를 획득한 상태에서 참가자가 비었는지
확인하고 종료 상태를 설정한다. Join도 같은 Room Mutex 안에서 종료 상태를
확인한 뒤 참가자 목록을 변경한다.

```cpp
/* Room.cpp */
Room::JoinResult Room::Enter(PlayerId playerId, const std::wstring& password)
{
    LockGuard lock(m_lock);

    const JoinResult validationResult = CanEnterLocked(playerId, password);
    if (validationResult != JoinResult::Success)
        return validationResult;

    m_playerIds.push_back(playerId);
    m_readyStates.emplace(playerId, false);
    return JoinResult::Success;
}

Room::JoinResult Room::CanEnterLocked(...) const
{
    if (m_isClosing)
        return JoinResult::RoomClosing;
    // 참가자·정원·비밀번호 검사
}

bool Room::TryCloseIfEmpty()
{
    LockGuard lock(m_lock);
    if (m_playerIds.empty() == false)
        return false;

    m_isClosing = true;
    return true;
}
```

Join이 먼저 Mutex를 획득하면 참가자가 추가되므로 `TryCloseIfEmpty()`가 삭제를
중단한다. 방 종료가 먼저 Mutex를 획득하면 `m_isClosing`이 설정돼, 이미 찾은
방에 대한 Join도 `RoomClosing`으로 거절된다. 핸들러는 이를 `InvalidState`
응답으로 바꾼다.

RoomManager는 빈 방을 확인한 뒤 Manager Mutex에서 룩업 테이블을 다시 조회하고,
처음 확인한 것과 같은 `shared_ptr`일 때만 삭제한다.

```cpp
/* RoomManager.cpp */
bool RoomManager::RemoveRoomIfEmpty(RoomId roomId)
{
    std::shared_ptr<Room> room = FindRoom(roomId);
    if (room == nullptr || room->TryCloseIfEmpty() == false)
        return false;

    {
        LockGuard lock(m_lock);
        const auto nowRoom = m_rooms.find(roomId);
        if (nowRoom == m_rooms.end() || nowRoom->second != room)
            return false;

        m_rooms.erase(nowRoom);
    }
    return true;
}
```

이 재검사는 같은 Room ID가 다시 사용되거나 룩업 상태가 바뀌었을 때, 과거에
찾은 객체를 근거로 현재 방을 잘못 삭제하지 않도록 막는 역할을 한다.

<h2 id="test-design">테스트 구조</h2>

DummyClient2의 `ManyClientsLeaveJoinOneRoomTest`는 호스트와 신규 참가자 두
클라이언트를 서버에 연결하고, 다음 과정을 1,000회 반복한다.

1. 호스트가 참가한 새 방을 생성한다.
2. Leave 워커와 Join 워커, 제어 스레드가 같은 `std::barrier`에 도착할 때까지
   기다린다.
3. 장벽이 풀리면 호스트는 Leave를, 신규 참가자는 같은 Room ID로 Join을
   전송한다.
4. 두 응답이 모두 도착하면 결과를 정상 경로와 예상 외 결과로 분류한다.
5. Join이 성공했다면 신규 참가자를 퇴장시켜 정리하고, 방 조회 결과가 `없음`인지
   확인한다.

```cpp
std::barrier raceStart(3);
std::barrier raceDone(3);

std::thread leaveWorker([&]()
{
    raceStart.arrive_and_wait();
    LeaveRoom(host.Value, result.LeaveResult);
    raceDone.arrive_and_wait();
});

std::thread joinWorker([&]()
{
    raceStart.arrive_and_wait();
    JoinRoom(challenger.Value, currentRoomId, attempt);
    raceDone.arrive_and_wait();
});

raceStart.arrive_and_wait();
raceDone.arrive_and_wait();
```

장벽은 두 클라이언트 요청을 같은 출발선에서 보내기 위한 장치다. OS와 네트워크
스케줄링까지 똑같이 맞추지는 못하지만, 매 반복마다 어느 요청이 먼저 도착할지
고정하지 않고 두 처리 순서를 반복해서 만들어낸다.

<h2 id="result">측정 결과와 로그</h2>

2026년 9월 3일 로컬 Windows 환경에서 DummyClient2와 Release 서버를 실행한
결과다.

| 측정 항목 | 결과 |
|---|---:|
| 반복 횟수 | 1,000회 |
| 입장 선점 | 448회 |
| 삭제 선점 | 552회 |
| 방 없음 거절 | 552회 |
| 종료 중 거절 | 0회 |
| 예상 외 결과 | 0회 |
| 정리 실패 | 0회 |
| 삭제되지 않은 방 | 0개 |
| 정상 결과 비율 | 100.00% |
| 경합 평균 | 0.51 ms |
| 경합 P50 / P95 / P99 | 0.40 / 0.60 / 0.96 ms |
| 경합 최대 | 20.50 ms |
| 전체 소요 시간 | 1,459.47 ms |
| 초당 반복 처리량 | 685.18회/초 |

`입장 선점 448회 + 삭제 선점 552회 = 전체 1,000회`로 맞아떨어졌고, 모든
반복이 두 정상 경로 중 하나로 끝났다. 특히 예상 외 결과, Join 성공 후 정리
실패, 삭제되지 않고 남은 방이 모두 0건이어서 응답뿐 아니라 반복 종료 후 룩업
테이블 상태까지 일치했다.

<figure class="verification-shot">
  <a href="{{ '/assets/images/projects/ssketch/server-test/room-leave-join-race-1000.png' | relative_url }}?v={{ page.asset_version }}" aria-label="빨간 테두리로 표시한 방 입장 삭제 경합 테스트 결과와 서버 로그 크게 보기">
    <img src="{{ '/assets/images/projects/ssketch/server-test/room-leave-join-race-1000.png' | relative_url }}?v={{ page.asset_version }}" alt="왼쪽 콘솔에 방 입장 삭제 경합 1000회 정상 결과 100퍼센트와 방 누수 0건이 표시되고, 오른쪽 서버 콘솔에서 방 삭제가 먼저 끝난 뒤 Join이 거절된 로그와 Join이 먼저 성공한 뒤 정상 퇴장 및 삭제된 로그가 빨간 테두리로 표시된 화면" width="2879" height="1799" loading="lazy">
  </a>
  <figcaption>위쪽 빨간 박스는 00:57:48.030에 room 91이 삭제된 뒤 Join이 result_code=10으로 거절된 경로이고, 아래쪽은 00:57:48.031~.032에 room 92 Join 성공 후 두 참가자가 퇴장하고 방이 삭제된 경로다.</figcaption>
</figure>

서버 로그에서도 두 정상 경로를 각각 확인할 수 있다.

- **삭제 선점 · room 91**: 호스트 퇴장 → `room_deleted` → 신규 Join
  `room_join_failed(result_code=10)` 순서로 기록됐다. `10`은 `RoomNotFound`다.
- **입장 선점 · room 92**: 신규 참가자가 `player_count=2`로 입장한 뒤 호스트가
  퇴장해 1명이 남았고, 테스트 정리 단계에서 신규 참가자까지 퇴장하자 방이
  삭제됐다.

<h2 id="boundary">결과의 해석 범위</h2>

`경합 평균`과 백분위 값은 장벽 해제부터 Leave·Join 두 응답이 모두 도착할
때까지의 로컬 E2E 시간이다. 순수 Mutex 대기 시간이나 서버 핸들러 하나의 처리
시간이 아니라, 클라이언트 스레드 스케줄링·TCP 송수신·패킷 처리 시간을 함께
포함한다.

또한 지금 서버는 메인 루프 하나에서 `IocpCore::Dispatch()`를 호출한다.
그래서 이 결과는 여러 서버 워커가 같은 Room 객체의 Mutex를 실제로 동시에
획득하려 한 상황을 입증하지 않는다. 대신 네트워크 요청의 도착 순서가 바뀌는
조건에서 Join 성공, RoomNotFound 거절, 후처리와 방 삭제가 일관된 상태로
수렴하는지를 검증한 E2E 테스트다.

Room Mutex의 다중 서버 스레드 경합 자체를 검증하려면 여러 스레드가 같은 Room
객체의 `Enter()`와 `TryCloseIfEmpty()`를 장벽에서 직접 호출하는 도메인 테스트,
또는 여러 IOCP Dispatch 워커가 핸들러를 병렬 실행하는 서버 구성이 추가로
필요하다.

이번 테스트에서 의미 있는 수치는 어느 요청이 더 많이 이겼는지가 아니다. 처리
순서가 448회와 552회로 나뉘었어도 1,000회 모두 허용된 결과로 끝났고, 예상 외
응답·정리 실패·방 누수가 0건이었다는 점이다.
