/* ════════════════════════════════════════════════════════
   LIQUID GLASS LAYER (SYNC 리디자인 — 순수 추가 스크립트)
   - app.js 의 재생/검색/AndroidBridge 로직은 전혀 건드리지 않음.
   - 1) 검색 캡슐 / 하단 내비 캡슐의 SVG 굴절(displacement) 맵 생성
   - 2) 하단 내비 "Morphing Sliding Pill" 인디케이터 애니메이션
   참고 원리: convex squircle 표면 → 법선 → Snell 굴절 →
   R/G 채널에 정규화된 변위 벡터를 기록한 feImage → feDisplacementMap
   (Liquid_glass_kit.js 의 refractionProfile/makeMap 로직을 그대로 재사용)
════════════════════════════════════════════════════════ */
(function () {
    "use strict";

    const $ = (s, ctx) => (ctx || document).querySelector(s);

    /* ---------- 1. 굴절 맵 생성 (kit과 동일한 수학) ---------- */
    const convexSquircle = x => Math.pow(Math.max(0, 1 - Math.pow(1 - x, 4)), .25);

    function refractionProfile(bezel, thickness, n1, n2, samples, intensity) {
        bezel = bezel || 30; thickness = thickness || 1.0;
        n1 = n1 || 1; n2 = n2 || 1.5; samples = samples || 127;
        intensity = intensity || 1;
        const out = [];
        let max = 0;
        for (let i = 0; i < samples; i++) {
            const x = i / (samples - 1);
            const d = .001;
            const y1 = convexSquircle(Math.max(0, x - d));
            const y2 = convexSquircle(Math.min(1, x + d));
            const slope = (y2 - y1) / (Math.min(1, x + d) - Math.max(0, x - d) || 1);
            const nx = -slope, ny = 1;
            const len = Math.hypot(nx, ny) || 1;
            const ux = nx / len, uy = ny / len;
            const cosI = Math.max(-1, Math.min(1, uy));
            const sinI = Math.sqrt(Math.max(0, 1 - cosI * cosI));
            const ratio = n1 / n2;
            const sinT = Math.min(.999999, ratio * sinI);
            const cosT = Math.sqrt(Math.max(0, 1 - sinT * sinT));
            const tx = uy, ty = -ux;
            const sign = ux >= 0 ? 1 : -1;
            const rx = sign * sinT * tx + cosT * ux;
            const ry = sign * sinT * ty + cosT * uy;
            const dx = rx / Math.max(.05, Math.abs(ry)) * thickness;
            // intensity: 굴절 프로필 자체의 세기(맵 생성 단계)를 높인다 — 최종 SVG
            // scale(boost)과는 별개 축이라, 둘을 함께 올리면 훨씬 더 강하게 왜곡된다.
            const mag = Math.abs(dx) * bezel * .18 * intensity;
            out.push({ x: x, mag: mag });
            max = Math.max(max, mag);
        }
        return { out: out, max: max };
    }

    function makeMap(w, h, bezel, intensity, capMax) {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const mw = Math.max(96, Math.min(384, Math.round(w * dpr / 2)));
        const mh = Math.max(48, Math.min(160, Math.round(h * dpr / 2)));
        const c = document.createElement("canvas");
        c.width = mw; c.height = mh;
        const ctx = c.getContext("2d");
        const data = ctx.createImageData(mw, mh);
        const profile = refractionProfile(bezel, 1, undefined, undefined, undefined, intensity);
        const maxMag = profile.max || 1;
        const px = t => profile.out[Math.max(0, Math.min(126, Math.round(t * 126)))].mag / maxMag;

        let k = 0;
        for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
            const X = (x + .5) / mw * w, Y = (y + .5) / mh * h;
            const dl = X, dr = w - X, dt = Y, db = h - Y;
            const minX = Math.min(dl, dr), minY = Math.min(dt, db);
            const edge = Math.min(minX, minY);
            const t = Math.max(0, Math.min(1, edge / bezel));
            const m = px(t);

            let vx = 0, vy = 0;
            if (Math.abs(minX - minY) < bezel * .72) {
                const sx = dl <= dr ? 1 : -1, sy = dt <= db ? 1 : -1;
                const ax = Math.max(.001, 1 - minX / Math.max(bezel, .001));
                const ay = Math.max(.001, 1 - minY / Math.max(bezel, .001));
                const len = Math.hypot(ax, ay) || 1;
                vx = sx * (ax / len) * m;
                vy = sy * (ay / len) * m;
            } else if (minX < minY) {
                vx = (dl <= dr ? 1 : -1) * m;
            } else {
                vy = (dt <= db ? 1 : -1) * m;
            }

            data.data[k++] = 128 + Math.round(vx * 127);
            data.data[k++] = 128 + Math.round(vy * 127);
            data.data[k++] = 128;
            data.data[k++] = 255;
        }
        ctx.putImageData(data, 0, 0);
        return { url: c.toDataURL("image/png"), scale: Math.max(8, Math.min(capMax || 46, maxMag)) };
    }

    function applyGlassTo(el, mapId, refractionId, bezel, boost, intensity, heightCapRatio, hardCap, capMax) {
        if (!el) return;
        // getBoundingClientRect()는 진행 중인 CSS transform(scale-in 애니메이션 등)의
        // 영향을 받은 "시각적" 박스를 반환하므로, 등장 애니메이션 도중 호출되면
        // 실제보다 작은 크기로 측정되어 굴절 맵이 잘못된 비율로 생성된다.
        // offsetWidth/offsetHeight는 transform과 무관한 레이아웃 크기이므로
        // 애니메이션 진행 상태와 관계없이 항상 정확하다.
        const w = el.offsetWidth, h = el.offsetHeight;
        if (!w || !h) return;
        const image = $(mapId);
        const refraction = $(refractionId);
        if (!image || !refraction) return;
        const capRatio = el && el.id === "mnPill" ? .85 : .46;
        const map = makeMap(w, h, Math.min(bezel, h * capRatio), intensity, capMax);
        image.setAttribute("href", map.url);
        image.setAttribute("width", w);
        image.setAttribute("height", h);
        image.setAttribute("x", 0); image.setAttribute("y", 0);
        // 과도한 boost가 요소 자체 높이를 넘는 변위를 만들면 displacement가
        // 배경 밖을 샘플링해 굴절이 통째로 사라지므로(투명해짐), 요소 크기에
        // 비례한 상한을 둔다. 기존 검색/내비/바/필은 원래 튜닝된 상한(.58, 60)을
        // 그대로 유지하고, 플레이리스트 박스 UI만 요청에 따라 상한을 크게 올린다.
        const rawScale = map.scale * (boost || 1);
        const finalScale = Math.min(rawScale, h * (heightCapRatio || .58), hardCap || 60);
        refraction.setAttribute("scale", finalScale.toFixed(2));
    }

    /* ---------- 1b. Continuous Corner (Apple 스타일 스퀴클) ----------
       border-radius는 원(circle) 기반 원호라 코너가 "뚝" 잘린 느낌을 준다.
       Apple의 Continuous Corner는 초타원(superellipse, x^n + y^n = r^n) 곡선으로
       코너를 그려서, 직선 → 곡선 → 직선 사이의 곡률 변화가 훨씬 완만하고
       유기적으로 이어진다. 아래는 참고로 받은 레퍼런스 구현(superellipse
       quarter-arc 샘플링 + 직선 연결)을 그대로 이식한 것이다. */
    function quarterSuperellipse(cx, cy, sx, sy, startAngle, endAngle, exponent, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = startAngle + (endAngle - startAngle) * t;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const x = cx + sx * Math.sign(cos) * Math.pow(Math.abs(cos), 2 / exponent);
            const y = cy + sy * Math.sign(sin) * Math.pow(Math.abs(sin), 2 / exponent);
            points.push([x, y]);
        }
        return points;
    }

    // exponent: 2=원, 3=둥근 squircle, 4=강한 Continuous Corner(Apple 근사치), 5+=더 평평한 직선부
    function squirclePath(w, h, radius, exponent) {
        exponent = exponent == null ? 4.2 : exponent;
        const segments = 28;
        const r = Math.max(1, Math.min(radius, w / 2, h / 2));
        const points = [];
        // Top-left
        points.push(...quarterSuperellipse(r, r, r, r, Math.PI, Math.PI * 1.5, exponent, segments));
        // Top-right
        points.push(...quarterSuperellipse(w - r, r, r, r, Math.PI * 1.5, Math.PI * 2, exponent, segments));
        // Bottom-right
        points.push(...quarterSuperellipse(w - r, h - r, r, r, 0, Math.PI * 0.5, exponent, segments));
        // Bottom-left
        points.push(...quarterSuperellipse(r, h - r, r, r, Math.PI * 0.5, Math.PI, exponent, segments));

        let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i][0].toFixed(2)} ${points[i][1].toFixed(2)}`;
        }
        d += " Z";
        return d;
    }

    function applyContinuousCorner(el, radius, exponent) {
        if (!el) return;
        // transform(scale-in 애니메이션 등)에 영향받지 않는 레이아웃 크기를 사용해야
        // 애니메이션 도중에도 항상 정확한 최종 크기로 클립 경로를 그릴 수 있다.
        const w = el.offsetWidth, h = el.offsetHeight;
        if (!w || !h) return;
        const rad = Math.min(radius != null ? radius : 24, w / 2, h / 2);
        const d = squirclePath(w, h, rad, exponent);
        el.style.clipPath = `path("${d}")`;
        el.style.webkitClipPath = `path("${d}")`;
        // clip-path 미지원/실패 시를 대비한 border-radius 폴백(대략치)
        el.style.borderRadius = rad + "px";
    }

    /* ---------- 1c. 표시/숨김 전환 시 자동 재계산 (범용) ----------
       display:none 상태에서는 rect가 0이라 굴절 맵/스퀴클을 계산할 수 없으므로,
       overlay가 'on' 클래스를 얻어 실제로 나타나는 시점에 다시 계산한다.
       (기존 #bar 관찰 로직과 동일한 패턴을 여러 대상에 재사용할 수 있도록 일반화) */
    function watchOnClassVisibility(id, onShow) {
        const el = document.getElementById(id);
        if (!el) { setTimeout(() => watchOnClassVisibility(id, onShow), 150); return; }
        const mo = new MutationObserver(() => {
            if (el.classList.contains("on")) {
                // offsetWidth/offsetHeight 조회는 브라우저의 보류된 스타일/레이아웃
                // 계산을 강제로 즉시 반영(flush)시키므로, 'on' 클래스가 막 추가된
                // 시점이라도 지연 없이 정확한 최종 크기를 얻을 수 있다.
                onShow();
            }
        });
        mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    }

    function visibleSearchWrap() {
        // 현재 활성 view(.view.on) 안의 검색 캡슐만 계산 (숨겨진 요소는 rect가 0이라 스킵됨)
        return document.querySelector(".view.on .mob-srch-wrap");
    }

    function applyAllGlass() {
        applyGlassTo(visibleSearchWrap(), "#searchDisplacementMap", "#searchGlassRefraction", 28);
        applyGlassTo(document.getElementById("mob-nav"), "#navDisplacementMap", "#navGlassRefraction", 30);
        const bar = document.getElementById("bar");
        if (bar && !bar.classList.contains("bar-hidden")) {
            applyGlassTo(bar, "#barDisplacementMap", "#barGlassRefraction", 32);
        }
        // 작은 캡슐(필)은 가장자리 굴절을 훨씬 강하고 넓게 (bezel↑, boost 3.2배)
        applyGlassTo(document.getElementById("mnPill"), "#pillDisplacementMap", "#pillGlassRefraction", 40, 2.4);

        // 플레이리스트 팝업(박스) UI — 실제로 열려있는(.on) 것만 계산
        applyPlaylistOverlayGlass();
    }

    function applyPlaylistOverlayGlass() {
        // 요청사항: 기존 검색/내비/미니바(boost=1, capMax=46, hardCap=60)보다
        // 굴절을 "구현 가능한 최대치"로 — intensity·boost·상한(capMax/hardCap)을
        // 모두 함께 올려 3중으로 강화한다.
        const EXP = 4.4; // Continuous Corner superellipse 지수 (4=강한 Apple 근사, 여기선 살짝 더 강하게)
        const ctx = document.getElementById("pl-ctx-menu");
        if (ctx && ctx.classList.contains("on")) {
            applyGlassTo(ctx, "#ctxDisplacementMap", "#ctxGlassRefraction", 26, 3.0, 2.2, .95, 200, 100);
            applyContinuousCorner(ctx, 20, EXP);
        }
        const dialog = document.getElementById("pl-dialog");
        if (dialog && dialog.closest("#pl-dialog-overlay")?.classList.contains("on")) {
            applyGlassTo(dialog, "#dialogDisplacementMap", "#dialogGlassRefraction", 40, 2.8, 2.2, .95, 220, 100);
            applyContinuousCorner(dialog, 28, EXP);
        }
        const confirm = document.getElementById("pl-confirm");
        if (confirm && confirm.closest("#pl-confirm-overlay")?.classList.contains("on")) {
            applyGlassTo(confirm, "#confirmDisplacementMap", "#confirmGlassRefraction", 40, 2.8, 2.2, .95, 220, 100);
            applyContinuousCorner(confirm, 28, EXP);
        }
        const addModal = document.getElementById("pl-add-modal");
        if (addModal && addModal.closest("#pl-add-modal-overlay")?.classList.contains("on")) {
            applyGlassTo(addModal, "#addModalDisplacementMap", "#addModalGlassRefraction", 42, 2.6, 2.2, .95, 220, 100);
            applyContinuousCorner(addModal, 30, EXP);
        }
    }

    /* 재생이 시작되어 미니 플레이어 바(#bar)가 'bar-hidden'을 벗고 나타날 때
       굴절 맵을 다시 계산한다. app.js 로직은 건드리지 않고 클래스 변화만 관찰. */
    function watchBarVisibility() {
        const bar = document.getElementById("bar");
        if (!bar) { setTimeout(watchBarVisibility, 100); return; }
        const mo = new MutationObserver(() => {
            if (!bar.classList.contains("bar-hidden")) {
                setTimeout(() => applyGlassTo(bar, "#barDisplacementMap", "#barGlassRefraction", 32), 50);
            }
        });
        mo.observe(bar, { attributes: true, attributeFilter: ["class"] });
    }

    let resizeTimer;
    addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(applyAllGlass, 160); });

    /* ---------- 2. 하단 내비 Morphing Sliding Pill ---------- */
    function morphPillTo(view) {
        const nav = document.getElementById("mob-nav");
        const pill = document.getElementById("mnPill");
        const btn = nav && nav.querySelector('.mn-btn[data-v="' + view + '"]');
        if (!nav || !pill || !btn) return;

        const navR = nav.getBoundingClientRect();
        const btnR = btn.getBoundingClientRect();
        // 필 여백을 6px→3px로 줄여 캡슐 크기를 더 키움
        const targetLeft = Math.round(btnR.left - navR.left + 3);
        const targetWidth = Math.round(btnR.width - 6);
        const prev = pill._rect;

        if (!prev) {
            // 최초 배치: 애니메이션 없이 바로 위치
            pill.style.transition = "none";
            pill.style.left = targetLeft + "px";
            pill.style.width = targetWidth + "px";
            // 강제 리플로우 후 트랜지션 복구
            void pill.offsetWidth;
            pill.style.transition = "";
        } else if (prev.left !== targetLeft) {
            // 1단계: 이전 위치 ↔ 새 위치를 한번에 덮는 "블롭" 형태로 빠르게 늘어남
            const stretchLeft = Math.min(prev.left, targetLeft);
            const stretchRight = Math.max(prev.left + prev.width, targetLeft + targetWidth);
            pill.style.transitionProperty = "left, width";
            pill.style.transitionDuration = ".15s";
            pill.style.transitionTimingFunction = "cubic-bezier(.3,.9,.4,1)";
            pill.style.left = stretchLeft + "px";
            pill.style.width = (stretchRight - stretchLeft) + "px";

            clearTimeout(pill._morphTimer);
            pill._morphTimer = setTimeout(() => {
                // 2단계: 목표 버튼 크기로 튕기며 정착 (overshoot easing)
                pill.style.transitionDuration = ".48s";
                pill.style.transitionTimingFunction = "cubic-bezier(.22,1.61,.36,1)";
                pill.style.left = targetLeft + "px";
                pill.style.width = targetWidth + "px";
            }, 150);
        }
        pill._rect = { left: targetLeft, width: targetWidth };
    }

    function currentActiveView() {
        const on = document.querySelector(".mn-btn.on");
        return on ? on.dataset.v : "home";
    }

    function initPill() {
        morphPillTo(currentActiveView());
    }

    /* 필의 자체 굴절 맵은 크기가 바뀔 때만 다시 계산하면 충분하다
       (5개 버튼은 flex:1 이라 목표 폭이 거의 동일 — 정착 시점에 한 번씩만 갱신). */
    function watchPillGlass() {
        const pill = document.getElementById("mnPill");
        if (!pill) return;
        pill.addEventListener("transitionend", e => {
            if (e.propertyName === "width") {
                applyGlassTo(pill, "#pillDisplacementMap", "#pillGlassRefraction", 40, 2.4);
            }
        });
    }

    /* gv()는 app.js에서 정의됨 — 원본 로직은 그대로 호출하고,
       뷰가 바뀐 뒤에 필 애니메이션 + 새 화면의 글래스 굴절 맵만 추가로 갱신한다. */
    function wireNavHook() {
        if (typeof window.gv !== "function") {
            setTimeout(wireNavHook, 50);
            return;
        }
        const originalGv = window.gv;
        window.gv = function (v, el) {
            originalGv(v, el);
            morphPillTo(v);
            setTimeout(applyAllGlass, 60);
        };
    }

    function watchPlaylistOverlays() {
        // overlay(배경) 요소가 'on'을 얻는 시점 = 실제 표시 시점
        watchOnClassVisibility("pl-ctx-menu", applyPlaylistOverlayGlass);
        watchOnClassVisibility("pl-dialog-overlay", applyPlaylistOverlayGlass);
        watchOnClassVisibility("pl-confirm-overlay", applyPlaylistOverlayGlass);
        watchOnClassVisibility("pl-add-modal-overlay", applyPlaylistOverlayGlass);
    }

    function boot() {
        initPill();
        applyAllGlass();
        wireNavHook();
        watchPillGlass();
        watchBarVisibility();
        watchPlaylistOverlays();
        setTimeout(applyAllGlass, 350); // 폰트/이미지 로드 이후 재계산
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
