---
layout: game-article
title: Shader Graph 디졸브와 C# 제어
project_slug: unitychan-rpg
game_portfolio: true
article_toc: true
game_order: 12
topic: 데이터와 표현
summary: 노이즈 임계값과 발광 경계를 구성하고 C#에서 SplitValue를 보간해 등장과 퇴장을 표현했다.
tags:
- Shader Graph
- 디졸브
- 렌더링
permalink: /projects/unitychan-rpg/technical/monster-dissolve/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 디졸브의 목적과 노이즈 임계값

몬스터의 등장과 퇴장을 모델 전체의 순간적인 표시 전환 대신 표면이 점차 드러나고 사라지는 변화로 표현한다. 셰이더는 표면의 노이즈 값과 임계값을 비교해 표시할 영역을 결정한다. C#이 시간에 따라 임계값을 바꾸면 노이즈 무늬를 따라 표시 경계가 이동하며, 경계에는 발광 색을 적용한다.

## 노이즈로 표시 영역 구성

Shader Graph에서 노이즈와 <span class="notice-yellow">SplitValue</span>를 비교해 모델의 표시 영역을 만든다. <span class="notice-yellow">SplitValue - GlowOffset</span>을 두 번째 기준으로 사용하고 두 임계값 사이의 영역에 발광 색을 적용한다. <span class="notice-yellow">SplitValue</span>는 드러나는 범위, <span class="notice-yellow">GlowOffset</span>은 발광 경계의 폭을 조절한다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/monster-dissolve-shader.png' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/monster-dissolve-shader.png' | relative_url }}" alt="노이즈와 SplitValue·GlowOffset을 연결한 몬스터 디졸브 Shader Graph" loading="lazy"></a>
  <figcaption>표시 영역과 발광 경계를 구성한 Shader Graph</figcaption>
</figure>

## 구현 순서와 역할

```text
노이즈·SplitValue → 표시 영역
노이즈·SplitValue·GlowOffset → 발광 경계
DoFade → iTween → TweenOnUpdate → 머티리얼의 SplitValue
```

## 렌더러별 머티리얼 전환

<span class="notice-yellow">ShaderEffects</span>는 자식 Renderer 목록과 원본·페이즈·디졸브 Material 배열을 가진다. <span class="notice-yellow">SetNowMarerial</span>은 <span class="notice-yellow">eShaderEffect</span>에 따라 각 렌더러에 사용할 머티리얼을 지정한다. 파티클처럼 Poolable에 속한 렌더러는 해당 전환에서 건너뛴다.

## C#에서 임계값 보간

<span class="notice-yellow">DoFade</span>는 시작값, 종료값, 시간과 페이드 모드를 받는다. iTween의 <span class="notice-yellow">ValueTo</span>에 이 값을 넘기고 <span class="notice-yellow">easeInCubic</span> 보간을 사용한다. 갱신 콜백은 <span class="notice-yellow">TweenOnUpdate</span>, 완료 콜백은 <span class="notice-yellow">TweenOnComplete</span>로 연결한다.

```csharp
public  void DoFade(float from, float to , float time, eFadeMode fadeMode=eFadeMode.FADE_OUT)
{
    foreach (var renderer in _renderers)
    {
        string name = renderer.material.shader.name;
        bool bo = renderer.material.HasProperty(_splitValueHash);
        _fadeMode = fadeMode;
        _isFadeEffectDone = false;
        iTween.ValueTo(gameObject, iTween.Hash(
            "from", from, "to", to, "time", time, "onupdatetarget", gameObject,
            "onupdate", "TweenOnUpdate", "oncomplete", "TweenOnComplete",
            "easetype", iTween.EaseType.easeInCubic
            ));
    }
}
```

매 갱신에서 모든 대상 렌더러의 <span class="notice-yellow">_SplitValue</span>를 같은 값으로 설정한다. 이 값이 Shader Graph의 임계값에 전달되면서 표시 영역이 시간에 따라 변한다.

```csharp
public void TweenOnUpdate(float value)
{
    foreach (var renderer in _renderers)
    {
        renderer.material.SetFloat("_SplitValue", value);
    }
}
```

## 연출 완료 처리

<span class="notice-yellow">TweenOnComplete</span>는 <span class="notice-yellow">_isFadeEffectDone</span>을 켠다. 페이즈 효과의 완료 값은 -0.5로 설정하고 <span class="notice-yellow">FADE_IN</span>이면 원본 머티리얼 배열을 다시 적용한다. 시작·종료 값과 모드에 따라 같은 컴포넌트로 등장과 퇴장 연출을 실행한다.

등장 연출이 끝나면 디졸브 머티리얼을 계속 유지하지 않고 렌더러별로 보관한 원본 머티리얼을 적용한다.

```csharp
case eFadeMode.FADE_IN:
{
    for(int i=0;i< _renderers.Length;++i)
    {
        _renderers[i].material=_materialOrigin[i];
    }
    break;
}
```

## 디졸브 제어 결과

ShaderEffects가 렌더러의 머티리얼을 전환하고 SplitValue를 보간해 표시 영역을 변경한다. 연출 완료 콜백은 완료 상태를 기록하며, FADE_IN에서는 원본 머티리얼로 복원한다.
