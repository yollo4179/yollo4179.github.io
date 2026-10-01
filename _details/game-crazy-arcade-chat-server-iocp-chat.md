---
layout: game-article
title: TCP 클라이언트와 IOCP 채팅 서버 연결
project_slug: crazy-arcade-chat-server
game_portfolio: true
game_order: 3
topic: 채팅 서버
summary: REQ_LOGIN, SND_MESSAGE를 서버가 처리하고 ACK_LOGIN, BROAD_CAST_ALL을 각 클라이언트에 전달한다.
tags:
- TCP
- IOCP
- 프로토콜
permalink: /projects/crazy-arcade-chat-server/technical/iocp-chat/
nav_context: GAME PORTFOLIO / CHAT SERVER
---

## 문제와 구현

클라이언트는 서버 IP 주소와 포트에 TCP 소켓으로 연결한다. 연결이 성립하면 메인 스레드는 렌더링을 계속하고, 별도의 송신·수신 스레드가 네트워크 통신을 맡는다. 사용자가 채팅 입력을 끝내거나 캐릭터를 바꾸면 클라이언트는 프로토콜 코드와 데이터 길이, 실제 내용을 연속된 바이트 배열로 서버에 보낸다. 수신 스레드는 서버 데이터의 코드를 읽고 채팅 내용은 채팅 상자에 추가하며, 캐릭터 변경은 해당 클라이언트의 화면 상태에 반영한다.

서버의 리스너 소켓은 주소와 포트를 바인딩하고 새 연결을 받는다. 워커 스레드는 IOCP 완료 큐에서 수신 완료 작업을 꺼내 프로토콜 코드에 따라 데이터를 처리한다. 서버가 변경 정보를 다른 클라이언트에 전달하면, 각 클라이언트의 수신 스레드가 자기 화면에 같은 결과를 반영한다. TCP는 채팅에 필요한 데이터 도달 순서와 재전송을 제공한다는 점을 고려해 선택했다.

```text
클라이언트 A ── 채팅·상태 전송 ──→ TCP 서버
클라이언트 B ←─ 변경 정보 전달 ─── TCP 서버
                                   └─ IOCP 완료 큐 → 워커 스레드
```

<figure class="game-media-feature">
  <video controls preload="metadata" playsinline aria-label="크레이지 아케이드 채팅 서버와 클라이언트 시연"><source src="{{ '/assets/videos/projects/crazy-arcade-chat-server/chat-demo.mp4' | relative_url }}" type="video/mp4"></video>
  <figcaption>채팅 서버와 클라이언트 시연 · <a href="{{ '/assets/videos/projects/crazy-arcade-chat-server/chat-demo.mp4' | relative_url }}">영상 파일 열기</a></figcaption>
</figure>

{% include game-media-gallery.html slug="crazy-arcade-chat-server" summary="클라이언트 연결·송수신 코드 이미지 7장" items="client-connection-01.png|서버 주소와 포트로 연결하는 코드;client-connection-02.png|클라이언트의 송수신 스레드 진입점;client-connection-03.png|송신 스레드 구성 코드;client-connection-04.png|수신 스레드 구성 코드;client-send.png|채팅과 캐릭터 변경 정보를 전송하는 코드;client-receive-01.png|수신 데이터의 프로토콜 분기 코드;client-receive-02.png|클라이언트 화면에 수신 내용을 반영하는 코드" %}

## 완료 큐에서 메시지를 화면까지

서버의 `PROTOCOL_HEADER`는 프로토콜 코드와 뒤따르는 데이터 크기를 담는다. `REQ_LOGIN`을 받으면 서버는 세션 ID를 `ACK_LOGIN`으로 돌려주고 플레이어 정보도 함께 보낸다. `SND_MESSAGE`를 받으면 `CHAT_LOG`에서 계정·캐릭터 정보를 갱신한 뒤 `BROAD_CAST_ALL` 패킷을 만든다. 서버는 패킷을 연결된 소켓에 전송하고, 클라이언트 수신 스레드는 채팅 상자와 캐릭터 표시를 갱신한다.

`WorkingThread()`는 `GetQueuedCompletionStatus()`에서 완료된 수신을 받고, 처리 뒤 `WSARecv()`를 다시 등록한다. 이 방식에서 IOCP는 수신 완료를 워커에 전달하는 역할이다. 이 코드의 브로드캐스트 송신은 별도 완료 큐에 올린 비동기 송신이 아니라 `send()` 호출이다. 또한 TCP의 한 번 수신이 항상 한 패킷과 일치하는 보장은 없으므로, 패킷 길이에 맞춘 누적 버퍼와 범위 검사는 이후 보강할 부분이다.
