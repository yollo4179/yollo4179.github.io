---
layout: game-project
title: 크레이지 아케이드 채팅 서버
order: 6
game_order: 2
game_portfolio: true
team_project: false
category: 게임 개발
project_type: 개인 프로젝트
summary: ImGui UI 배치 도구와 JSON 화면 재구성, TCP·IOCP 채팅 서버와 클라이언트를 구현한 개인 프로젝트다.
cover_image: /assets/images/projects/crazy-arcade-chat-server/project-cover.jpg
cover_alt: 크레이지 아케이드 원작 표지 이미지
status: 구현 기록
period: 2025.07.08 ~ 2025.07.29
role: UI 배치 도구, JSON 직렬화, TCP 클라이언트, IOCP 채팅 서버
team: 개인 프로젝트
stack: C++, DirectX, HLSL, ImGui, JSON, TCP/IP, IOCP
domains:
- 게임
technologies:
- C++
- DirectX
- IOCP
- TCP
tags:
- 게임
- DirectX
- C++
- IOCP
- UI 툴
nav_context: GAME PORTFOLIO / CHAT SERVER
game_slug: crazy-arcade-chat-server
hero_image: /assets/images/projects/crazy-arcade-chat-server/ui-load-demo.gif
hero_alt: 크레이지 아케이드 UI 배치 도구에서 저장한 화면을 다시 불러오는 장면
hero_caption: UI 도구 · 저장한 화면 다시 불러오기
topics:
- id: ui
  name: UI 제작 도구
  description: 부모·자식 UI 배치와 그리드 정렬, JSON 직렬화와 런타임 조립을 나눠 기록했다.
- id: network
  name: 채팅 서버
  description: TCP 클라이언트의 송수신과 IOCP 서버의 완료 큐·프로토콜 처리를 연결했다.
---

## 프로젝트 소개 {#overview}

크레이지 아케이드 스타일의 화면에서 UI를 직접 배치하고, 채팅과 캐릭터 정보를 여러 클라이언트에 전달하기 위해 만든 개인 작업이다. UI를 코드에 고정하지 않고 ImGui 도구에서 부모·자식 트리로 만들었다. 도구가 저장한 JSON을 클라이언트가 읽어 같은 구조의 화면을 구성한다.

채팅은 클라이언트의 TCP 송수신 스레드와 IOCP 서버를 연결했다. 사용자가 메시지나 캐릭터 정보를 보내면 서버의 워커 스레드가 완료 큐에서 수신 작업을 받아 프로토콜 코드에 따라 처리하고, 연결된 클라이언트에 전달한다.

## 담당 구현 {#contribution}

- **UI 제작:** ImGui 객체 선택·복제, 부모·자식 계층, 크기·위치·텍스처·Z 순서 편집, 그리드 정렬.
- **화면 데이터:** UI 트리의 JSON 저장과 로드, `ObjectBuilderSystem`을 통한 클라이언트 화면 재구성.
- **네트워크:** TCP 클라이언트 연결·송수신, 채팅·캐릭터 정보 프로토콜, IOCP 서버의 완료 큐와 워커 스레드.

## 구현 장면

![UI 도구가 부모 패널의 자식 UI를 그리드로 정렬하는 장면]({{ '/assets/images/projects/crazy-arcade-chat-server/grid-align-demo.gif' | relative_url }})

부모 패널의 패딩·간격·열 수를 바꾸고 자식 UI를 다시 정렬한다. 저장한 계층은 JSON의 `CHILDREN` 배열을 따라 클라이언트에서 다시 만든다.

<div class="detail-image-placeholder">필요한 화면: 채팅 메시지와 캐릭터 변경이 두 클라이언트에 반영된 화면</div>

서버는 `SND_MESSAGE`를 처리해 `BROAD_CAST_ALL` 패킷을 보낸다. 클라이언트 수신까지의 경로는 [채팅 서버 구현 목록]({{ '/projects/crazy-arcade-chat-server/details/#topic-network' | relative_url }})에서 이어진다.

도구에서 한 번 만든 화면을 데이터로 다시 조립하는 과정과 채팅 메시지가 각 클라이언트 화면까지 도달하는 과정을 기술 글로 분리했다.
