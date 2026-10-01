---
layout: game-article
title: 공유 버퍼 때문에 튄 트레일을 객체별 버퍼로 분리하기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 4
topic: 트레일과 화면 효과
summary: 트레일이 원점이나 다른 객체 쪽으로 튀던 문제를 겪고, 프로토타입 복제본마다 버퍼와 궤적 원소를 따로 소유하도록 구성했다.
tags:
- 트레일
- 프로토타입
- 버퍼
permalink: /projects/gunfire-reborn/technical/trail-ownership/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 문제와 구현

트레일은 무기 소켓의 움직임에 맞춰 매번 다른 형태가 되므로 트레일 객체마다 버퍼를 따로 가진다. 무기가 이동하면 소켓 위치에서 좌우 정점 한 쌍을 얻어 `deque`에 추가한다. 네 쌍 이상의 제어점이 모이면 Catmull–Rom 보간으로 점 사이에 중간 정점을 넣어 각진 궤적을 곡선으로 만든다. 보간을 마친 정점의 UV를 다시 계산하고 `Map`·`Unmap`으로 정점 버퍼에 반영한다.

정점 수가 한도를 넘으면 오래된 정점부터 제외한다. `deque`는 양끝의 정점을 다루기 쉬워 계속 생성되고 사라지는 궤적에 사용했다. UI처럼 모든 객체가 같은 쿼드 메시를 공유하면 트레일마다 다른 궤적을 담을 수 없어, 트레일 버퍼는 객체별로 관리했다.

<figure class="game-media-feature">
  <img src="{{ '/assets/images/projects/gunfire-reborn/trail-demo.gif' | relative_url }}" alt="무기 이동에 따라 곡선 트레일이 생성되는 게임 장면" loading="lazy">
  <figcaption>무기 소켓의 이동을 따라 트레일 정점이 이어지는 장면</figcaption>
</figure>

{% include game-media-gallery.html slug="gunfire-reborn" summary="트레일 버퍼 구성과 보간 코드 이미지 5장" items="trail-implementation-01.png|트레일 제어점과 보간 대상 설정;trail-implementation-02.png|보간에 필요한 정점 수 확인;trail-implementation-03.png|최대 정점 수와 오래된 정점 처리;trail-implementation-04.png|Catmull–Rom 중간 정점 삽입;trail-implementation-05.png|UV와 버텍스 버퍼 갱신" %}

## 트레일이 원점이나 다른 객체 쪽으로 튀던 문제

트레일이 자기 무기를 따라가다가 갑자기 원점 `(0, 0, 0)`으로 튀거나 다른 객체 쪽으로 이동하는 문제가 있었다. 궤적이 엉뚱한 객체를 따라가는 현상도 반복됐다. 궤적을 계속 갱신하는 과정에서 발생한 버퍼 공유 문제였다.

게임 오브젝트는 프로토타입을 복제해 만들었지만, 트레일 정점은 복제 인스턴스마다 계속 달라진다. 같은 정적 메시를 읽는 객체와 달리, 트레일은 각자 자기 무기가 지나온 위치를 버퍼에 쓴다. 이 버퍼를 공유하면 서로 다른 궤적의 갱신이 같은 자원에 반영된다. 따라서 프로토타입 복제 구조 안에서도 트레일의 버퍼와 궤적 원소는 객체마다 따로 가져야 했다.

`CVIBuffer_Trail::Clone()`은 프로토타입을 복사한 뒤 `Initialize()`를 호출한다. `Initialize()`는 `TRAIL_DESC`의 최대 정점 수로 동적 정점 버퍼와 인덱스 버퍼를 새로 만들고, 각 인스턴스의 `m_TrailVertices`에 자기 궤적을 쌓는다. 텍스처·셰이더처럼 공유해도 되는 자원은 프로토타입 경로를 쓰되, 매 프레임 내용이 달라지는 정점 버퍼와 원소는 복제본의 소유로 둔 이유다.

## 좌표계도 버퍼 소유권만큼 중요했다

`Add_Points_CatMullRom()`은 로컬 끝점 두 개에 입력 행렬을 적용해 정점을 만든다. 입력이 이미 월드 행렬이면 정점이 월드 좌표가 되므로 렌더링의 `g_WorldMatrix`에는 단위 행렬을 전달한다. 로컬 좌표를 유지하는 경로라면 렌더링 단계에서 객체의 월드 행렬을 적용한다. 입력 행렬과 렌더 행렬이 둘 다 월드 변환을 담으면 변환이 중복돼 트레일이 원래 위치에서 멀어진다. 그래서 월드 행렬을 받아 로컬 끝점을 월드에 기록하는 경로와, 로컬 행렬을 받아 객체의 월드 변환을 렌더 단계에 남기는 경로의 계약을 나눴다.

`CTrail_Monster02::Bind_ShaderResources()`는 월드 정점 경로에서 단위 행렬을 바인딩하고, 별도의 글로우 렌더 경로는 트랜스폼 행렬을 바인딩한다. 두 경로의 좌표 기준이 일치해야 같은 트레일이 화면 효과 패스에서도 같은 위치에 그려진다.

## 결과

각 트레일이 자기 버퍼와 정점 원소를 갖도록 바꿔 다른 객체의 갱신이 궤적을 밀어내는 원인을 제거했다. 정점 생성 시의 좌표 공간과 렌더 패스의 월드 행렬도 한 쌍으로 관리해야 위치가 튀지 않는다.
