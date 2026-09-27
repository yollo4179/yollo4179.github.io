# 블로그 반영 대기 항목 (미확정)

이 파일은 `_details/` 블로그 글에 아직 반영하지 않은 제안·해석·자료를 모아둔다.
근거가 확인되기 전까지는 블로그 본문에 넣지 않는다.

## 상태 표시
- `[검증 필요]`: 사실 여부를 아직 repo/로그로 확인하지 못함
- `[출처 불명]`: 사용자가 전달했지만 원본 소스를 못 찾음
- `[확인됨 → 반영 대기]`: 근거는 찾았지만 아직 글에 넣지 않음

---

## 1. 대표 6편/8편 압축 제안 (외부 컨설턴트 의견)

사용자가 공유한 장문의 재구성 제안(9편 → 6편 통합, 제목 변경, 노출 순서 등)은
`_details/13~20` 구조를 크게 바꾸는 제안이라 별도 승인 없이 적용하지 않음.

- 제안: ②③⑤⑨류 중복 통합, ⑦ 제목을 "Prediction·Reconciliation·Interpolation 분리"로 변경 등
- 상태: `[검증 필요]` — 사용자 확인 후 별도 작업으로 진행할지 결정

## 2. Host FPS/VSync 관련 컨설턴트 주장

컨설턴트 텍스트는 "Unity 6 기본값은 VSyncCount=1, targetFrameRate=-1"이라는 가정 하에
검증을 요청했음.

- 실제 확인 결과: `Client/ProjectSettings/QualitySettings.asset`에 3개 품질 레벨 모두
  `vSyncCount: 0`으로 저장되어 있고, `SettingsValues.cs`의 `DisplayValues.vsync` 기본값도
  `false`. 즉 이 프로젝트는 Unity 기본값에 의존하지 않고 **명시적으로 VSync를 끄도록
  구성**되어 있음.
- 호스트는 추가로 `HostAuthorityWorldBridge.cs`의 `ApplyHostPerformanceMode()`에서
  `Application.runInBackground=true`, `QualitySettings.vSyncCount=0`,
  `Application.targetFrameRate = Mathf.Max(60, SimulationHz)`를 강제 설정함
  (`MinimumHostFrameRate = 60`, `SimulationHz`는 60으로 확인됨).
- 결론: 블로그 공용 include `_includes/ssketch-measurement-pc.html`에 이미 있는
  "목표 60 FPS · VSync OFF · 백그라운드 실행 유지" 문구는 **이미 정확하고 코드로 근거가
  있음**. 컨설턴트의 우려(Unity 기본값에 의존했을 것)는 이 프로젝트에는 해당하지 않음.
- 상태: `[확인됨 → 반영 대기]` — 수정 불필요. 다만 "왜 60인가/왜 VSync를 끄는가"를
  한 문단으로 보강할지는 별도 판단.

## 3. SettingsService.cs의 vSyncCount 적용 순서 버그 코멘트

`SettingsService.cs:309-312` 주석: "vSyncCount는 SetQualityLevel 이후에 걸어야 한다.
순서가 반대였을 때는 수직동기화를 켜도 항상 0으로 눌렸다 — 빌드 로그로 확인했다."

- 실제로 겪은 버그이고 빌드 로그로 검증까지 한 사례라 트러블슈팅 소재로 흥미로움.
- 다만 현재 어느 blog post에도 이 에피소드가 없음. 새로 추가할지는 사용자 확인 필요.
- 상태: `[확인됨 → 반영 대기]`

## 4. ASCII 파이프라인 다이어그램 (배치 전송 → Host Input Queue → Tick 소비) — 반영 완료

원본을 찾음: `S15P21D204/Server/docs/myblog-ssketch/sources/06.md`
("플레이어 동기화와 호스트틱 예약하기" 원본 Notion 문서, 다운로드 zip으로도 확보:
`플레이어 동기화와 호스트틱 예약하기(★) ....md`). 18-ssketch-host-input-tick.md의
기존 mermaid와 겹치지 않음(기존 것은 InputTick 계산식·단일 입력 경로만 다룸,
이 다이어그램은 여러 batch가 한 큐로 모였다가 tick별로 병렬 소비되는 그림이라
서로 보완적).

- "Host Input Queue" 라벨은 실제 클래스명이 아니라 코드의 네트워크 수신 큐
  (`InputBatches`, `PumpPlayerInputBatches()`)를 가리키므로, 다이어그램 원본은
  그대로 두고 바로 아래에 한 문장으로 교정 설명을 추가함.
- **적용 완료**: `_details/18-ssketch-host-input-tick.md`의 "60Hz 입력과 30Hz
  송신을 나눴다" 절에 삽입함.

## 5. 9개 원본 문서 ↔ 8개 블로그 파일 매핑 — 확인 완료

사용자가 다운로드 폴더의 Notion export zip 8개(오늘 날짜, 02:47~06:52 사이 생성)를
풀어 확인함. 외부 컨설턴트가 말한 "①~⑨"는 실제로 존재하는 9개 원본 Notion 문서였음:

| 컨설턴트 번호 | 원본 Notion 문서 | 대응 블로그 파일 |
| --- | --- | --- |
| ① | 호스트 권한 서버의 구조 | 19-ssketch-host-authority.md (일부만 반영, 무기 판정 TCP 표는 blog에 없음) |
| ② | 문제 재정의와 개선방향(fallback 로그 수치화) | 16-ssketch-input-deadline.md |
| ③ | NOTION_INPUT_PACKET_CONSUMPTION_FALLBACK | 16-ssketch-input-deadline.md, 17-ssketch-jump-edge.md에 분산 반영 |
| ④ | Room구조(책임과 역할의 분배 클래스 구조도) | 미반영 — blog에 없음. 컨설턴트도 "너무 길다(645줄)"고 지적한 문서 |
| ⑤ | (Jump fallback 전용 문서는 이번 export에 없었음) | 17-ssketch-jump-edge.md가 사실상 이 역할을 함 |
| ⑥ | 플레이어 동기화와 호스트틱 예약하기(★) | 18-ssketch-host-input-tick.md |
| ⑦ | 로컬 플레이어 애니메이션 처리와 상대방의 애니메이션 처리 | 15-ssketch-prediction-reconciliation.md — **blog 쪽 제목은 이미 컨설턴트가 권한 대로 수정되어 있음** (원본 Notion 제목은 아직 옛 제목) |
| ⑧ | IOCP 통신 서버 구조 | 20-ssketch-iocp-tcp-udp.md |
| ⑨ | 호스트-서버 인풋 소비 요약 | 16-ssketch-input-deadline.md에 흡수 |

**추가로 발견한 것**: `S15P21D204/Server/docs/myblog-ssketch/`에 `sources/`(원본),
`rewrite/`(블로그용 재작성 초안, 자리표시자 포함), `stage/_details/`,
`preview-source/_details/`, `applied-backup/_details/`, `apply_blog.py`,
`prepare_stage.py`가 있음 — **이 블로그 글들을 만든 실제 퍼블리싱 파이프라인**임.
`rewrite/04.md`에는 `<!-- SOURCE_TIMELINE -->` 자리표시자가 있었고, 이번에
myBlog `_details/18`에 채워 넣은 다이어그램이 정확히 그 자리를 채우는 내용이었음.

- **주의**: 이 파이프라인이 나중에 다시 실행되면(`apply_blog.py`) myBlog의
  `_details/*.md` 수정 사항이 덮어써질 수 있음. 사용자에게 이 사실을 알려야 함.

## 6. Post 13(방 동시 Join 테스트) 수치 — 근거 소스 소실

`64건/600건/10,000건 Join 요청` 결과의 원본 테스트 코드
(`DummyClient2/Test/Room/RoomJoinTest.cpp` 등)가 git 히스토리 전체에서 커밋된
적이 없음(컴파일러 중간 산출물 `.obj.dt.d.json`에만 경로 흔적이 남아 있음).
원본 로그나 재현 가능한 소스가 없어 이 수치를 다시 검증할 방법이 없음.

- 스크린샷(`concurrent-room-join-600.png`)은 존재하므로 완전히 근거가 없는 건
  아니지만, "재현 가능한 원본"은 아님.
- 블로그 문구 자체는 이미 "로컬 Windows · DummyClient2 · 단일 IOCP Dispatch
  서버" 범위로 조심스럽게 한정되어 있어 과장된 서술은 없음. 수정 불필요.
- 상태: `[확인됨 — 근거 소스 소실, 블로그 문구는 이미 안전하게 범위 한정됨]`

## 7. Post 17의 "호스트 확정이 수신 경계보다 1.6~12.2ms 앞섬" 수치

notebook의 원시 필드(`hostQueueWaitMs` 4.257~14.740ms 등)에서 파생 가능한
값이지만, 정확히 이 범위를 출력한 셀은 찾지 못함. 계산 자체는 근거 필드에서
나올 법한 값이라 오류로 의심되진 않지만, 원본 셀을 특정하지 못했음.

- 상태: `[검증 필요 — 낮은 우선순위]`
