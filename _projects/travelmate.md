---
layout: travelmate-project
travelmate_styles: true
asset_version: '20261102-1'
theme_color: '#eaf7ff'
title: TravelMate
order: 1
team_project: true
category: 앱/서비스
project_type: AI 인터랙티브 여행 서비스
summary: AI 여행메이트 리리와 대화와 선택으로 이야기를 이어가고, 장소 추천과 여행 계획을 연결하는 스토리형 여행 서비스.
hero_heading: 리리와 함께, 여행의 다음 장면으로
hero_intro: 대화와 선택에서 시작한 이야기가 나에게 맞는 장소와 여행 일정으로 이어집니다.
hero_image: /assets/images/projects/travelmate/sunny-travel-invitation.png
hero_alt: 여행메이트 리리가 부산 바다를 배경으로 손을 내밀고, TravelMate 로고와 여행 사진이 놓인 초대 이미지
status: 개발 중 · 기술 연동 설계 중
period: 입력 예정
role: 입력 예정
team: 입력 예정
stack: Android (Kotlin) · Vue 3 · Spring Boot (Java) · FastAPI (Python) · PostgreSQL/pgvector · Ollama
domains:
  - 앱/서비스
technologies:
  - Android
  - Kotlin
  - Vue 3
  - Spring Boot
  - Java
  - FastAPI
  - Python
  - PostgreSQL
  - pgvector
  - RAG
  - Tool Calling
  - Streaming
  - Message Queue
  - STT
  - TTS
tags:
  - TravelMate
  - AI
  - 여행
  - 미연시
  - RAG
  - Tool Calling
  - 스트리밍
  - 메시지 큐
  - 음성 대화
nav_context: AI / TRAVEL / RIRI
---

## 나의 여행메이트 리리와 함께
{: #overview }

TravelMate는 AI 여행메이트 리리와 대화하며 여행을 만들어 가는 앱/서비스입니다. 사용자는 리리와 대화를 나누고 선택지를 고르며 이야기를 이어갑니다. 미연시의 캐릭터 교감과 선택형 스토리에 지도 기반 장소 탐색, 여행지 추천, 일정 구성을 연결해 여행을 계획하는 과정까지 하나의 상호작용 경험으로 만듭니다.

## 문제와 목표
{: #goal }

여행 준비는 장소를 찾고, 취향을 비교하고, 동행자와 일정을 조율하는 여러 단계로 나뉩니다. TravelMate는 이 과정을 리리와의 대화 안에서 자연스럽게 이어 주고, 이야기 속 선택을 실제 여행 계획으로 구체화하는 것을 목표로 합니다.

## 핵심 경험
{: #experience }

<div class="travelmate-feature-grid">
  <section><span>01 / STORY</span><h3>대화로 시작하는 여행</h3><p>리리와 대화하고 선택지를 고르며 캐릭터 중심의 이야기를 이어갑니다.</p></section>
  <section><span>02 / DISCOVER</span><h3>취향에 맞는 장소 발견</h3><p>대화 맥락과 관심 키워드에 맞는 장소와 주변 활동을 추천받습니다.</p></section>
  <section><span>03 / PLAN</span><h3>발견을 일정으로</h3><p>지도에서 장소를 확인하고 추천 결과를 여행 일정으로 연결합니다.</p></section>
  <section><span>04 / VOICE</span><h3>더 가까운 대화</h3><p>텍스트 대화에 더해 음성으로도 리리와 소통하는 경험을 확장합니다.</p></section>
</div>

## 기술 구성
{: #technology }

| 기술 요소 | TravelMate에서의 역할 | 진행 상태 |
| --- | --- | --- |
| RAG | 장소 정보와 대화 맥락을 바탕으로 관련 장소를 검색하고 추천 근거를 구성합니다. | 장소 임베딩·시맨틱 검색 흐름을 구현하고 추천 연결을 확장 중 |
| Tool Calling | 대화 중 장소 검색이나 일정 구성 같은 앱 기능을 상황에 맞게 호출합니다. | 대화와 도구 실행을 연결하는 구조 설계 중 |
| 스트리밍 응답 | 리리의 응답을 생성되는 대로 전달해 대화의 흐름을 자연스럽게 보여줍니다. | 실시간 전송 방식과 화면 연동을 적용할 예정 |
| 메시지 큐 | 임베딩 인덱싱과 추천 작업을 비동기로 전달해 서비스 간 처리를 분리합니다. | 요청·완료 이벤트 기반 구조를 설계하고 연결 중 |
| STT / TTS | 사용자의 음성을 입력으로 받아들이고 리리의 응답을 음성으로 전달합니다. | 음성 대화 흐름을 기획 중이며 제공자와 연동 방식은 미정 |

주요 애플리케이션은 Android와 Vue 클라이언트, Spring Boot 서버, FastAPI 임베딩·검색 구성으로 나뉩니다. 장소 검색에는 임베딩과 리랭킹을 활용하며, 대화 기능과 비동기 처리·음성 연동은 구현 상태에 맞춰 단계적으로 확장합니다.

## 진행 상황
{: #progress }

현재 저장소에는 장소 임베딩과 의미 기반 검색·리랭킹 코드가 있습니다. Tool Calling, 응답 스트리밍, 메시지 큐 연동 범위와 STT/TTS 제공자는 설계 또는 연동 단계로 구분해 기록합니다. 팀 구성, 프로젝트 기간, 개인 담당 역할은 확인되는 대로 보완할 예정입니다.

## 개발 기록
{: #development }

<div class="travelmate-article-grid">
  <article>
    <span>01 / ARCHITECTURE</span>
    <h3><a href="{{ '/projects/travelmate/architecture/ai-spring-responsibilities/' | relative_url }}">AI 서버와 Spring 서버의 역할 분리</a></h3>
    <p>두 번의 HTTP 왕복, 공유 DB, CQRS를 비교해 장소 검색의 데이터 소유권을 나누고, 메시지 큐가 더한 지연 비용을 측정했습니다.</p>
    <a class="travelmate-article-grid__link" href="{{ '/projects/travelmate/architecture/ai-spring-responsibilities/' | relative_url }}">글 읽기 <span aria-hidden="true">→</span></a>
  </article>
  <article>
    <span>02 / EVALUATION</span>
    <h3><a href="{{ '/projects/travelmate/evaluation/ragas-golden-dataset/' | relative_url }}">RAGAS 평가와 골든 데이터셋 구축</a></h3>
    <p>사람이 검수한 질문–장소 판정을 CSV로 만들고, RAGAS ID 지표의 한계를 확인해 순위 지표로 리랭킹 품질을 평가했습니다.</p>
    <a class="travelmate-article-grid__link" href="{{ '/projects/travelmate/evaluation/ragas-golden-dataset/' | relative_url }}">글 읽기 <span aria-hidden="true">→</span></a>
  </article>
  <article>
    <span>03 / EVALUATION</span>
    <h3><a href="{{ '/projects/travelmate/evaluation/reranking-performance/' | relative_url }}">리랭킹 성능 개선</a></h3>
    <p>LangSmith로 느린 구간을 찾고, 배치 크기와 FP16 autocast를 비교해 리랭커 연산 시간을 평균 7.35초에서 0.52초로 줄였습니다.</p>
    <a class="travelmate-article-grid__link" href="{{ '/projects/travelmate/evaluation/reranking-performance/' | relative_url }}">글 읽기 <span aria-hidden="true">→</span></a>
  </article>
</div>

### 검색 평가와 리랭킹 개선 결과

리랭킹은 골든 데이터셋 60문항에서 Top-1 정확도를 83.3%에서 88.3%로, NDCG@10을 0.850에서 0.907로 높였습니다. 처음에는 리랭킹 검색이 8초 넘게 걸려, 리랭커의 배치 크기와 연산 정밀도를 바꿔 시간을 줄였습니다.

| 리랭킹 검색 · 80건 | 개선 전 | 개선 후 |
| --- | ---: | ---: |
| 리랭커 연산 평균 | 7.347초 | 0.524초 |
| 검색 API 평균 응답 | 8.398초 | 1.607초 |
| 검색 API p95 응답 | 28.682초 | 2.015초 |

개선 후 리랭킹 검색은 의미 검색만 쓸 때(평균 1.011초)보다 약 0.6초 더 걸립니다. 2026년 10월 26일 로컬 검색 API에서 측정했습니다. 평가 방법은 [RAGAS 평가와 골든 데이터셋 구축]({{ '/projects/travelmate/evaluation/ragas-golden-dataset/' | relative_url }})에, 개선 과정은 [리랭킹 성능 개선]({{ '/projects/travelmate/evaluation/reranking-performance/' | relative_url }})에 정리했습니다.
