---
layout: ssketch-project
ssketch_styles: true
title: SSketch
order: 3
team_project: true
category: SSAFY - 특화 프로젝트
project_type: 특화 프로젝트
period: 입력 예정
team: 입력 예정
role: Unity 클라이언트 프레임워크, 실시간 입력 및 동기화, C++ IOCP 서버, Vivox 음성 채팅
stack: Unity · C# · C++ · IOCP · TCP · UDP · Vivox
domains: [게임]
technologies: [Unity, C#, C++, IOCP, TCP, UDP, Vivox]
summary: 함께 그린 그림을 훔치고 평가하는 4인 멀티플레이 게임. Unity의 입력·물리·화면 동기화와 C++ 서버를 연결했다.
hero_heading: 함께 그리고, 훔치고, 평가하는 멀티플레이 그림 게임
hero_intro: 낮에는 화가, 밤에는 도둑이 된다. 같은 주제로 그린 그림을 집에 전시하고, 밤에는 다른 플레이어의 그림을 노린다. 아침의 평가가 끝날 때까지 그림의 주인도, 승부도 바뀔 수 있다.
status: Windows 빌드 공개
roles: [Unity 클라이언트 프레임워크, 실시간 입력 및 동기화, C++ 네트워크 서버]
stacks: [Unity, C#, C++, IOCP, TCP, UDP, Vivox]
tags: [게임 클라이언트, 멀티플레이, 트러블슈팅]
nav_context: projects
---

<h2 id="demo">EC2 시연 영상</h2>

{% include game-video-embed.html id="k56UfyoS6cQ" title="SSketch · EC2 시연 영상" %}

<h2 id="game">그림 한 장이 경쟁의 대상이 되기까지</h2>

SSketch는 그림을 그리는 시간과 그 그림을 두고 경쟁하는 시간을 하나의 라운드로 묶은 4인 온라인 게임이다. 그림 실력에 더해, 누구의 그림을 가져오고 내 그림을 어떻게 지킬지에 따라 결과가 달라진다. Windows에서 플레이할 수 있다.

<div class="ssketch-game-grid">
  <article class="ssketch-game-card">
    <figure><a href="{{ '/assets/images/projects/ssketch/gameplay-drawing.jpg' | relative_url }}"><img src="{{ '/assets/images/projects/ssketch/gameplay-drawing.jpg' | relative_url }}" width="2048" height="1152" loading="lazy" alt="이젤 앞에서 주제에 맞춰 그림을 그리는 SSketch 플레이 화면"></a><figcaption>실제 게임 화면 · 낮의 그림 그리기</figcaption></figure>
    <div class="ssketch-game-card__copy"><h3>01. 낮에는 화가</h3><p>같은 주제를 받고 각자의 그림을 완성한다. 색을 고르고 선을 쌓아 만든 그림은 집에 전시된다.</p></div>
  </article>
  <article class="ssketch-game-card">
    <figure><a href="{{ '/assets/images/projects/ssketch/gameplay-night-theft.jpg' | relative_url }}"><img src="{{ '/assets/images/projects/ssketch/gameplay-night-theft.jpg' | relative_url }}" width="2048" height="1152" loading="lazy" alt="밤이 된 마을에서 다른 집으로 이동하는 캐릭터의 SSketch 플레이 화면"></a><figcaption>실제 게임 화면 · 밤의 그림 쟁탈</figcaption></figure>
    <div class="ssketch-game-card__copy"><h3>02. 밤에는 도둑</h3><p>다른 집의 그림을 가져와 내 집에 전시한다. 들고 있는 동안에는 점수 소유권이 유지되고, 내 집에 놓았을 때 소유권이 바뀐다.</p></div>
  </article>
  <article class="ssketch-game-card">
    <figure><a href="{{ '/assets/images/projects/ssketch/gameplay-morning-review.jpg' | relative_url }}"><img src="{{ '/assets/images/projects/ssketch/gameplay-morning-review.jpg' | relative_url }}" width="2048" height="1152" loading="lazy" alt="잠든 구름 주제의 그림을 보고 점수를 주는 SSketch 평가 화면"></a><figcaption>실제 게임 화면 · 아침의 익명 평가</figcaption></figure>
    <div class="ssketch-game-card__copy"><h3>03. 아침에는 심사위원</h3><p>그림을 익명으로 평가하고 세 라운드의 점수를 합산한다. 공동 1위가 나오면 해당 플레이어끼리 데스매치를 진행한다.</p></div>
  </article>
</div>

<h2 id="role">내가 맡은 일</h2>

Unity 클라이언트 프레임워크와 C++ 네트워크 서버를 연결하고, 멀티플레이에서 입력이 처리되는 흐름을 구현했다. 이후 이동이 끊기거나 예측한 점프가 되돌아가는 현상을 입력 생성부터 호스트 판정, 화면 표시까지 나눠 추적했다. Room·채팅과 Vivox 연동도 함께 담당했다.

<div class="ssketch-role-grid">
  <section><h3>Unity · 클라이언트 프레임워크</h3><ul><li>공통 서비스 조립과 앱·씬 수명 관리</li><li>ScriptableObject Catalog, 프리팹 생성과 풀링</li><li>UI Layer·표시 순서·공통 열기와 닫기</li><li>캐릭터 State, 장비·카메라 Strategy, Animator Adapter</li><li>Vivox 방별 음성 채널, 마이크 음소거와 참가자 표시</li></ul></section>
  <section><h3>Unity · 입력과 화면</h3><ul><li>HostTick / InputTick 기반 입력 예약</li><li>Prediction, Reconciliation, Snapshot Interpolation</li><li>물리 상태와 VisualRoot 화면 보정 분리</li><li>입력 deadline 및 Jump edge 계측, Pre-Tick Pump</li></ul></section>
  <section><h3>C++ · 멀티플레이 기반</h3><ul><li>IOCP 기반 TCP·UDP 송수신</li><li>Session, Room, 호스트 권한과 WorldContext 관리</li><li>입력·스냅샷 검증 및 중계</li><li>Room 작업 직렬화와 도메인 이벤트 전송 연결</li></ul></section>
</div>

<h2 id="development">프레임워크 설계와 멀티플레이 개발 기록</h2>

클라이언트의 공통 서비스·자산·UI·캐릭터 구조를 설계하고, 입력과 물리 상태를 호스트의 시간축에 연결했다. 프레임워크 설계는 객체의 책임과 수명을 중심으로, 동기화와 트러블슈팅은 입력·물리·렌더링의 흐름을 중심으로 정리했다.

<p class="ssketch-read-path">처음부터 읽기: <a href="{{ '/projects/ssketch/technical/host-authority/' | relative_url }}">전체 구조</a> → TCP·UDP 통신 → Room과 JobQueue → 이벤트 전달 구조 → Tick 설계 → 예측과 화면 보정 → 입력 deadline → 점프 입력</p>

<p class="ssketch-read-path">클라이언트 설계부터 읽기: <a href="{{ '/projects/ssketch/technical/framework-lifecycle/' | relative_url }}">앱과 씬의 수명 관리</a> → Catalog와 풀링 → UI 관리 → 캐릭터와 카메라 설계</p>

{% assign featured_details = site.details | where: 'project_slug', 'ssketch' | where: 'featured', true | sort: 'number' %}
<nav class="detail-category-nav" aria-label="개발 기록 분류">{% for category in site.data.ssketch_series %}<a href="#development-{{ category.slug }}">{{ category.name }}</a>{% endfor %}</nav>

{% for category in site.data.ssketch_series %}
{% assign category_details = featured_details | where: 'series_category', category.name %}
<section class="detail-category-section" id="development-{{ category.slug }}" aria-labelledby="development-{{ category.slug }}-title">
  <h3 id="development-{{ category.slug }}-title">{{ category.name }}</h3>
  {% include ssketch-series-cards.html items=category_details %}
</section>
{% endfor %}

<h2 id="wrap-up">설계와 동기화를 연결하는 흐름</h2>

<p>클라이언트 프레임워크에서는 공통 서비스의 조립, 씬 객체의 수명, 자산 조회와 재사용, UI 표시 정책을 나눴다. 캐릭터와 카메라는 상태·전략·어댑터로 변경 지점을 구분했다. 이 구조 위에 입력과 스냅샷의 전달, 예측과 화면 보정을 연결했다.</p>

<p>멀티플레이 설계와 문제 해결 기록은 하나의 질문으로 이어진다. 호스트 하나가 물리를 확정하고 나머지는 그 결과를 따라가는 구조에서, 서로 다른 시점에 만들어진 정보(입력·물리 상태·화면)를 하나의 시간축으로 어떻게 묶을 것인가.</p>

<h3>입력 — 예약해도 제때 쓰이지 않을 수 있다</h3>

<p>전체 구조(Host Authority)에서 이 역할 분담을 정했고, Tick 설계에서 그 시간축에 입력을 예약하는 방법을 만들었다. 하지만 예약만으로는 부족했다. 입력 deadline 글에서 다룬 것처럼 도착한 입력이 Resolve 전에 반영되지 않으면 자리에 있어도 쓰이지 못했다.</p>

<p>이동처럼 계속 반복되는 입력은 fallback으로 몇 틱쯤 버틸 수 있었지만, 점프처럼 한 번만 발생하는 입력은 그 틈을 견디지 못했다. 그래서 Jump edge를 별도 글로 뗐다.</p>

<h3>화면 — 같은 문제가 렌더링에서도 반복됐다</h3>

<p>물리로 확정한 위치를 그대로 렌더링하면 예측이 빗나갈 때마다 화면이 튀었고, 그래서 물리(PhysicsRoot)와 표시(VisualRoot)를 분리했다 — 예측과 화면 보정 글의 내용이다. 이 모든 데이터를 실제로 실어 나르는 층이 TCP·UDP 통신 구조였다.</p>

<p>동기화 문제는 입력 → 물리 → 렌더링 세 층에서 형태를 바꿔 가며 나타났다. 동기화와 트러블슈팅 글은 각 층에서 문제가 어떻게 보였고, 무엇을 계측해 원인을 좁혔는지를 담았다.</p>

<h2 id="evidence">측정으로 남긴 변화</h2>

<div class="ssketch-evidence"><p><strong>입력 fallback 21.95~24.14% → 3.09~4.57%</strong></p><p>같은 PC에서 Host 1개와 Guest 3개를 실행한 수동 비교에서 관측했다. Tick 직전에 입력 큐를 반영하도록 순서를 수정한 뒤 실제 입력 소비 비율은 95.43~96.91%였다. 실행 조건과 별도 2PC 검증은 <a href="{{ '/projects/ssketch/technical/input-deadline/' | relative_url }}">입력 deadline 글</a>에 정리했다.</p></div>

<div class="ssketch-evidence"><p><strong>호스트 화면의 Guest 표시 속도 표준편차 0.906 → 0.355 m/s</strong></p><p>2PC·2인 실험에서 등속 이동 구간을 골라 비교했다. 프레임 조건까지 맞춘 부분집합에서는 0.404 → 0.350 m/s였다. 화면 보간의 효과와 지연 비용을 <a href="{{ '/projects/ssketch/technical/prediction-reconciliation/' | relative_url }}">예측과 화면 보정 글</a>에서 함께 다뤘다.</p></div>

초기 서버의 동시 입장·퇴장 경합 기록은 [서버 테스트 기록]({{ '/projects/ssketch/server-test/' | relative_url }})에 보관했다. 해당 기록은 당시의 6인 방 제한을 대상으로 했으며, 현재 공개 게임은 4인 구성이다.

<h2 id="improvements">개선 예정</h2>

<h3>녹화·프레임 지연 상황의 게스트 이동 안정화</h3>

<p>EC2 서버를 통한 시연에서 화면을 녹화하던 게스트가 간헐적으로 이동 후 원위치로 끌려오는 현상을 겪었다. 함께 참여한 다른 게스트는 같은 증상을 겪지 않았다고 보고했다. 로컬 테스트에서는 발견하지 못했으며, 녹화 부하와 네트워크 지연 중 어느 조건이 원인인지는 아직 확정하지 않았다. 해당 시연은 <a href="#demo">메인 영상</a>에 담았다.</p>

<p>우선 확인할 가설은 녹화 중 프레임 지연으로 <code>Update</code>에서의 입력 생성·송신이 늦어져 호스트의 입력 처리 시한을 넘겼다는 것이다. 호스트가 해당 틱에 사용할 입력을 받지 못하면 이전 입력을 잠시 유지한 뒤 <code>NeutralFallback</code>으로 처리할 수 있고, 이때 게스트의 예측 이동이 호스트의 확정 위치로 반복 보정될 수 있다. 당시 입력 로그와 대조하기 전까지는 원인 가설로 남긴다.</p>

<ul>
  <li><strong>원인 분리:</strong> 같은 게스트 PC에서 녹화 유무와 FPS 제한 조건을 비교하고, 프레임 간격·입력 생성 및 송신 시각·호스트 수신 및 버퍼 등록 시각·입력 틱과 확정 틱을 함께 기록한다. 증상 구간의 <code>NeutralFallback</code>, 늦은 입력 거절, 위치 보정량을 대조한다.</li>
  <li><strong>입력 공급 보완:</strong> 프레임이 밀렸을 때 누락 틱 보충과 송신 주기가 충분히 유지되는지 점검한다. 지연이 발생하는 단계에 맞춰 렌더 프레임에 대한 입력 공급의 의존도를 줄이는 방안을 검토한다.</li>
  <li><strong>선행 틱 조절:</strong> 입력 도착 여유가 부족한 것으로 확인되면 RTT뿐 아니라 지연 변동과 실제 도착 여유를 반영해 퓨처 틱을 조절한다. 급격한 지연에는 여유를 늘리고 안정 시 천천히 줄이며, ACK 기반 상한과 추가 입력 지연도 함께 평가한다.</li>
</ul>

<p>개선 후에는 같은 EC2 접속·녹화 조건에서 이동, 정지, 방향 전환, 점프를 반복해 원위치 보정 재발 여부와 입력 응답성을 비교할 예정이다.</p>

<p class="ssketch-source">게임 소개와 플레이 화면: <a href="https://ssketch.ddns.net/" target="_blank" rel="noopener noreferrer">SSketch 공식 사이트</a> · 로고와 상단 소개 일러스트: D204 SSketch 발표 자료. 측정값의 실행 환경과 해석 범위는 각 개발 기록에 기재했다.</p>
