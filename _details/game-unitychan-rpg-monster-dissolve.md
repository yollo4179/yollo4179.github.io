---
layout: game-article
title: Shader Graph 디졸브와 C# 제어
project_slug: unitychan-rpg
game_portfolio: true
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

## 노이즈로 표시 영역 구성

Shader Graph에서 노이즈와 `SplitValue`를 비교해 모델의 표시 영역을 만든다. `SplitValue - GlowOffset`을 두 번째 기준으로 사용하고 두 임계값 사이의 영역에 발광 색을 적용한다. `SplitValue`는 드러나는 범위, `GlowOffset`은 발광 경계의 폭을 조절한다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/monster-dissolve-shader.png' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/monster-dissolve-shader.png' | relative_url }}" alt="노이즈와 SplitValue·GlowOffset을 연결한 몬스터 디졸브 Shader Graph" loading="lazy"></a>
  <figcaption>표시 영역과 발광 경계를 구성한 Shader Graph</figcaption>
</figure>

## 디렉터리와 실행 흐름

```text
Assets/04.Scripts/
└─ Shaders/ShaderEffects.cs
```

```text
노이즈·SplitValue → 표시 영역
노이즈·SplitValue·GlowOffset → 발광 경계
DoFade → iTween → TweenOnUpdate → 머티리얼의 SplitValue
```

## 렌더러별 머티리얼 전환

`ShaderEffects`는 자식 Renderer 목록과 원본·페이즈·디졸브 Material 배열을 가진다. `SetNowMarerial`은 `eShaderEffect`에 따라 각 렌더러에 사용할 머티리얼을 지정한다. 파티클처럼 Poolable에 속한 렌더러는 해당 전환에서 건너뛴다.

## C#에서 임계값 보간

`DoFade`는 시작값, 종료값, 시간과 페이드 모드를 받는다. iTween의 `ValueTo`에 이 값을 넘기고 `easeInCubic` 보간을 사용한다. 갱신 콜백은 `TweenOnUpdate`, 완료 콜백은 `TweenOnComplete`로 연결한다.

`Assets/04.Scripts/Shaders/ShaderEffects.cs` 발췌

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

매 갱신에서 모든 대상 렌더러의 `_SplitValue`를 같은 값으로 설정한다. 이 값이 Shader Graph의 임계값에 전달되면서 표시 영역이 시간에 따라 변한다.

`Assets/04.Scripts/Shaders/ShaderEffects.cs` 발췌

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

`TweenOnComplete`는 `_isFadeEffectDone`을 켠다. 페이즈 효과의 완료 값은 -0.5로 설정하고 `FADE_IN`이면 원본 머티리얼 배열을 다시 적용한다. 시작·종료 값과 모드에 따라 같은 컴포넌트로 등장과 퇴장 연출을 실행한다.
