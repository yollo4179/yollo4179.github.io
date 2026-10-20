---
layout: game-article
title: 현재 자세에서 다음 애니메이션으로 전환하기
project_slug: gunfire-reborn
game_portfolio: true
article_toc: true
game_order: 10
topic: 애니메이션과 리소스
summary: 진행 중인 동작을 끝 프레임으로 되돌리지 않고 현재 뼈 자세를 새 보간의 시작점으로 사용한다.
tags:
- 애니메이션
- 보간
- 상태
permalink: /projects/gunfire-reborn/technical/animation-transition/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 애니메이션 전환의 목적과 현재 자세 보간

동작을 바꾸는 순간 뼈의 자세가 갑자기 달라지는 현상을 줄이기 위해, 전환 시점의 자세에서 목표 자세까지 보간한다. 뼈의 로컬 변환을 크기·회전·이동으로 나누고 크기와 이동은 선형 보간, 쿼터니언 회전은 구면 선형 보간을 적용한다. 전환 도중 다른 동작을 선택해도 보간 중인 자세를 새 시작점으로 사용한다.

## 구현 순서와 역할

전환 시점 자세 저장 → 목표 키프레임 준비 → 뼈별 SRT 보간 → 로컬 행렬 갱신.

## 전환 시작 자세 보관

<span class="notice-yellow">Store_CurrentAnim_KeyFrame_State()</span>는 전환을 시작하는 시점의 채널 값을 뼈 인덱스로 보관한다. 이미 전환 중이면 보간 중인 자세에서 다시 시작 키를 구성한다. 목표 애니메이션의 키와 같은 뼈 인덱스로 연결해 자세를 전환한다.

{% include game-media-gallery.html slug="gunfire-reborn" summary="뼈 채널과 전환 시작 자세" items="animation-structure.png|모델·애니메이션·채널·키 프레임 구조;animation-interpolation-01.png|목표 애니메이션 설정 코드;animation-interpolation-02.png|공통 뼈 채널의 시작 키 프레임 보관;animation-interpolation-03.png|진행 중인 애니메이션의 현재 키 프레임 취득" %}

## 이동·크기는 Lerp, 회전은 Slerp

트랙 위치와 전환 길이로 보간 비율을 구한다. 크기와 이동은 <span class="notice-yellow">XMVectorLerp()</span>, 쿼터니언 회전은 <span class="notice-yellow">XMQuaternionSlerp()</span>로 계산한다. 결과를 하나의 아핀 행렬로 조립해 뼈에 전달한다.

```cpp
_bool CAnimation::Update_TransformMatrix_ForMotionChange(const vector<class CBone*>& Bones, _uint iBoneIndex,KEYFRAME Start, KEYFRAME Last)
{
        if ((m_fCurrentTrackPosition - m_KeyFramePosOfStartAnim) > m_fDistance)
            return true;
        _float fRatio = (m_fCurrentTrackPosition - m_KeyFramePosOfStartAnim) / m_fDistance;
        _float3 vScale;
        _float3 vPosition;
        _float4 vRotation;
        _float3         vLeftScale, vRightScale;
        _float4         vLeftRotation, vRightRotation;
        _float3         vLeftPosition, vRightPosition;
        vLeftScale = Start.vScale;
        vLeftRotation = Start.vRotation;
        vLeftPosition = Start.vPosition;
        vRightScale = Last.vScale;
        vRightRotation = Last.vRotation;
        vRightPosition = Last.vPosition;
        XMStoreFloat3(&vScale, XMVectorLerp(XMLoadFloat3(&vLeftScale), XMLoadFloat3(&vRightScale), fRatio));
        XMStoreFloat4(&vRotation, XMQuaternionSlerp(XMLoadFloat4(&vLeftRotation), XMLoadFloat4(&vRightRotation), fRatio));
        XMStoreFloat3(&vPosition, XMVectorLerp(XMLoadFloat3(&vLeftPosition), XMLoadFloat3(&vRightPosition), fRatio));
        Bones[iBoneIndex]->Set_TransformationMatrix(XMMatrixAffineTransformation(XMLoadFloat3(&vScale), XMVectorSet(0.f, 0.f, 0.f, 1.f), XMLoadFloat4(&vRotation), XMVectorSetW(XMLoadFloat3(&vPosition), 1.f)));
        return false;
}
```

{% include game-media-gallery.html slug="gunfire-reborn" summary="전환 시간과 뼈별 변환" items="animation-interpolation-04.png|전환 중 트랙 위치 갱신과 뼈별 변환 함수 호출" %}

## 애니메이션 전환 결과

무기 동작이 바뀔 때 현재 자세를 시작점으로 삼아 다음 동작으로 연결한다. 뼈별로 보간한 크기·회전·이동을 변환 행렬로 조립해 모델의 자세에 반영한다.

{% include game-local-video.html slug="gunfire-reborn" file="animation-transition" title="무기 동작이 이어지는 애니메이션 전환 시연" %}
