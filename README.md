# yollo4179.github.io

GitHub Pages와 Jekyll로 배포하는 Markdown 기반 포트폴리오입니다.

## 프로젝트 글 작성

`_projects/`에 Markdown 파일을 추가하면 `/projects/`의 팀 프로젝트 목록과 태그 필터에 자동으로 반영됩니다.

```yaml
---
title: 프로젝트 제목
order: 2
team_project: true
category: SSAFY
project_type: 특화 프로젝트
summary: 프로젝트를 설명하는 한두 문장
status: 기록 정리 중
period: 입력 예정
role: 입력 예정
team: 입력 예정
stack: 입력 예정
tags:
  - SSAFY
  - 팀 프로젝트
nav_context: SSAFY / SPECIAL PROJECT
---

## 프로젝트 개요

Markdown으로 본문을 작성합니다.
```

공통 문구와 메뉴는 `_data/site.yml`, 공통 화면은 `_includes/`와 `_layouts/`에서 관리합니다. 프로젝트 이미지는 `assets/images/projects/{slug}/`에 둡니다.

## 길봄 상세 기록 구조

길봄은 프로젝트 공통 내용과 상세 기록을 다음 세 카테고리로 나눕니다.

```text
/projects/gilbom/                              공통 프로젝트 개요
├─ /projects/gilbom/details/                   전체 상세 기록
├─ /projects/gilbom/troubleshooting/           트러블슈팅
│  ├─ 01-mqtt-latency-replay/                  MQTT 지연·중복·Replay
│  ├─ 02-command-roundtrip/                    Command 정상·비정상 왕복
│  ├─ 10-patrol-area-coordinate-overlay/       순찰 구역 좌표·Overlay
│  └─ 11-mission-lifecycle-consistency/        Mission 상태 정합성
├─ /projects/gilbom/performance/               성능 향상
│  ├─ 03-mission-map-flicker/                  Mission 지도 플리커링
│  └─ 08-telemetry-statistics-refresh/         Telemetry 통계 갱신
└─ /projects/gilbom/maintainability/           유지보수,확장성
   ├─ 04-mqtt-tls-mtls-strategy/               TLS·mTLS 전략 분리
   ├─ 05-mqtt-v2-contract-gate/                MQTT v2 계약 Gate
   ├─ 06-image-session-isolation/               이미지 요청·관리자 Session 분리
   ├─ 09-robot-credential-lifecycle/           Robot Credential 수명주기
   └─ 12-flyway-ci-contract-recovery/          Flyway·CI 계약 복구
```

개별 글은 `_details/`에서 관리하고 `_layouts/detail.html`을 공유합니다. 카테고리
표시와 링크는 `_data/detail_categories.yml`에서 관리합니다. 새 상세 글을 추가할 때는
`detail_category`, `category_slug`, `category_url`, `permalink`, `order`, `number`,
`domain`, `summary`, `verified_at`, `validation_scope`, `result_label`, `tags`를 front
matter에 기록합니다.
검증 결과는 실행 시점과 환경을 함께 적고, 과거 결과를 현재 HEAD 통과 결과로
표현하지 않습니다.

## 역할 B 원본 반영 기준

`I15D101T/TROUBLESHOOTING` 9개와 `I15D101T/CHANGLOGS` 78개를 역할 B 범위로
대조합니다. 같은 종단 흐름의 연속 변경 로그는 하나의 디테일에 통합하고, 각 공개
디테일의 `근거 문서` 절에 사용한 원본을 기록합니다.

| 디테일 | 역할 B 원본 범위 |
| --- | --- |
| 01 | MQTT TTL·Replay·Broker 통합 검증 |
| 02 | Command UI·정상·비정상·재연결·보안 왕복 |
| 03 | Mission Map·SVG·Drag·Zoom·실시간 재투영 |
| 04 | MQTT TLS·mTLS 전략·Mosquitto Topic ACL |
| 05 | MQTT v2 계약·Schema·Fixture·Jetson 통합 가이드 |
| 06 | 이미지 인증 체인·관리자 Session 격리·Nginx Cookie 경계 |
| 08 | Telemetry 기간 통계·SSE 갱신·Recharts |
| 09 | Robot 등록·Credential·Registry·통합 Provisioning |
| 10 | Patrol Area 등록·Polygon·CSP·좌표·Marker |
| 11 | Mission 삭제·완료·취소·긴급정지·재배정 |
| 12 | Package·Flyway·Compose·CI·Release 계약 충돌 |

다음 원본은 공개 기술 디테일로 만들지 않습니다.

- `00_RoleB_QuantitativeEvidence.md`는 별도 사례가 아니라 여러 디테일의 수치 색인이므로 대응 글에 분산합니다.
- 문서 체계화, 문서 상태 동기화, 작업내용 갱신, Codex 빌드 산출물 Ignore, Windows `Zone.Identifier`, 팀 인수인계, Smart Commit 패키징, 증거 폴더 골격과 오래된 Backlog 제거는 공개 구현 설명에서 제외합니다.
- 이미지 저장·Incident 판정은 팀원 C 범위입니다. 역할 B 글에서는 Robot Credential이 이미지 업로드 접속값을 전달하는 Provisioning 경계까지만 설명합니다.

## 증빙 이미지 교체

`_projects/ssafy-common.md`는 실제 정보가 들어오기 전까지 `published: false`로
공개 빌드에서 제외한 작성 템플릿입니다. 다음 더미 이미지는 템플릿에서만
사용합니다.

| 파일 | 실제로 보여줄 자료 |
| --- | --- |
| `overview-placeholder.svg` | 서비스명과 핵심 기능이 함께 보이는 대표 화면 |
| `problem-placeholder.svg` | 인터뷰·설문 요약, 기존 사용자 여정과 불편 지점 |
| `contribution-placeholder.svg` | 담당 기능, 이슈·PR·설계 문서 등 개인 기여 근거 |
| `solution-placeholder.svg` | 시스템 구성도, 기술 선택 비교, 구현 전후 화면 |
| `result-placeholder.svg` | 테스트 결과, 성능 비교, 사용자 피드백과 개선 내용 |

실제 자료는 `assets/images/projects/ssafy-common/`에 저장하고 `_projects/ssafy-common.md`의 `image` 경로를 변경합니다. 동일한 파일명으로 교체하면 Markdown을 수정하지 않아도 됩니다. 권장 비율은 16:9이며 개인정보와 비밀 키는 반드시 가립니다.

## 배포

GitHub 저장소의 **Settings → Pages**에서 배포 소스를 **Deploy from a branch**, 브랜치를 `main`, 폴더를 `/(root)`로 설정합니다. 이후 커밋을 푸시하면 GitHub Pages가 Jekyll 사이트를 빌드합니다.

로컬 Jekyll 설치는 배포에 필수가 아닙니다. 로컬 미리보기가 필요한 경우에만 Ruby와 Jekyll 환경을 별도로 준비합니다.

## Mermaid 다이어그램

Markdown 파일에서 다음처럼 소문자 `mermaid` 언어 식별자를 사용합니다. 같은 fenced
code block을 GitHub는 직접 다이어그램으로 렌더링하고, Jekyll 사이트는
`assets/js/mermaid-loader.js`가 변환합니다.

````markdown
```mermaid
flowchart LR
    problem[문제] --> decision{판단}
    decision --> solution[해결]
```
````

브라우저 런타임은 `assets/vendor/mermaid/mermaid.min.js`에 고정한 Mermaid
11.16.1을 사용합니다. 라이선스는 같은 디렉터리의 `LICENSE`에 보존합니다.

## 편집 메모와 권고사항

이 문서는 `_config.yml`에서 공개 빌드 대상에서 제외됩니다. 블로그 정리 과정에서 생긴 권고와 운영 메모는 공개 글에 섞지 않고 여기에 남깁니다.

- 에이전트의 작업 완료 요약, 수정 파일 목록, 명령·로그와 임시 메모는 블로그 본문에 작성하지 않고 채팅에서만 보고합니다.
- 제목, 부제, 요약, 푸터 카피와 슬로건은 확인된 프로젝트 자료를 사용하며, 근거가 없는 선택 문구는 임의로 만들지 않고 생략합니다.
- 공개 글에는 프로젝트 독자가 이해해야 할 개발 과정과 검증 근거만 남깁니다. 로컬 Mock과 실제 환경, 과거 결과와 현재 HEAD의 차이는 과장 방지를 위한 근거이므로 생략하지 않습니다.
- 상세 글은 트러블슈팅, 성능 향상, 유지보수,확장성의 세 카테고리로 관리합니다. 이전 03·04 트러블슈팅 주소는 새 카테고리 주소로 이동시킵니다.
- 새 이미지가 필요한 위치는 `.detail-image-placeholder` 빈 박스로 두고, 박스 안에는 `필요한 화면: …` 한 줄만 작성합니다. 실제 이미지·더미 이미지·별도 캡션은 넣지 않습니다.

### SSketch 원본 자료와 8편 구성

2026-09-27 다운로드 폴더의 Notion 내보내기 Markdown 9개를 원본 자료로 사용한다. 기존 6편 본문은 보존하고 Room과 이벤트 전달을 독립 글로 구성한다.

| 원본 | 연결할 글 |
| --- | --- |
| doc1 · 호스트 권한 서버의 구조 | 01 · Host Authority |
| doc8 · IOCP 통신 서버 구조 | 02 · IOCP TCP·UDP, 작업 큐 설명은 03 |
| doc4 · Room구조 전반부 | 03 · Room 책임 분리와 JobQueue |
| doc4 · Room구조 후반부 | 04 · 이벤트 수신 어댑터와 클라이언트 발행·구독 |
| doc6 · 플레이어 동기화와 호스트틱 예약하기 | 05 · HostTick / InputTick |
| doc7 · 로컬 플레이어와 상대방의 애니메이션 처리 | 06 · Prediction / Reconciliation / Interpolation |
| doc2 · 문제 재정의와 개선방향, doc3 · INPUT_PACKET_CONSUMPTION_FALLBACK, doc9 · 호스트-서버 인풋 소비 요약 | 07 · 입력 deadline, Pre-Tick Pump, Diagnostics 비용 분석 |
| doc5 · 점프 fallback과 호스트의 입력 거절, doc3·doc9 점프 계측 | 08 · Jump Edge Event |

- 시리즈 분류는 Architecture, Refactoring, Synchronization, Troubleshooting이며 각각 2편이다.
- 서버 어댑터는 이벤트 수신 인터페이스 구현체다. `std::visit`의 타입별 분기와 클라이언트 메시지 버스의 구독 목록 호출을 구분한다.
- 클라이언트 방 서비스는 퇴장 시 방 상태를 비운다. 구독 일괄 해제는 서비스 정리 시 수행한다.
- 새 공개 원고에는 `아직 검증되지 않았다`와 같은 미검증 문구를 넣지 않는다.
