---
title: 길봄
order: 2
team_project: true
category: SSAFY - 공통 프로젝트
project_type: 공통 프로젝트
summary: 점자 보도블록 순찰 로봇의 프로필·계정 보안 관리, MQTT 통신, 원격 명령 왕복, 실시간 Mission 지도를 구현한 과정입니다.
status: 개발 완료
period: 2026.07.20 – 2026.08.08 (약 3주)
role: Backend·인증/프로필 관리, MQTT 통신·Robot Command, 실시간 관제 UI
team: 입력 예정
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

{% assign details = site.details | sort: "order" %}

<nav class="project-toc" aria-label="길봄 프로젝트 목차">
  <p>공통 내용</p>
  <ol>
    <li><a href="#overview">프로젝트와 담당 범위</a></li>
    <li><a href="#details">상세 기록</a></li>
  </ol>
</nav>

<h2 id="overview">프로젝트 개요</h2>

길봄은 2026년 7월 20일부터 8월 8일까지 약 3주 동안 진행한 SSAFY 공통
프로젝트로, 점자 보도블록을 순찰하는 로봇과 관리 화면을 연결하는 서비스입니다.
공통 프로젝트 개발 종료 후에는 구현 근거와 트러블슈팅을 포트폴리오로 정리하고
있습니다.

저는 관리자 프로필과 계정 보안 관리, 로봇 메시지가 Backend와 DB에 안전하게
반영되는 과정, 관리자가 보낸 명령이 로봇의 최종 결과로 돌아오는 과정, Mission
지도가 Telemetry에 맞춰 갱신되는 과정을 담당했습니다.

### 담당 기능과 기여

- **프로필 조회 및 계정 보안 관리**: 마이페이지 UI와
  `GET /api/v1/my/profile`, `PATCH /api/v1/my/password` API를 연결했습니다.
  프로필에는 이름·이메일·부서·직책·근무지·역할·MFA 상태·최근 로그인처럼 필요한
  정보만 노출하고, 비밀번호 변경 시 현재 비밀번호를 검증한 뒤 모든 세션을 종료해
  다시 로그인하도록 구성했습니다.
- **MQTT 통신과 데이터 정합성**: Message Expiry, Freshness Guard,
  `boot_id + seq` 기반 Replay 방어로 지연·중복 메시지가 현재 상태를 덮어쓰지 않게
  했습니다.
- **Robot Command 왕복**: REST 요청부터 MQTT 명령, Robot Result, SSE 알림까지
  연결하고 정상·실패·거절·만료·중복 경로를 분리했습니다.
- **실시간 Mission 지도**: Map Instance는 유지하고 SVG Overlay만 갱신해 SSE 수신
  중 발생하던 플리커링과 Viewport 초기화를 제거했습니다.

이 영역에서 중요한 것은 기능이 한 번 동작하는 모습만 만드는 것이 아니었습니다.
로봇이 잠시 끊겼다가 연결되거나, 같은 메시지가 다시 오거나, 결과가 제한 시간보다
늦게 도착해도 현재 상태가 잘못 바뀌지 않아야 했습니다. 관련 구현과 검증 내용은
주제별 상세 기록으로 분리했습니다.

> **공통 검증 범위**
>
> 2026-08-12 결과는 로컬 TLS Mosquitto·Mock Robot 또는 Fake Naver SDK·로컬
> Chromium 기준입니다. 실제 Jetson과 EC2 운영 환경에서 다시 확인하지 않은 결과를
> 운영 종단 검증으로 표현하지 않았습니다.
>
> 2026-08-14 TLS·mTLS 전략 사례는 현재 HEAD 단위 테스트 기준입니다. mTLS 구현과
> 실제 Jetson·EC2 Broker 종단 적용을 구분했습니다.

<h2 id="details">상세 기록</h2>

상세 페이지는 트러블슈팅, 성능 향상, 유지보수,확장성의 세 카테고리로 관리합니다.
각 기록의 구현 내용과 검증 범위는 독립된 페이지에서 확인할 수 있습니다.

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
