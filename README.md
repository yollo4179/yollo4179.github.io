# yollo4179.github.io

GitHub Pages와 Jekyll로 배포하는 Markdown 기반 포트폴리오입니다.

## 프로젝트 글 작성

`_projects/`에 Markdown 파일을 추가하면 홈의 프로젝트 카드와 태그 필터에 자동으로 반영됩니다.

```yaml
---
title: 프로젝트 제목
order: 2
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

## 증빙 이미지 교체

SSAFY 공통 프로젝트에는 다음 더미 이미지가 들어 있습니다.

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
