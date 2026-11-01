---
layout: travelmate-article
title: AI 서버와 Spring 서버의 역할 분리
summary: 검색 한 번에 AI 서버를 두 번 호출하던 구조에서 벗어나, Spring과 AI 서버의 역할을 나눈 과정을 정리했습니다.
travelmate_styles: true
asset_version: '20261102-1'
theme_color: '#eaf7ff'
nav_context: TRAVELMATE / ARCHITECTURE 01
footer_label: TRAVELMATE / DEVELOPMENT RECORD
article_kicker: ARCHITECTURE 01
toc_items:
  - id: http-roundtrip
    title: 두 번의 HTTP 왕복
  - id: shared-database
    title: 공유 DB안
  - id: cqrs
    title: CQRS와 데이터 소유권
  - id: tradeoff
    title: 메시지 큐의 비용
---

## 검색 한 번에 AI 서버를 두 번 호출했다
{: #http-roundtrip }

처음에는 Spring 서버가 검색을 맡았다. 사용자 질의를 AI 서버에 보내 임베딩을 받고, Spring DB에서 의미가 가까운 장소 Top K를 찾았다. 리랭킹이 필요하면 후보 장소를 AI 서버에 다시 보냈다.

<pre><code class="language-mermaid">
sequenceDiagram
    autonumber
    participant U as 사용자
    participant S as Spring 서버
    participant A as AI 서버
    participant D as Spring DB
    U->>S: 장소 검색 질의
    S->>A: 질의 임베딩 요청
    A-->>S: 질의 벡터
    S->>D: pgvector Top K 검색
    D-->>S: 후보 장소
    S->>A: 질의와 후보 텍스트 리랭킹 요청
    A-->>S: 재정렬 점수
    S-->>U: 최종 검색 결과
</code></pre>

<span class="notice-yellow">검색 한 번에 Spring과 AI 서버가 HTTP로 두 번 왕복하는 구조였다.</span> 특히 두 번째 호출에는 후보 장소의 텍스트까지 다시 실어 보내야 했다. 요청이 늘수록 같은 검색을 이어 가기 위해 네트워크 자원과 응답 대기 시간을 반복해서 쓴다. 이 불필요한 왕복을 줄이려고 임베딩·의미 검색·리랭킹을 AI 서버 한곳에서 처리하는 방향으로 바꿨다.

## AI 서버가 같은 DB를 직접 읽는다면?
{: #shared-database }

먼저 AI 서버가 Spring DB를 직접 읽는 방법을 생각했다. Spring이 검색 요청을 한 번만 보내면 AI 서버가 같은 DB에서 Top K 후보를 찾고 리랭킹까지 끝낼 수 있다. 장소 데이터의 변경은 계속 Spring이 맡는다.

<pre><code class="language-mermaid">
flowchart LR
    U([사용자 질의]) --> S[Spring 서버]
    S -->|검색 요청 1회| A[[AI 서버 검색 파이프라인]]
    S -->|장소 변경| D[(공유 PostgreSQL)]
    A -->|임베딩을 읽어 Top K 조회| D
    A -->|검색 결과| S
</code></pre>

AI 서버는 읽기만 하므로 검색을 직렬화하거나 테이블 전체를 잠글 필요는 없다. PostgreSQL은 MVCC로 각 쿼리에 일관된 읽기 결과를 제공한다. 문제는 두 서버가 같은 DB의 자원을 함께 쓴다는 데 있다.

공유 DB에서 걱정한 부분은 세 가지였다.

1. DB 성능: AI 서버가 임베딩 작업으로 장소 데이터를 많이 읽거나 검색 요청이 몰리면 Spring의 조회·변경 작업과 CPU·메모리·디스크 I/O를 나눠 써야 한다. DB 연결 수도 한정되어 있어 한쪽의 연결 점유가 다른 쪽의 응답을 늦출 수 있다.
2. 장애 전파: 공유 DB가 멈추면 두 서버의 DB 의존 기능이 함께 멈춘다.
3. 네트워크와 I/O: AI 서버가 대량의 장소 텍스트를 읽는 작업은 DB의 읽기 I/O와 DB→AI 네트워크 대역폭을 사용한다.

AI 서버가 Spring의 테이블 구조에 직접 묶이는 점도 걸렸다. 검색 부하를 분리하고 AI 서버가 검색용 데이터를 따로 관리하도록 DB를 나누기로 했다.

## CQRS로 원본과 검색 모델 분리
{: #cqrs }

Spring 서버는 장소 원본의 생성·수정·삭제를 맡고, AI 서버는 검색에 필요한 데이터를 별도 DB에 둔다. Spring이 장소를 바꾸면 변경 이벤트를 Outbox에 기록해 Kafka로 보낸다. AI 서버는 장소 ID와 버전을 확인하고 자기 DB의 <span class="notice-yellow">place_embeddings</span>를 갱신한다.

검색도 Spring이 Kafka로 요청한다. AI 서버는 질의 임베딩부터 Top K 의미 검색, 리랭킹까지 처리하고 결과를 돌려준다. Spring은 결과를 받아 사용자에게 응답한다.

<pre><code class="language-mermaid">
flowchart LR
    U([사용자]) -->|검색 요청| S[Spring 서버]
    S -->|장소 원본과 Outbox| W[(Spring DB)]
    W -->|미발행 이벤트| E([Spring Outbox 발행기])
    E -->|장소 변경 및 추천 요청| K{Kafka}
    K -->|장소 변경 이벤트| A([AI 워커])
    A -->|ID와 버전으로 임베딩 갱신| R[(AI 검색 DB)]
    K -->|추천 요청 이벤트| A
    A -->|질의 임베딩과 Top K| R
    R -->|Top K 후보| P[[AI 워커의 리랭킹]]
    P -->|결과 Outbox 기록| R
    R -->|미발행 결과| O([AI 결과 발행기])
    O -->|결과 이벤트| K
    K -->|결과 수신| S
    S -->|검색 결과 응답| U
</code></pre>

| 책임 | Spring 서버 | AI 서버 |
| --- | --- | --- |
| 장소 데이터 | 원본 장소와 변경 규칙을 소유 | 장소 ID·버전 기반 검색용 복제본을 유지 |
| 검색 요청 | 요청 발행과 결과 응답 | 질의 임베딩, Top K 검색, 후보 리랭킹 |
| 저장소 | 장소 원본 DB와 Outbox·Inbox | <span class="notice-yellow">place_embeddings</span>와 검색 작업·결과 Outbox |

<span class="notice-yellow">이제 검색 후보를 Spring과 AI 서버 사이에 다시 보내지 않아도 된다.</span> 메시지 큐 통신에도 네트워크는 쓰이지만, 검색 계산을 AI 서버 안에서 끝내 반복 HTTP 호출을 줄였다. 두 DB가 장소 데이터를 즉시 똑같이 갖는 것은 아니다. 변경 이벤트가 AI DB에 반영되기 전에는 이전 장소 정보가 검색될 수 있고, 버전 확인으로 늦게 온 이벤트가 최신 임베딩을 덮지 못하게 한다.

## 메시지 큐가 남긴 비용
{: #tradeoff }

구조를 바꾼 뒤 2026년 10월 26일 로컬 Docker 환경에서 의미 검색 요청 80개를 보내고, LangSmith span으로 구간별 시간을 확인했다. 아래 단계는 위 단계 안에 포함된 시간이다.

| 의미 검색 요청 · 80건 | 평균 | p95 |
| --- | ---: | ---: |
| 검색 요청 전체 | 1.008초 | 1.511초 |
| Spring ↔ AI 서버 Kafka 왕복 | 0.992초 | 1.497초 |
| └ AI 워커 대기열 | 0.134초 | 0.251초 |
| └ 처리 파이프라인(질의 임베딩·pgvector 검색) | 0.046초 | 0.068초 |

검색 계산은 0.05초도 걸리지 않았지만 요청 전체는 약 1초였다. 대부분이 Spring과 AI 서버 사이에서 메시지를 전달하고 기다리는 시간이었다. 후보 텍스트를 다시 보내는 HTTP 왕복은 없앴지만, 대신 요청 이벤트와 결과 이벤트가 메시지 큐를 한 번씩 거치는 비용이 생겼다.

이 구조로 얻은 것은 데이터 소유권과 부하의 분리다. Spring DB는 검색 부하에서 벗어났고, 장소 변경은 Outbox와 버전 확인을 거쳐 AI 검색 DB에 반영된다. 장소 변경 동기화처럼 즉시 응답할 필요가 없는 흐름에는 메시지 큐가 잘 맞는다.

반면 검색은 사용자가 결과를 기다리는 요청이다. 사용자 수가 적고 빠른 응답이 중요한 상황이라면 검색 요청은 Kafka 대신 gRPC로 직접 호출할 수 있다. 검색 안에서 가장 오래 걸리던 리랭커 연산을 줄인 과정은 [리랭킹 성능 개선]({{ '/projects/travelmate/evaluation/reranking-performance/' | relative_url }})에 정리했다.
