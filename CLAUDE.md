# CLAUDE.md

이 저장소에서 작업할 때는 먼저 `AGENTS.md`를 따른다. 이 문서는 그 위에 추가되는, 실제로 반복됐던 실수를 막기 위한 규칙이다.

## SSketch 테마

- 배경·로고·색상은 실제 게임 사이트(https://ssketch.ddns.net/)와 `assets/images/projects/ssketch/logo-day.png`, `logo-night.png`, `bg-day.jpg`, `bg-night.jpg`를 기준으로 맞춘다. 근거 없이 색을 지어내지 않는다.
- 실제 브랜드 색은 `assets/css/ssketch.css`의 `--ssketch-red`(#c84637), `--ssketch-gold`(#e2a62e), `--ssketch-blue`(#234b77), `--ssketch-night`(#101b31), 배경 톤 `#f5ecd8` 계열이다.
- 히어로처럼 이미지가 겹치는 영역에 사진 배경과 기존 일러스트를 동시에 쌓지 않는다. 하나만 쓰거나 옅은 그라데이션으로 대체해 시각적으로 정리한다.
- 캡션·라벨 문구가 "발표 PPT"처럼 결과물을 가볍게 보이게 하는 표현이면, 포트폴리오 톤에 맞게 다듬는다.

## 레이아웃을 바꾼 뒤에는 반드시 화면으로 확인한다

CSS만 읽고 "될 것 같다"고 끝내지 않는다. 아래 순서로 실제 렌더링을 스크린샷으로 확인한다.

1. 로컬 서버 실행: `jekyll serve --port 4001` (반드시 `run_in_background`로 실행. `--detach` 옵션은 Windows에서 `fork()`를 지원하지 않아 실패한다.)
2. 헤드리스 캡처:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --screenshot="<png 경로>" --window-size=1440,1400 --hide-scrollbars "http://127.0.0.1:4001/<path>/"
   ```
3. 찍힌 png를 Read 도구로 열어 직접 눈으로 확인한 뒤에 완료를 보고한다.

## 블로그 글 작성

- Claude/AI가 글을 쓰거나 편집했다는 언급을 어떤 형태로도 넣지 않는다 (AGENTS.md 23번과 동일한 원칙의 재강조 — 이 블로그는 채용 포트폴리오다).
- 독자는 이 프로젝트를 처음 보는 사람(채용 담당자·면접관)이다. 각 글은 다른 글을 안 읽어도 이해돼야 한다.
- "실제 코드에 있는 이름이라서 괜찮다"는 이유로 `RejectedStale`, `LastResolvedInputTick`, `datagram`, `deadline` 같은 용어를 설명 없이 쓰지 않는다.
- 단, 본문 문장마다 괄호로 풀이를 끼워 넣지 않는다(가독성이 망가진다). 대신 각 글 상단 요약 박스 바로 아래에 **용어 정리 표**(`| 용어 | 뜻 |`)를 두고, 그 글에 나오는 용어를 거기서 한 번에 설명한다. 본문은 깔끔하게 유지한다.
- 원본 자료(다운로드한 Notion export, `S15P21D204/Server/docs/troubleshooting/`, 분석 노트북)에 있는 실제 문장과 수치를 최대한 그대로 살린다. 임의로 종합·재해석한 문장으로 바꿔 쓰지 않는다.
- 확인되지 않은 주장이나 수치는 게시 원고에 넣지 않고 `docs/blog-verification-notes.md`에 남긴다.
- 이미지·영상을 추가하기 전에 실제 내용(장면, 수치, 차트)이 본문과 맞는지 프레임 추출이나 직접 열람으로 확인한다. 파일명만 보고 추측해 쓰지 않는다.
