---
layout: gilbom-project
gilbom_styles: true
theme_color: '#2e3d86'
title: 길봄
order: 2
team_project: true
category: SSAFY - 공통 프로젝트
project_type: 공통 프로젝트
summary: 점자블록을 순찰하는 로봇과 웹 관제를 연결한 AIoT 서비스. 결함 모니터링, 로봇·순찰구역 관리, LLM 보고서 작성을 지원한다.
hero_heading: 딛는 발걸음마다 안심, AIoT가 가꾸는 장애 없는 길
hero_intro: 로봇이 점자블록을 살피고, 관리자는 웹에서 결함 위치와 순찰 상태를 확인한다. 길봄은 점자블록의 탐지 정보부터 관리와 보고서 작성까지 하나의 흐름으로 연결한다.
status: 개발 완료
period: 2026.07.20 – 2026.08.08 (약 3주)
role: 웹·MQTT 통신, TLS·CA, Robot·Telemetry DB·SSE, Command·Patrol·Mission API·관제 UI
team: 7인 · Web·Infra·MQTT 3인, Embedded·AI·Automation·Hardware 4인
stack: Java 21 · Spring Boot · PostgreSQL · MQTT 5 · React · Playwright · Docker
domains:
  - IoT
technologies:
  - Java 21
  - Spring Boot
  - PostgreSQL
  - MQTT
  - React
  - Playwright
  - Docker
tags:
  - SSAFY
  - 팀 프로젝트
  - 인증
  - MQTT
  - Spring Boot
  - React
nav_context: SSAFY / GILBOM
footer_label: GILBOM / DETAIL ARCHIVE
---

{% assign details = site.details | where_exp: "detail", "detail.url contains '/projects/gilbom/'" | sort: "order" %}

<h2 id="overview">점자블록을 살피는 로봇, 길을 관리하는 웹</h2>

점자블록의 파손과 미설치는 시각장애인의 이동을 방해한다. 길봄은 점자블록을 순찰하는 로봇과 웹 관리 화면을 연결해, 관리자가 결함 위치와 상태를 파악하고 후속 관리에 필요한 정보를 모을 수 있도록 만든 AIoT 서비스다.

로봇은 카메라 영상으로 점자블록을 탐지하고 인도 경계를 구분한다. 웹에서는 로봇이 전달한 탐지 정보와 위치를 확인하고, 순찰구역과 임무를 관리한다. 결함 정보는 LLM을 활용한 보고서 작성으로 이어진다.

<dl class="gilbom-snapshot"><div><dt>기간</dt><dd>{{ page.period }}</dd></div><div><dt>팀 구성</dt><dd>{{ page.team }}</dd></div><div><dt>담당 기술</dt><dd>{{ page.stack }}</dd></div></dl>

<h2 id="features">탐지부터 관리와 보고서까지</h2>

<div class="gilbom-feature-grid">
  <article class="gilbom-feature-card">
    <figure><a href="{{ '/assets/images/projects/gilbom/presentation-defect-monitoring.png' | relative_url }}"><img src="{{ '/assets/images/projects/gilbom/presentation-defect-monitoring.png' | relative_url }}" width="2878" height="1558" loading="lazy" alt="파손과 미설치 점자블록의 위치를 지도 마커와 군집으로 표시한 길봄 결함 모니터링 화면"></a><figcaption>발표 자료 · 실시간 결함 상태 모니터링</figcaption></figure>
    <div><h3>01. 점자블록 결함 모니터링</h3><p>로봇이 탐지한 점자블록의 결함 위치를 지도에서 확인한다. 관리자는 결함 유형과 위치를 검색하고 필터링해 관리할 대상을 찾는다.</p></div>
  </article>
  <article class="gilbom-feature-card">
    <figure><a href="{{ '/assets/images/projects/gilbom/presentation-patrol-area.png' | relative_url }}"><img src="{{ '/assets/images/projects/gilbom/presentation-patrol-area.png' | relative_url }}" width="400" height="200" loading="lazy" alt="지도에서 여섯 개의 꼭짓점으로 순찰구역을 지정하는 길봄 관리 화면"></a><figcaption>발표 자료 · 순찰구역 지정</figcaption></figure>
    <div><h3>02. 로봇·순찰구역 관리</h3><p>관리자는 지도에 순찰구역을 지정하고 로봇의 임무를 생성·제어한다. 웹 관제 화면은 로봇의 위치와 배터리 등 Telemetry를 표시한다.</p></div>
  </article>
  <article class="gilbom-feature-card">
    <figure><a href="{{ '/assets/images/projects/gilbom/presentation-report.png' | relative_url }}"><img src="{{ '/assets/images/projects/gilbom/presentation-report.png' | relative_url }}" width="400" height="260" loading="lazy" alt="점자블록 사진, 주요 결함과 조치 권고를 담은 길봄 보고서 관리 화면"></a><figcaption>발표 자료 · 보고서 관리</figcaption></figure>
    <div><h3>03. LLM 보고서 작성</h3><p>결함 정보와 현장 이미지를 바탕으로 LLM이 보고서 작성을 지원한다. 관리자는 보고서에서 주요 결함과 조치 권고를 확인한다.</p></div>
  </article>
</div>

<h2 id="role">내가 맡은 일</h2>

웹과 MQTT 통신, 로봇 관제를 담당했다. TLS 설정과 CA 인증서 처리, MQTT 패킷 정의, 로봇 등록과 Credential 관리, Robot·Telemetry DB, 주행 궤적(Trajectory) 조회, SSE 이벤트 핸들러를 구현했다. Robot·Command·Patrol·Mission API와 관리자 화면도 함께 작성했다.

로봇이 보낸 데이터를 백엔드가 수신·저장하고 웹에 전달하는 흐름과, 웹에서 보낸 명령을 백엔드가 로봇에 전달하고 처리 결과를 수신하는 흐름을 연결했다.

<div class="gilbom-role-grid">
  <section><h3>MQTT 패킷·통신 계약</h3><p>로봇과 백엔드가 주고받는 MQTT 패킷을 정의했다. 백엔드의 메시지 파싱과 토픽별 수신 핸들러를 구현해 로봇 상태, Telemetry, 이벤트와 명령 결과를 각 처리 경로에 연결했다.</p></section>
  <section><h3>TLS 설정·CA 인증서 처리</h3><p>MQTT 통신의 TLS 설정과 CA 인증서 처리를 구현했다. 백엔드는 CA 인증서를 신뢰 저장소에 등록하고 SSLContext를 구성해 TLS 브로커에 연결한다.</p></section>
  <section><h3>Robot·Telemetry DB와 궤적 조회</h3><p>로봇 기준정보, 최신 상태와 Telemetry 이력의 DB 저장·조회 로직을 구현했다. 백엔드는 GPS 이력에서 임무별 실제 이동 궤적을 조회하고, 기간별 Telemetry 통계·시계열 API를 제공한다.</p></section>
  <section><h3>SSE 이벤트 핸들러</h3><p>로봇 데이터와 명령 상태의 변경을 웹에 알리는 이벤트 핸들러를 작성했다. 백엔드는 DB 트랜잭션 커밋 후 SSE 알림을 발행한다. 웹은 알림을 수신하거나 연결을 복구하면 REST API로 최신 데이터를 다시 조회한다.</p></section>
  <section><h3>로봇 등록·Credential 관리</h3><p>로봇 등록과 MQTT Credential의 최초 발급·회전·폐기 흐름을 구현했다. 백엔드 API와 관리자 화면을 연결해 로봇 등록 상태와 접속 자격 증명을 관리한다.</p></section>
  <section><h3>Patrol·Mission API와 관리 화면</h3><p>순찰구역 등록·선택과 시간 기반 임무 생성·제어 API, 관리자 화면을 구현했다. 웹은 임무 상태와 이력, 경과 시간, 실제 이동 궤적을 함께 표시한다.</p></section>
  <section><h3>MQTT 통신·데이터 정합성</h3><p>Message Expiry와 Freshness Guard, <code>boot_id + seq</code> 기반 Replay 방어를 적용했다. 백엔드는 지연·중복·과거 메시지가 로봇의 최신 상태를 덮어쓰지 않도록 처리한다.</p></section>
  <section><h3>Robot Command 왕복</h3><p>관리자의 REST 요청, 백엔드의 MQTT 명령 발행, 로봇의 결과 응답, 백엔드의 SSE 알림을 연결했다. 정상·실패·거절·만료·중복 경로별로 명령 상태를 관리한다.</p></section>
  <section><h3>실시간 Mission 지도</h3><p>웹에서 지도 인스턴스를 유지하고 SVG Overlay만 갱신하도록 구성했다. SSE로 로봇 상태를 수신해도 지도 시점과 확대 수준을 유지한다.</p></section>
  <section><h3>관리자 프로필·계정 보안</h3><p>마이페이지 UI를 프로필 조회와 비밀번호 변경 API에 연결했다. 백엔드는 현재 비밀번호를 검증하고, 비밀번호 변경 후 모든 세션을 종료해 재로그인을 요구한다.</p></section>
</div>

로봇의 연결이 끊기거나 메시지가 다시 도착해도 관제 화면과 DB의 상태가 어긋나지 않도록 통신과 상태 전이를 다뤘다. 관련 문제와 해결 방법은 아래 개발 기록에 정리했다.

<h2 id="details">상세 기록</h2>

명령과 임무의 상태 관리, 지도 갱신, 통신 계약과 인증 구조를 트러블슈팅·성능 향상·유지보수와 확장성으로 나눴다.

<div class="detail-category-nav" aria-label="상세 기록 카테고리">
  {% for category in site.data.detail_categories %}
    <a href="#{{ category.slug }}">{{ category.label }}</a>
  {% endfor %}
</div>

{% for category in site.data.detail_categories %}
  {% assign category_details = details | where: "detail_category", category.label %}
  <section class="detail-category-section" id="{{ category.slug }}" aria-labelledby="{{ category.slug }}-title">
    <div class="detail-category-section__heading">
      <div>
        <p class="section-index">DETAIL CATEGORY</p>
        <h3 id="{{ category.slug }}-title">{{ category.label }}</h3>
      </div>
      <a href="{{ category.url | relative_url }}">분류 전체 보기 <span aria-hidden="true">→</span></a>
    </div>
    {% include detail-cards.html items=category_details preview=true %}
  </section>
{% endfor %}

<p class="archive-link">
  <a href="{{ '/projects/gilbom/details/' | relative_url }}">
    상세 기록 전체 보기 <span aria-hidden="true">→</span>
  </a>
</p>

<p class="gilbom-source">서비스 소개와 화면 출처: SSAFY 15기 공통 프로젝트 D101 최종 발표 자료.</p>
