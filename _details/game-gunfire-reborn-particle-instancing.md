---
layout: game-article
title: 파티클을 인스턴스 버퍼로 묶기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 5
topic: 트레일과 화면 효과
summary: 파티클별 제어값을 인스턴스 데이터로 전달하고 기하 셰이더에서 쿼드를 생성한다.
tags:
- 파티클
- 인스턴싱
- HLSL
permalink: /projects/gunfire-reborn/technical/particle-instancing/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 문제와 구현

폭발과 총격 이펙트에는 위치와 수명이 다른 파티클이 여러 개 생긴다. 각 파티클에 별도 정점 버퍼와 그리기 요청을 주면 개수가 늘 때 CPU가 제출하는 작업도 늘어난다. 공통 렌더링 경로에 인스턴스별 상태를 싣는 구조를 선택했다.

파티클마다 객체와 드로우 콜을 따로 만들면 수가 늘수록 CPU의 그리기 요청도 늘어난다. 인스턴스 버퍼는 파티클별 위치와 제어값을 구조체 배열로 보관한다. 매 프레임 `Map`·`Unmap`으로 제어값을 갱신하고, 기하 셰이더는 각 인스턴스에서 쿼드를 생성해 월드·뷰·투영 변환을 적용한다. 중력처럼 시간에 따라 바뀌는 값도 인스턴스별로 갱신한다. 여러 파티클을 하나의 그리기 경로에서 처리하기 위한 구조다.

{% include game-media-gallery.html slug="gunfire-reborn" summary="파티클 인스턴싱 코드 이미지 4장" items="particle-instancing-01.png|인스턴스 제어 정보를 월드 공간으로 옮기는 코드;particle-instancing-02.png|정점을 클립 공간으로 보내는 코드;particle-instancing-03.png|기하 셰이더에서 파티클 쿼드 생성;particle-instancing-04.png|파티클에 중력을 적용하는 코드" %}

## 인스턴스 데이터의 흐름

CPU는 각 파티클의 위치와 시간에 따라 바뀌는 제어값을 배열에 담고 동적 인스턴스 버퍼를 갱신한다. 버텍스 단계는 인스턴스별 데이터를 받아 월드 공간의 기준점을 만들고, 기하 셰이더는 그 점에서 화면에 그릴 쿼드를 펼친다. 중력에 따라 달라진 값은 다음 프레임의 인스턴스 데이터에 반영한다.

이 구조에서는 여러 파티클의 상태를 한 인스턴스 버퍼로 전달하고 그리기 경로를 묶는다. 프레임 시간은 파티클 수와 셰이더 비용에도 영향을 받으므로 그리기 요청을 묶은 것만으로 성능 변화를 단정할 수 없다.


{% include game-local-video.html slug="gunfire-reborn" file="particle-instancing" title="보스 공격 구체가 사라지며 파티클로 흩어지는 장면" %}
