---
layout: game-project
title: 젤다의 전설(야생의 숨결)
order: 5
game_order: 4
game_portfolio: true
team_project: true
category: 게임 개발
project_type: 6인 협업 프로젝트
summary: 6인 DirectX 프로젝트에서 톤매핑·SSAO·캐스케이드 그림자와 라이넬·가논 보스 전투를 담당했다.
cover_image: /assets/images/projects/zelda-breath-of-the-wild/project-cover.jpg
cover_alt: 젤다의 전설 야생의 숨결 원작 표지 이미지
status: 구현 기록
period: 입력 예정
role: 셰이더와 렌더링 효과, 보스 몬스터 2종, 셰이더 설정 도구
team: 6인 협업
stack: C++, DirectX, HLSL, ImGui, JSON
domains:
- 게임
technologies:
- C++
- DirectX
- HLSL
tags:
- 게임
- DirectX
- C++
- HLSL
- 렌더링
nav_context: GAME PORTFOLIO / ZELDA
game_slug: zelda-breath-of-the-wild
hero_image: /assets/images/projects/zelda-breath-of-the-wild/ssao-result-01.png
hero_alt: 젤다 프로젝트에서 SSAO 적용 전후와 차폐 마스크를 비교한 화면
hero_caption: 지형 장면의 SSAO 적용 비교
topics:
- id: lighting
  name: 화면의 밝기와 음영
  description: 평균 휘도 기반 톤매핑과 깊이·노멀 버퍼를 이용한 SSAO를 기록했다.
- id: shadow
  name: 그림자
  description: 카메라 거리별로 그림자 영역과 해상도를 나눴다.
- id: combat
  name: 보스 전투
  description: 내부 도메인 풀링, 가논의 벽·천장 회전, 라이넬의 소켓 전환과 기절·후속 공격을 다뤘다.
---

## 프로젝트 소개 {#overview}

6명이 함께 만든 DirectX 기반 게임 프로젝트다. 내가 맡은 범위는 조명·그림자 표현과 보스 몬스터 두 마리다. 화면이 너무 밝거나 어두워지는 문제에는 평균 휘도를 이용한 톤매핑을 적용했다. 물체가 맞닿는 영역의 음영은 SSAO로 계산했고, 넓은 시야의 그림자는 카메라 거리별로 나눠 처리했다.

셰이더 값은 ImGui 도구에서 조정하고 장면별 JSON에 저장했다. 전투 영역에서는 라이넬과 가논의 상태 흐름, 공격 오브젝트와 풀링을 구현했다.

## 담당 구현 {#contribution}

- **렌더링:** 컴퓨트 셰이더의 평균 휘도 축소, Yxy 기반 톤매핑, SSAO 샘플·깊이 비교, 캐스케이드 그림자.
- **도구와 데이터:** ImGui 셰이더 설정 도구, 장면별 JSON 매개변수 저장, 물 셰이더.
- **보스 전투:** 라이넬·가논의 상태 전환과 공격 구성, 공격 오브젝트의 내부 도메인 풀링, 가논의 벽·천장 행렬 회전, 라이넬의 소켓 전환·기절·2페이즈 후속 공격.

## 구현 장면

![SSAO 적용 전후와 차폐 마스크를 비교한 지형 화면]({{ '/assets/images/projects/zelda-breath-of-the-wild/ssao-result-02.png' | relative_url }})

깊이와 노멀 렌더 타깃에서 픽셀의 뷰 공간 정보를 복원하고 반구 샘플을 비교해 접촉부의 음영을 계산한다.

{% include game-video-embed.html id="Q9VEHbAQBt0" title="톤매핑 적용 영상" %}

톤매핑에서는 화면의 평균 휘도를 컴퓨트 셰이더로 축소하고 Yxy 휘도에 톤 커브를 적용한다.

![가논 벽 전환 영상의 플레이 화면]({{ '/assets/images/projects/zelda-breath-of-the-wild/ganon-wall-transition-poster.jpg' | relative_url }})

라이넬과 가논의 상태 전환과 공격 오브젝트 재사용은 [보스 전투 구현 목록]({{ '/projects/zelda-breath-of-the-wild/details/combat/' | relative_url }})에서 이어진다.

기술 글에서는 화면 결과에 이르기까지 어떤 버퍼를 만들고 어떤 순서로 계산했는지, 보스 상태와 공격 객체를 어떻게 연결했는지를 주제별로 정리했다.
