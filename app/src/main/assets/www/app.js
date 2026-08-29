/* ════════════════════════════════════════════
   DYNAMIC BACKGROUND — Canvas orbs + beat reactor
════════════════════════════════════════════ */
const CVS = document.getElementById('bgc'), CX = CVS.getContext('2d');
const BG = {
    h: 240, th: 240, e: .05, te: .05, orbs: [], f: 0, playing: false,
    beat: 0, beatDecay: .04, energyLevel: 0, tEnergyLevel: 0
};

function szCvs() {
    CVS.width = innerWidth; CVS.height = innerHeight;
    BG.orbs = Array.from({ length: 7 }, (_, i) => ({
        x: Math.random() * CVS.width, y: Math.random() * CVS.height,
        vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
        r: 140 + Math.random() * 280, h: i * 51,
        a: .06 + Math.random() * .10, phase: Math.random() * Math.PI * 2
    }));
}
addEventListener('resize', szCvs); szCvs();

function triggerBeat() {
    BG.beat = Math.min(1, BG.beat + 0.85 * (0.3 + BG.energyLevel * 0.7));
}

let _beatTimer = null;
function startBeatTimer(bpm = 120) {
    clearInterval(_beatTimer);
    _beatTimer = setInterval(() => { if (BG.playing) triggerBeat(); }, 60000 / bpm);
}
function stopBeatTimer() { clearInterval(_beatTimer); _beatTimer = null; }

(function bgLoop() {
    requestAnimationFrame(bgLoop);
    BG.f++;
    BG.h += (BG.th - BG.h) * .005;
    BG.e += (BG.te - BG.e) * .014;
    BG.energyLevel += (BG.tEnergyLevel - BG.energyLevel) * .03;
    if (BG.beat > 0) BG.beat = Math.max(0, BG.beat - BG.beatDecay * (1 + BG.energyLevel));

    const beat = BG.beat, en = BG.energyLevel;
    CX.clearRect(0, 0, CVS.width, CVS.height);

    const cx = CVS.width / 2, cy = CVS.height / 2;
    const baseL = BG.playing ? 3 + beat * 5 : 1.5;
    const g = CX.createRadialGradient(cx, cy, 0, cx, cy, CVS.width * (.80 + beat * .20));
    g.addColorStop(0, `hsl(${BG.h},${16 + en * 14}%,${baseL + 1}%)`);
    g.addColorStop(1, `hsl(${BG.h + 40},${10 + en * 8}%,${baseL - 1}%)`);
    CX.fillStyle = g; CX.fillRect(0, 0, CVS.width, CVS.height);

    BG.orbs.forEach(o => {
        const speed = 1 + BG.e * 1.4 + beat * (1.5 + en * 3.5);
        o.x += o.vx * speed; o.y += o.vy * speed;
        if (o.x < -o.r) o.x = CVS.width + o.r; if (o.x > CVS.width + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = CVS.height + o.r; if (o.y > CVS.height + o.r) o.y = -o.r;
        const pulse = Math.sin(BG.f * .007 + o.phase) * .18 + beat * .40;
        const r = o.r * (1 + pulse);
        const og = CX.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
        const h = (BG.h + o.h) % 360;
        const alpha = (o.a * (BG.playing ? .60 : .28)) + beat * o.a * 1.1;
        og.addColorStop(0, `hsla(${h},${68 + beat * 22}%,${52 + beat * 14}%,${Math.min(alpha, .95)})`);
        og.addColorStop(1, `hsla(${h},68%,52%,0)`);
        CX.fillStyle = og; CX.beginPath(); CX.arc(o.x, o.y, r, 0, Math.PI * 2); CX.fill();
    });

    if (beat > 0.12 && BG.playing) {
        const fa = beat * .12 * en;
        const fg = CX.createRadialGradient(cx, cy * .5, 0, cx, cy, CVS.width * .75);
        fg.addColorStop(0, `hsla(${BG.h},80%,72%,${fa})`);
        fg.addColorStop(1, `hsla(${BG.h},80%,72%,0)`);
        CX.fillStyle = fg; CX.fillRect(0, 0, CVS.width, CVS.height);
    }
})();

/* ════════════════════════════════════════════
   MOOD SYSTEM
════════════════════════════════════════════ */
const MOODS = {
    calm: { h: 210, e: .05, bpm: 68, energy: .08 },
    happy: { h: 42, e: .40, bpm: 118, energy: .55 },
    energetic: { h: 5, e: .90, bpm: 148, energy: .95 },
    sad: { h: 200, e: .04, bpm: 64, energy: .07 },
    romantic: { h: 318, e: .20, bpm: 86, energy: .28 },
    kpop: { h: 268, e: .42, bpm: 128, energy: .65 },
    default: { h: 240, e: .08, bpm: 100, energy: .30 }
};
const MOOD_COL = {
    calm: { h: 210, s: 70, l: 60 }, happy: { h: 42, s: 90, l: 60 },
    energetic: { h: 5, s: 95, l: 58 }, sad: { h: 200, s: 65, l: 55 },
    romantic: { h: 318, s: 80, l: 62 }, kpop: { h: 268, s: 75, l: 62 },
    default: { h: 240, s: 60, l: 58 }
};
let _curMood = 'default', _moodH = 240, _tMoodH = 240, _moodS = 60, _moodL = 58;

function setMood(mood) {
    _curMood = mood;
    const c = MOOD_COL[mood] || MOOD_COL.default;
    const m = MOODS[mood] || MOODS.default;
    _tMoodH = c.h; _moodS = c.s; _moodL = c.l;
    BG.th = m.h; BG.te = m.e;
    BG.tEnergyLevel = m.energy;
    BG.beatDecay = .022 + (1 - m.energy) * .045;
    if (BG.playing) startBeatTimer(m.bpm);
}
function detectMood(title) {
    const s = title.toLowerCase();
    if (/calm|ambient|chill|sleep|relax|lo.?fi|acoustic|soft/.test(s)) return setMood('calm');
    if (/sad|heartbreak|cry|miss|alone|melanchol|hurt|pain/.test(s)) return setMood('sad');
    if (/happy|joy|sunshine|fun|party|upbeat|smile|good.?time/.test(s)) return setMood('happy');
    if (/hype|trap|drill|rage|hard|workout|edm|rave|bass|drop|fire|savage|power/.test(s)) return setMood('energetic');
    if (/love|romantic|night|moon|slow|ballad|heart|forever/.test(s)) return setMood('romantic');
    if (/kpop|k-pop|bts|blackpink|aespa|twice|ive|newjeans|stray|nct|exo/.test(s)) return setMood('kpop');
    setMood('default');
}

/* ════════════════════════════════════════════
   NP MESH GRADIENT BACKGROUND
════════════════════════════════════════════ */
function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const NP_MESH = {
    canvas: null, ctx: null,
    offCanvas: null, offCtx: null,
    W: 0, H: 0, frame: 0,
    colors: [
        { h: 268, s: 72, l: 42 }, { h: 300, s: 68, l: 38 },
        { h: 240, s: 65, l: 44 }, { h: 210, s: 70, l: 40 },
        { h: 320, s: 66, l: 41 }, { h: 255, s: 74, l: 43 }
    ],
    targetColors: null,
    nodes: [],
    initialized: false,
    RES: 180
};

function initNpMesh() {
    const cvs = document.getElementById('np-bg');
    if (!cvs || cvs.tagName !== 'CANVAS') return;
    NP_MESH.canvas = cvs;
    NP_MESH.ctx = cvs.getContext('2d');
    NP_MESH.offCanvas = document.createElement('canvas');
    NP_MESH.offCanvas.width = NP_MESH.offCanvas.height = NP_MESH.RES;
    NP_MESH.offCtx = NP_MESH.offCanvas.getContext('2d');
    const seeds = [
        [0.15, 0.20], [0.85, 0.15],
        [0.10, 0.78], [0.88, 0.82],
        [0.50, 0.12], [0.50, 0.88]
    ];
    NP_MESH.nodes = seeds.map(([u, v], i) => ({
        u, v,
        du: (Math.random() - 0.5) * 0.0014,
        dv: (Math.random() - 0.5) * 0.0014,
        phase: Math.random() * Math.PI * 2,
        phase2: Math.random() * Math.PI * 2,
        spd: 0.008 + Math.random() * 0.006,
        amp: 0.06 + Math.random() * 0.06,
    }));
    NP_MESH.initialized = true;
    _applyMoodToMesh();
}

function extractThumbColors(hq, md, title) {
    _tryExtract(hq, () => _tryExtract(md, () => _applyMoodToMesh()));
}

function _tryExtract(src, onFail) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        try {
            const SIZE = 96;
            const tmp = document.createElement('canvas');
            tmp.width = tmp.height = SIZE;
            const cx = tmp.getContext('2d', { willReadFrequently: true });
            cx.filter = 'saturate(260%) contrast(112%)';
            cx.drawImage(img, 0, 0, SIZE, SIZE);
            cx.filter = 'none';
            const d = cx.getImageData(0, 0, SIZE, SIZE).data;
            let rawTotalL = 0, rawTotalS = 0, rawCnt = 0;
            {
                const raw = document.createElement('canvas');
                raw.width = raw.height = 24;
                const rx = raw.getContext('2d', { willReadFrequently: true });
                rx.drawImage(img, 0, 0, 24, 24);
                const rd = rx.getImageData(0, 0, 24, 24).data;
                for (let i = 0; i < rd.length; i += 4) {
                    const h = rgbToHsl(rd[i], rd[i + 1], rd[i + 2]);
                    rawTotalL += h.l; rawTotalS += h.s; rawCnt++;
                }
            }
            const rawAvgL = rawTotalL / (rawCnt || 1);
            const rawAvgS = rawTotalS / (rawCnt || 1);
            const isVeryDark = rawAvgL < 12;
            const liftDark = isVeryDark ? 20 : 0;
            if (rawAvgS < 9) {
                if (rawAvgL > 68) _setArtPalette('monochrome');
                else if (rawAvgL < 25) _setArtPalette('darkMono');
                else _setArtPalette('blackWhite');
                return;
            }
            const BINS = 72;
            const BIND = 360 / BINS;
            const bW = new Float32Array(BINS);
            const bHsin = new Float32Array(BINS);
            const bHcos = new Float32Array(BINS);
            const bS = new Float32Array(BINS);
            const bL = new Float32Array(BINS);
            let totalW = 0, coloredCnt = 0, totalCnt = 0;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 120) continue;
                totalCnt++;
                const hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
                if (hsl.s < 22) continue;
                if (hsl.l < 8 || hsl.l > 92) continue;
                coloredCnt++;
                const w = (hsl.s / 100) ** 3 * Math.max(0.1, 1 - Math.abs(hsl.l - 48) / 48);
                const bin = Math.floor(hsl.h / BIND) % BINS;
                const rad = hsl.h * Math.PI / 180;
                bW[bin] += w;
                bHsin[bin] += Math.sin(rad) * w;
                bHcos[bin] += Math.cos(rad) * w;
                bS[bin] += hsl.s * w;
                bL[bin] += hsl.l * w;
                totalW += w;
            }
            if (coloredCnt < totalCnt * 0.06 || totalW < 0.5) {
                _setArtPalette(rawAvgL > 55 ? 'monochrome' : 'darkMono');
                return;
            }
            const MERGE_R = 4;
            const MIN_FRAC = 0.08;
            const used = new Uint8Array(BINS);
            const clusters = [];
            const sortedBins = Array.from({ length: BINS }, (_, k) => k)
                .filter(k => bW[k] > 0)
                .sort((a, b) => bW[b] - bW[a]);
            for (const peak of sortedBins) {
                if (used[peak]) continue;
                let cW = 0, cHsin = 0, cHcos = 0, cS = 0, cL = 0;
                for (let d2 = -MERGE_R; d2 <= MERGE_R; d2++) {
                    const j = (peak + d2 + BINS) % BINS;
                    if (used[j] && d2 !== 0) continue;
                    const w = bW[j]; if (w <= 0) continue;
                    cW += w; cHsin += bHsin[j]; cHcos += bHcos[j];
                    cS += bS[j]; cL += bL[j];
                    used[j] = 1;
                }
                if (cW / totalW < MIN_FRAC) continue;
                clusters.push({
                    w: cW,
                    h: ((Math.atan2(cHsin, cHcos) * 180 / Math.PI) + 360) % 360,
                    s: cS / cW,
                    l: cL / cW,
                });
            }
            if (clusters.length === 0) { onFail(); return; }
            clusters.sort((a, b) => b.w - a.w);
            const L_BASE = Math.max(28, Math.min(52, rawAvgL * 0.68 + 12));
            const P = clusters[0];
            const Q = clusters.length > 1 ? clusters[1] : null;
            let hueDiff = 360;
            if (Q) {
                hueDiff = Math.abs(P.h - Q.h);
                if (hueDiff > 180) hueDiff = 360 - hueDiff;
            }
            const isMono = !Q || hueDiff < 25;
            let nodeDef;
            if (isMono) {
                const hBase = P.h;
                const sHi = Math.max(52, Math.min(86, P.s * 0.65 + 20));
                const sLo = Math.max(44, Math.min(78, P.s * 0.55 + 14));
                const lHi = Math.max(36 + liftDark, Math.min(58, L_BASE + 8 + liftDark * 0.5));
                const lLo = Math.max(20 + liftDark, Math.min(42, L_BASE - 10 + liftDark * 0.5));
                const lLoFinal = Math.min(lLo, lHi - 14);
                nodeDef = [
                    { h: hBase, s: sHi, l: lHi },
                    { h: hBase, s: sLo, l: lLoFinal },
                    { h: hBase - 5, s: sHi, l: lHi - 3 },
                    { h: hBase + 4, s: sLo, l: lLoFinal + 3 },
                    { h: hBase + 6, s: sHi, l: lHi - 6 },
                    { h: hBase - 3, s: sLo, l: lLoFinal + 2 },
                ];
            } else {
                const makeNode = (cl, hOff, lOff, sOff) => ({
                    h: (cl.h + hOff + 360) % 360,
                    s: Math.max(50, Math.min(86, cl.s * 0.65 + 20 + sOff)),
                    l: Math.max(28 + liftDark, Math.min(58, L_BASE + lOff + liftDark * 0.5)),
                });
                nodeDef = [
                    makeNode(P, 0, 0, 0),
                    makeNode(Q, 0, 4, -4),
                    makeNode(P, -10, -4, 4),
                    makeNode(Q, -8, 6, -2),
                    makeNode(P, 8, -6, 2),
                    makeNode(Q, 6, -3, 4),
                ];
            }
            const targets = nodeDef.map(n => ({ h: (n.h + 360) % 360, s: n.s, l: n.l }));
            _enforceHueSpread(targets, isMono ? 4 : 8);
            const mood = MOOD_COL[_curMood] || MOOD_COL.default;
            NP_MESH.targetColors = targets.map((c, i) => {
                let dh = (mood.h + i * 5) - c.h;
                if (dh > 180) dh -= 360;
                if (dh < -180) dh += 360;
                return { h: (c.h + dh * 0.05 + 360) % 360, s: c.s, l: c.l };
            });
        } catch (e) { onFail(); }
    };
    img.onerror = onFail;
    img.src = src;
}

function _setArtPalette(name) {
    const saved = _curMood;
    _curMood = name;
    _applyMoodToMesh();
    _curMood = saved;
}

function _enforceHueSpread(targets, minDeg) {
    const DAMP = 0.72;
    for (let iter = 0; iter < 8; iter++) {
        let moved = false;
        for (let i = 0; i < targets.length; i++) {
            for (let j = i + 1; j < targets.length; j++) {
                let dh = targets[j].h - targets[i].h;
                if (dh > 180) dh -= 360;
                if (dh < -180) dh += 360;
                const absDh = Math.abs(dh);
                if (absDh < minDeg && absDh > 0.5) {
                    const push = ((minDeg - absDh) / 2 + 0.5) * DAMP;
                    const sign = dh >= 0 ? 1 : -1;
                    targets[i].h = (targets[i].h - push * sign + 360) % 360;
                    targets[j].h = (targets[j].h + push * sign + 360) % 360;
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }
}

function _blendMoodIntoTargets(moodRatio, isVeryDark) {
    if (!NP_MESH.targetColors) return;
    const mood = MOOD_COL[_curMood] || MOOD_COL.default;
    const liftDark = isVeryDark ? 18 : 0;
    NP_MESH.targetColors = NP_MESH.targetColors.map((c, i) => {
        let dh = (mood.h + i * 15) - c.h;
        if (dh > 180) dh -= 360;
        if (dh < -180) dh += 360;
        return {
            h: (c.h + dh * moodRatio + 360) % 360,
            s: Math.max(50, Math.min(92, c.s * (1 - moodRatio) + mood.s * moodRatio)),
            l: Math.max(32 + liftDark, Math.min(72, c.l + liftDark * 0.5))
        };
    });
    _enforceHueSpread(NP_MESH.targetColors, 20);
}

function _applyMoodToMesh() {
    const PALETTES = {
        calm: [[210, 68, 44], [178, 56, 40], [240, 60, 46], [155, 50, 41], [222, 64, 43], [188, 54, 39]],
        happy: [[42, 88, 52], [18, 86, 50], [72, 82, 55], [350, 76, 48], [54, 85, 53], [295, 70, 48]],
        energetic: [[4, 94, 48], [338, 86, 45], [30, 90, 50], [310, 80, 46], [355, 92, 47], [58, 84, 50]],
        sad: [[218, 52, 40], [194, 46, 37], [248, 50, 43], [172, 42, 38], [230, 52, 41], [275, 44, 40]],
        romantic: [[318, 78, 46], [348, 70, 44], [290, 66, 48], [358, 74, 45], [305, 74, 47], [42, 60, 46]],
        kpop: [[268, 74, 46], [305, 66, 44], [238, 68, 48], [330, 62, 45], [252, 72, 47], [185, 58, 44]],
        default: [[240, 62, 44], [270, 58, 42], [208, 58, 46], [300, 54, 43], [228, 60, 45], [168, 52, 42]],
        red: [[4, 88, 45], [338, 80, 43], [30, 86, 48], [315, 74, 43], [355, 90, 46], [290, 64, 42]],
        pink: [[340, 80, 52], [308, 70, 50], [358, 76, 54], [275, 60, 47], [348, 78, 53], [48, 62, 48]],
        orange: [[28, 90, 50], [6, 84, 47], [55, 84, 53], [342, 72, 46], [38, 88, 51], [220, 62, 44]],
        gold: [[44, 82, 52], [22, 80, 49], [70, 76, 55], [348, 66, 47], [54, 80, 53], [200, 58, 46]],
        yellow: [[52, 90, 56], [30, 84, 52], [80, 84, 58], [338, 70, 48], [63, 88, 57], [210, 64, 48]],
        lime: [[82, 80, 48], [50, 76, 45], [112, 72, 50], [320, 60, 44], [94, 78, 49], [230, 60, 43]],
        green: [[140, 62, 44], [106, 58, 42], [168, 60, 46], [86, 50, 41], [152, 60, 45], [310, 52, 42]],
        teal: [[172, 68, 42], [142, 60, 40], [200, 64, 45], [125, 52, 39], [184, 66, 43], [325, 58, 42]],
        cyan: [[192, 72, 46], [163, 62, 43], [218, 68, 49], [140, 54, 42], [202, 70, 47], [340, 62, 44]],
        blue: [[220, 72, 46], [193, 64, 43], [250, 68, 49], [168, 54, 42], [233, 70, 47], [350, 60, 44]],
        navy: [[225, 60, 38], [198, 56, 35], [255, 58, 40], [172, 46, 36], [237, 58, 39], [355, 52, 38]],
        violet: [[258, 72, 46], [228, 64, 43], [288, 68, 49], [202, 56, 43], [270, 70, 47], [42, 58, 44]],
        purple: [[280, 70, 44], [248, 62, 41], [310, 68, 47], [222, 54, 40], [293, 68, 45], [48, 60, 43]],
        magenta: [[298, 76, 46], [266, 68, 43], [328, 72, 49], [240, 60, 42], [312, 74, 47], [60, 62, 45]],
        indigo: [[248, 68, 42], [218, 60, 39], [278, 66, 45], [192, 52, 38], [262, 66, 43], [50, 58, 42]],
        monochrome: [[240, 6, 82], [240, 4, 72], [240, 8, 88], [240, 5, 64], [240, 7, 78], [240, 6, 90]],
        darkMono: [[240, 8, 28], [240, 6, 22], [240, 10, 34], [240, 7, 18], [240, 9, 30], [240, 8, 38]],
        blackWhite: [[0, 0, 92], [0, 0, 18], [0, 0, 85], [0, 0, 25], [0, 0, 78], [0, 0, 12]],
        sunset: [[22, 90, 50], [322, 76, 46], [58, 84, 52], [290, 68, 44], [38, 88, 51], [200, 62, 45]],
        aurora: [[150, 64, 46], [280, 68, 44], [175, 60, 48], [312, 62, 42], [163, 62, 47], [42, 62, 46]],
        deepOcean: [[220, 68, 36], [176, 68, 42], [250, 62, 34], [148, 58, 43], [212, 66, 38], [340, 52, 40]],
        cherry: [[345, 74, 72], [278, 50, 74], [358, 78, 68], [308, 46, 79], [338, 72, 74], [48, 52, 68]],
        neon: [[285, 94, 52], [170, 96, 48], [52, 92, 52], [320, 92, 50], [195, 94, 50], [42, 94, 54]],
        earth: [[22, 56, 46], [50, 44, 44], [6, 62, 42], [75, 38, 45], [33, 52, 47], [200, 36, 42]],
        cobaltGold: [[222, 72, 42], [44, 80, 52], [198, 64, 44], [60, 74, 54], [236, 70, 40], [350, 58, 44]],
        lavMint: [[268, 52, 68], [150, 56, 68], [298, 46, 72], [132, 48, 70], [280, 50, 70], [38, 44, 66]],
    };
    const pal = PALETTES[_curMood] || PALETTES.default;
    NP_MESH.targetColors = pal.map(([h, s, l]) => ({ h, s, l }));
    if (!['monochrome', 'darkMono', 'blackWhite'].includes(_curMood)) {
        _enforceHueSpread(NP_MESH.targetColors, 22);
    }
}

function _lerpMeshColors() {
    const target = NP_MESH.targetColors;
    if (!target) return;
    NP_MESH.colors.forEach((c, i) => {
        const t = target[i] || target[i % target.length];
        let dh = t.h - c.h;
        if (dh > 180) dh -= 360;
        if (dh < -180) dh += 360;
        const ds = t.s - c.s;
        const dl = t.l - c.l;
        const distH = Math.abs(dh) / 180;
        const distS = Math.abs(ds) / 100;
        const distL = Math.abs(dl) / 100;
        const maxDist = Math.max(distH, distS, distL);
        const spd = 0.014 + Math.pow(maxDist, 0.6) * 0.042;
        c.h = (c.h + dh * spd + 360) % 360;
        c.s += ds * spd;
        c.l += dl * spd;
    });
}

function renderNpMesh(beat, en) {
    if (!NP_MESH.initialized) initNpMesh();
    const cvs = NP_MESH.canvas, ctx = NP_MESH.ctx;
    const off = NP_MESH.offCanvas, octx = NP_MESH.offCtx;
    if (!cvs || !ctx || !off || !octx) return;
    const nw = innerWidth;
    const nh = innerHeight;
    if (nw !== NP_MESH.W || nh !== NP_MESH.H) {
        NP_MESH.W = cvs.width = nw;
        NP_MESH.H = cvs.height = nh;
    }
    _lerpMeshColors();
    NP_MESH.frame++;
    const bt = beat;
    const waveSpeed = 1.0 + en * 1.2 + bt * 2.5;
    NP_MESH.nodes.forEach((nd, i) => {
        nd.phase += nd.spd * waveSpeed;
        nd.phase2 += nd.spd * waveSpeed * 0.63;
        nd.u += nd.du * (1 + en * 0.4);
        nd.v += nd.dv * (1 + en * 0.4);
        if (nd.u < 0.04 || nd.u > 0.96) { nd.du *= -1; nd.u = Math.max(0.04, Math.min(0.96, nd.u)); }
        if (nd.v < 0.04 || nd.v > 0.96) { nd.dv *= -1; nd.v = Math.max(0.04, Math.min(0.96, nd.v)); }
    });
    const R = NP_MESH.RES;
    const imgData = octx.createImageData(R, R);
    const buf = imgData.data;
    const N = NP_MESH.nodes.length;
    const cols = NP_MESH.colors.map(c => {
        const sB = Math.min(100, c.s + bt * 14 * en);
        const lB = Math.min(72, c.l + bt * 12 * en);
        return hslToRgb(c.h, sB, lB);
    });
    const waveNodes = NP_MESH.nodes.map((nd, i) => {
        const amp = nd.amp * (1 + bt * 1.8 * en);
        return {
            u: nd.u + Math.sin(nd.phase) * amp + Math.cos(nd.phase2 + i * 0.9) * amp * 0.5,
            v: nd.v + Math.cos(nd.phase) * amp + Math.sin(nd.phase2 * 1.1 + i) * amp * 0.5,
        };
    });
    for (let py = 0; py < R; py++) {
        const v = py / R;
        for (let px = 0; px < R; px++) {
            const u = px / R;
            let wSum = 0, wr = 0, wg = 0, wb = 0;
            for (let ni = 0; ni < N; ni++) {
                const wn = waveNodes[ni];
                const dx = u - wn.u, dy = v - wn.v;
                const dist2 = dx * dx + dy * dy;
                const w = 1.0 / (dist2 * dist2 * dist2 + 1e-7);
                wr += cols[ni][0] * w;
                wg += cols[ni][1] * w;
                wb += cols[ni][2] * w;
                wSum += w;
            }
            const idx = (py * R + px) * 4;
            buf[idx] = wr / wSum | 0;
            buf[idx + 1] = wg / wSum | 0;
            buf[idx + 2] = wb / wSum | 0;
            buf[idx + 3] = 255;
        }
    }
    octx.putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, NP_MESH.W, NP_MESH.H);
    if (bt > 0.12 && en > 0.15) {
        const fc = NP_MESH.colors.reduce((best, c) => c.l > best.l ? c : best, NP_MESH.colors[0]);
        const fa = bt * 0.18 * en;
        const fg = ctx.createRadialGradient(
            NP_MESH.W * 0.5, NP_MESH.H * 0.3, 0,
            NP_MESH.W * 0.5, NP_MESH.H * 0.5, NP_MESH.W * 0.65
        );
        fg.addColorStop(0, `hsla(${Math.round(fc.h)},${Math.round(fc.s)}%,${Math.round(fc.l + 16)}%,${fa.toFixed(3)})`);
        fg.addColorStop(1, `hsla(${Math.round(fc.h)},${Math.round(fc.s)}%,${Math.round(fc.l)}%,0)`);
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, NP_MESH.W, NP_MESH.H);
    }
}

if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initNpMesh);
else
    setTimeout(initNpMesh, 0);

/* ════════════════════════════════════════════
   NP BEAT REACTOR
════════════════════════════════════════════ */
const NP_PARTICLES = [];
const NP_MAX_PARTICLES = 60;

function spawnParticles(count, h, s, l) {
    const canvas = document.getElementById('np-particles');
    if (!canvas) return;
    const { cx, cy } = _getArtCenter();
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 3.5 * BG.energyLevel;
        const size = 1.5 + Math.random() * 3.5;
        NP_PARTICLES.push({
            x: cx + (Math.random() - .5) * 140,
            y: cy + (Math.random() - .5) * 140,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.2,
            life: 1.0,
            decay: .012 + Math.random() * .022,
            size,
            h, s, l: l + Math.random() * 20
        });
        if (NP_PARTICLES.length > NP_MAX_PARTICLES) NP_PARTICLES.shift();
    }
}

function renderParticles() {
    const canvas = document.getElementById('np-particles');
    if (!canvas || !document.getElementById('np').classList.contains('on')) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || innerWidth;
    canvas.height = canvas.offsetHeight || innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = NP_PARTICLES.length - 1; i >= 0; i--) {
        const p = NP_PARTICLES[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.04;
        p.vx *= 0.98;
        p.life -= p.decay;
        if (p.life <= 0) { NP_PARTICLES.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.life * p.life * 0.85;
        ctx.fillStyle = `hsl(${p.h},${p.s}%,${p.l}%)`;
        ctx.shadowColor = `hsl(${p.h},${p.s}%,${p.l}%)`;
        ctx.shadowBlur = p.size * 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let _beatCount = 0;
function updateNpColor() {
    _moodH += (_tMoodH - _moodH) * .04;
    const h = Math.round(_moodH), s = _moodS, l = _moodL;
    const col = `hsl(${h},${s}%,${l}%)`;
    const glow = `hsla(${h},${s}%,${l}%,0.4)`;
    const npEl = document.getElementById('np');
    if (npEl) { npEl.style.setProperty('--np-glow', glow); npEl.style.setProperty('--np-acc', col); }

    const npOpen = npEl?.classList.contains('on');
    const beat = BG.beat;
    const en = BG.energyLevel;

    if (npOpen && S.playing) {
        renderNpMesh(beat, en);
        const pulse = document.getElementById('np-pulse');
        if (pulse) {
            pulse.style.background = glow;
            pulse.style.display = 'block';
            if (beat > .08) {
                const sc2 = 1 + beat * .8 * en;
                pulse.style.transform = `translateX(-50%) scaleX(${sc2.toFixed(3)})`;
                pulse.style.opacity = (.5 + beat * .5).toFixed(3);
                pulse.style.filter = `blur(${8 + beat * 8 * en}px)`;
            } else {
                pulse.style.transform = 'translateX(-50%) scaleX(1)';
                pulse.style.opacity = '.7';
                pulse.style.filter = 'blur(9px)';
            }
        }
        const npTitle = document.getElementById('np-title');
        if (npTitle && beat > .5 && en > .5) {
            npTitle.style.textShadow = `0 0 ${beat * 20 * en}px hsla(${h},${s}%,${l + 10}%,${(beat * .6).toFixed(2)})`;
        } else if (npTitle) npTitle.style.textShadow = '';
    } else {
        renderNpMesh(0, 0.05);
        const pulse = document.getElementById('np-pulse');
        if (pulse) pulse.style.display = S.playing ? 'block' : 'none';
    }

    _beatCount++;

    const vb = document.querySelectorAll('.vb');
    if (S.playing) {
        vb.forEach((b, i) => {
            b.style.background = `hsl(${h},${s}%,62%)`;
            if (beat > .06) {
                const ht = 1 + beat * en * (0.8 + Math.sin(i * 1.4 + BG.f * .08) * 0.5);
                b.style.transform = `scaleY(${ht.toFixed(3)})`;
            } else b.style.transform = '';
        });
    }

    if (S.playing && beat > .04) {
        document.querySelectorAll('.card').forEach((card, ci) => {
            card.classList.add('beat-active');
            const isPlaying = card.classList.contains('playing');
            const phase = Math.sin(BG.f * .06 + ci * 0.72);
            const jitter = phase * .008 * en;
            // 가로 스크롤 행(.hrow, .am-chart-row) 안의 카드는 위로 들어올리거나
            // 크게 확대하면 컨테이너 밖으로 밀려나 잘리므로, 이동 없이 은은한
            // 확대+글로우만 적용하는 "컨테이너 안전" 버전을 사용한다.
            const inScrollRow = !!card.closest('.hrow, .am-chart-row');
            if (isPlaying) {
                if (inScrollRow) {
                    const scC = 1 + beat * .022 * en;
                    const glowPxC = 4 + beat * 12 * en;
                    const glowAmtC = (.22 + beat * .32 * en).toFixed(3);
                    card.style.transform = `scale(${scC.toFixed(4)})`;
                    card.style.boxShadow =
                        `0 0 0 1.5px var(--acc),` +
                        `0 ${2 + beat * 3}px ${10 + beat * 8}px rgba(0,0,0,.45),` +
                        `0 0 ${glowPxC.toFixed(1)}px hsla(${h},${s}%,${l}%,${glowAmtC})`;
                    card.style.borderColor = `hsla(${h},${s}%,${l}%,${(.5 + beat * .5).toFixed(2)})`;
                } else {
                    const sc = 1.028 + beat * .038 * en;
                    const glowPx = 8 + beat * 28 * en;
                    const glowAmt = (.18 + beat * .35 * en).toFixed(3);
                    card.style.transform = `translateY(-7px) scale(${sc.toFixed(4)})`;
                    card.style.boxShadow =
                        `0 ${14 + beat * 18}px ${40 + beat * 28}px rgba(0,0,0,.65),` +
                        `0 0 0 1.5px var(--acc),` +
                        `0 0 ${glowPx}px ${(glowPx * .4).toFixed(1)}px hsla(${h},${s}%,${l}%,${glowAmt})`;
                    card.style.borderColor = `hsla(${h},${s}%,${l}%,${(.5 + beat * .5).toFixed(2)})`;
                }
            } else if (beat > .15 && en > .3) {
                const sc2 = 1 + beat * .012 * en + jitter;
                card.style.transform = `scale(${sc2.toFixed(4)})`;
                card.style.boxShadow = `0 ${6 + beat * 8}px ${18 + beat * 14}px rgba(0,0,0,${(.3 + beat * .2).toFixed(2)})`;
                card.style.borderColor = `rgba(255,255,255,${(.07 + beat * .10 * en).toFixed(3)})`;
            }
        });
    } else if (!S.playing || beat <= .02) {
        document.querySelectorAll('.card.beat-active').forEach(card => {
            card.classList.remove('beat-active');
            if (!card.matches(':hover')) {
                card.style.transform = '';
                card.style.boxShadow = '';
                card.style.borderColor = '';
            }
        });
    }
}
setInterval(updateNpColor, 50);

/* ════════════════════════════════════════════
   C# ↔ JS BRIDGE
════════════════════════════════════════════ */
const _cb = {}; let _cid = 0;
window.__sync = function (j) {
    try {
        const m = JSON.parse(j);
        if (m.type === 'downloadProgress') {
            if (m.videoId != null && m.percent != null)
                toast(`다운로드 ${m.percent}%`);
            return;
        }
        if (m.type === 'searchResult' || m.type === 'suggestResult'
            || m.type === 'lyricsResult' || m.type === 'downloadResult') {
            const fn = _cb[m.id]; if (fn) { delete _cb[m.id]; fn(m); }
        }
    } catch (e) { console.error(e); }
};
function callCs(p, timeoutMs = 18000) {
    return new Promise((ok, ng) => {
        const id = String(++_cid);
        _cb[id] = m => {
            if (m.type === 'lyricsResult' || m.type === 'downloadResult') { ok(m); return; }
            m.success ? ok(m) : ng(new Error(m.error || '오류'));
        };
        p.id = id;
        try { window.AndroidBridge.postMessage(JSON.stringify(p)); }
        catch { ng(new Error('브릿지 없음')); }
        setTimeout(() => { if (_cb[id]) { delete _cb[id]; ng(new Error('타임아웃')); } }, timeoutMs);
    });
}
function post(type, extra = {}) {
    try { window.AndroidBridge.postMessage(JSON.stringify({ type, ...extra })); } catch { }
}

/* ════════════════════════════════════════════
   STATE
════════════════════════════════════════════ */
const S = {
    q: [], idx: -1, track: null,
    playing: false, shuffle: false, repeat: 0,
    vol: 80, muted: false, dur: 0, cur: 0,
    favs: JSON.parse(localStorage.getItem('xw_fav') || '[]'),
    ytReady: false, ytPlayer: null, ticker: null
};

const LOCAL = { audio: null, active: false, inited: false };

function initLocalAudio() {
    if (LOCAL.inited) return;
    LOCAL.audio = document.getElementById('local-audio');
    if (!LOCAL.audio) return;
    LOCAL.inited = true;
    LOCAL.audio.addEventListener('play', () => onLocalAudioState('play'));
    LOCAL.audio.addEventListener('pause', () => onLocalAudioState('pause'));
    LOCAL.audio.addEventListener('ended', () => onLocalAudioState('ended'));
    LOCAL.audio.addEventListener('loadedmetadata', () => {
        if (!LOCAL.active) return;
        S.dur = LOCAL.audio.duration || S.track?.dur || 0;
        setT('p-tot', S.dur); setT('np-tot', S.dur);
        syncMediaSession();
    });
    LOCAL.audio.addEventListener('timeupdate', () => {
        if (!LOCAL.active || !S.playing) return;
        S.cur = LOCAL.audio.currentTime || 0;
    });
    LOCAL.audio.addEventListener('error', () => {
        if (!LOCAL.active) return;
        toast('⚠️ 로컬 재생 실패');
        const t = S.track, i = S.idx;
        stopLocalPlayback();
        if (t && S.ytReady) playTrackYt(t, i);
    });
}

function localMediaUrl(id) {
    return `https://appassets.androidplatform.net/local/${id}`;
}

function hasLocalFile(t) {
    if (!t?.id) return false;
    if (t.localFile) return true;
    try {
        return typeof AndroidBridge !== 'undefined' && AndroidBridge.hasLocalMedia(t.id);
    } catch { return false; }
}

function stopLocalPlayback() {
    LOCAL.active = false;
    if (!LOCAL.audio) return;
    LOCAL.audio.pause();
    LOCAL.audio.removeAttribute('src');
    LOCAL.audio.load();
}

function onLocalAudioState(state) {
    const code = { play: 1, pause: 2, ended: 0 }[state];
    if (code != null) onYtSt({ data: code });
}

function getPlayheadTime() {
    if (LOCAL.active && LOCAL.audio) return LOCAL.audio.currentTime || 0;
    if (S.ytPlayer && S.ytReady) {
        try { return S.ytPlayer.getCurrentTime() || 0; } catch { return 0; }
    }
    return S.cur || 0;
}

function seekToLyric(sec, e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const t = Math.max(0, Number(sec));
    if (!isFinite(t)) return;
    if (LOCAL.active && LOCAL.audio) {
        LOCAL.audio.currentTime = t;
        S.cur = t;
        if (S.playing && LOCAL.audio.paused) LOCAL.audio.play().catch(() => {});
    } else if (S.ytPlayer && S.ytReady) {
        S.ytPlayer.seekTo(t, true);
        S.cur = t;
    } else return;
    syncMediaSession();
    let idx = -1;
    for (let i = LY.lines.length - 1; i >= 0; i--) {
        if (t >= LY.lines[i].start) {
            if (t < LY.lines[i].end) idx = i;
            break;
        }
    }
    LY.curIdx = idx;
    _highlightLine(idx, true);
}

function normalizeLyricLines(lines) {
    if (!lines?.length) return [];
    const out = lines.map(l => {
        const start = +l.start;
        let end = l.end != null ? +l.end : NaN;
        if (isNaN(end) || end <= start) end = start + 4;
        return { start, end, text: String(l.text || '').trim() };
    }).filter(l => l.text && !isNaN(l.start));
    for (let i = 0; i < out.length - 1; i++) {
        if (out[i].end > out[i + 1].start) out[i].end = out[i + 1].start;
    }
    return out;
}

let _msTick = 0;
function syncMediaSession() {
    if (!S.track) return;
    const now = Date.now();
    if (now - _msTick < 400 && S.playing) return;
    _msTick = now;
    post('mediaState', {
        playing: S.playing,
        position: getPlayheadTime(),
        duration: S.dur || 0,
        title: S.track.title,
        artist: S.track.channel || 'SYNC',
        videoId: S.track.id,
        local: LOCAL.active
    });
    if (!('mediaSession' in navigator)) return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: S.track.title,
            artist: S.track.channel || 'SYNC',
            artwork: [{ src: trackThumbSrc(S.track), sizes: '512x512', type: 'image/jpeg' }]
        });
        navigator.mediaSession.playbackState = S.playing ? 'playing' : 'paused';
        if (S.dur > 0) {
            navigator.mediaSession.setPositionState({
                duration: S.dur,
                playbackRate: 1,
                position: getPlayheadTime()
            });
        }
    } catch { }
}

window.__mediaCmd = function (cmd) {
    if (cmd === 'play' && !S.playing) togglePlay();
    else if (cmd === 'pause' && S.playing) togglePlay();
    else if (cmd === 'next') nextT();
    else if (cmd === 'prev') prevT();
};

/* 앱이 백그라운드로 가기 직전, 네이티브가 같은 오디오를 이어받을 수 있도록
   유튜브 iframe 쪽 영상 재생만 멈춘다 (오디오는 네이티브 MediaPlayer가 담당). */
window.__pauseForBackground = function () {
    try {
        if (!LOCAL.active && S.ytPlayer && S.ytReady) S.ytPlayer.pauseVideo();
    } catch { }
};

/* 포그라운드로 복귀 시, 네이티브가 재생하던 위치로 맞추고 필요하면 이어서 재생 */
window.__resumeFromBackground = function (pos) {
    try {
        if (!LOCAL.active && S.ytPlayer && S.ytReady) {
            const t = Number(pos);
            if (isFinite(t) && t >= 0) S.ytPlayer.seekTo(t, true);
            if (S.playing) S.ytPlayer.playVideo();
        }
    } catch { }
};

/* ════════════════════════════════════════════
   BAR VISIBILITY
════════════════════════════════════════════ */
function updateBarVisibility() {
    document.getElementById('bar')?.classList.toggle('bar-hidden', !S.track);
}

/* ════════════════════════════════════════════
   YOUTUBE IFRAME API
════════════════════════════════════════════ */
function loadYtApi() {
    return new Promise(ok => {
        if (window.YT?.Player) { ok(); return; }
        window.onYouTubeIframeAPIReady = ok;
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
    });
}
async function initYt() {
    await loadYtApi();
    S.ytPlayer = new YT.Player('yt-player', {
        height: '166', width: '296',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, enablejsapi: 1 },
        events: { onReady: () => { S.ytReady = true; applyVol(); }, onStateChange: onYtSt, onError: onYtErr }
    });
}
function onYtSt(e) {
    const P = window.YT?.PlayerState ?? { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };
    if (e.data === P.PLAYING) {
        S.playing = true; BG.playing = true; updPlay(); startTick();
        document.getElementById('vizz').classList.remove('off');
        document.getElementById('b-art').classList.add('glow');
        if (LOCAL.active && LOCAL.audio)
            S.dur = LOCAL.audio.duration || S.track?.dur || 0;
        else
            S.dur = S.ytPlayer.getDuration() || 0;
        setT('p-tot', S.dur); setT('np-tot', S.dur);
        document.getElementById('np-ash').classList.add('playing');
        document.getElementById('np-pulse').style.display = 'block';
        startBeatTimer((MOODS[_curMood] || MOODS.default).bpm);
        syncMediaSession();
    } else if (e.data === P.PAUSED) {
        S.playing = false; BG.playing = false; updPlay(); stopTick(); stopBeatTimer();
        document.getElementById('vizz').classList.add('off');
        document.getElementById('b-art').classList.remove('glow');
        document.getElementById('np-ash').classList.remove('playing');
        document.getElementById('np-pulse').style.display = 'none';
        syncMediaSession();
    } else if (e.data === P.ENDED) {
        stopBeatTimer();
        if (S.repeat === 2) {
            if (LOCAL.active && LOCAL.audio) {
                LOCAL.audio.currentTime = 0;
                LOCAL.audio.play().catch(() => {});
            } else {
                S.ytPlayer.seekTo(0);
                S.ytPlayer.playVideo();
            }
        } else if (S.repeat === 1 || S.idx < S.q.length - 1) nextT();
        else { S.playing = false; BG.playing = false; updPlay(); stopTick(); }
    }
}
function onYtErr() { toast('⚠️ 재생 불가 — 다음 곡으로 이동합니다'); setTimeout(nextT, 1200); }
initYt();

/* ════════════════════════════════════════════
   AUTOCOMPLETE
════════════════════════════════════════════ */
let _sugTimer = null;
document.addEventListener('mousedown', e => {
    const item = e.target.closest('.sug-item');
    if (!item) return;
    e.preventDefault();
    const drop = item.closest('.sug-drop');
    const text = item.dataset.query;
    if (!text || !drop) return;
    const inp = drop.previousElementSibling?.querySelector?.('.srch-inp') ||
        drop.closest('.srch-wrap')?.querySelector('.srch-inp');
    if (inp) inp.value = text;
    drop.classList.remove('on');
    doSearch(text);
});

async function onSuggest(inp, dropId) {
    const q = inp.value.trim();
    const drop = document.getElementById(dropId);
    if (!q) { drop.classList.remove('on'); return; }
    clearTimeout(_sugTimer);
    _sugTimer = setTimeout(async () => {
        try {
            const res = await callCs({ type: 'suggest', query: q });
            const sugs = res.suggestions || [];
            if (!sugs.length) { drop.classList.remove('on'); return; }
            drop.innerHTML = sugs.map(s => `
        <div class="sug-item" data-query="${esc(s)}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
            <circle cx="5" cy="5" r="3.5"/><path d="M8 8L11 11"/>
          </svg>
          <span>${esc(s)}</span>
        </div>`).join('');
            drop.classList.add('on');
        } catch { drop.classList.remove('on'); }
    }, 220);
}

function hideSug(id) { document.getElementById(id)?.classList.remove('on'); }

/* ════════════════════════════════════════════
   SEARCH
════════════════════════════════════════════ */
async function doSearch(query) {
    if (!query?.trim()) return;
    gv('search', document.querySelector('[data-v="search"]'));
    const qi = document.getElementById('q-s'); if (qi) qi.value = query;
    hideSug('sug-s'); hideSug('sug-home');
    const area = document.getElementById('s-res');
    area.innerHTML = `<div class="state"><div class="spinner"></div><p style="margin-top:12px">검색 중...</p></div>`;
    try {
        const musicQuery = query.trim() + ' official audio OR music video OR mv OR lyrics';
        const res = await callCs({ type: 'search', query: musicQuery });
        S.q = res.tracks || [];
        if (!S.q.length) { area.innerHTML = `<div class="state"><h3>결과 없음</h3><p>다른 검색어를 시도해보세요</p></div>`; return; }
        area.innerHTML = `<div class="sh"><h2>검색 결과 <span style="font-size:12px;font-weight:400;color:var(--t3)">${S.q.length}개</span></h2></div>
      <div class="cgrid" id="sg"></div>`;
        const sg = document.getElementById('sg');
        S.q.forEach((t, i) => {
            const card = mkCard(t, i, () => { S.idx = i; playTrack(t, i); });
            sg.appendChild(card);
        });
        renderQueue();
    } catch (err) { area.innerHTML = `<div class="state"><h3>검색 실패</h3><p>${esc(err.message)}</p></div>`; }
}

async function loadRec(kw, rowId) {
    const row = document.getElementById(rowId); if (!row) return;
    row.innerHTML = `<div class="state" style="padding:28px 20px"><div class="spinner"></div></div>`;
    try {
        const res = await callCs({ type: 'search', query: kw });
        const tracks = rankMusicResults(res.tracks || []);
        if (!tracks.length) { row.innerHTML = `<div class="state" style="padding:28px"><p>결과 없음</p></div>`; return; }
        row.innerHTML = '';
        const rec = tracks.slice(0, 10);
        rec.forEach((t, i) => {
            const card = mkCard(t, i, () => { S.q = rec; S.idx = i; playTrack(t, i); });
            row.appendChild(card);
        });
    } catch { row.innerHTML = `<div class="state" style="padding:28px"><p>로드 실패</p></div>`; }
}

/* ════════════════════════════════════════════
   THUMBNAILS
════════════════════════════════════════════ */
const getThumbHq = id => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
const getThumbMd = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const getThumbSd = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

function trackThumbSrc(t) {
    if (!t) return '';
    if (t.thumbLocal) return t.thumbLocal;
    if (t.thumb) return t.thumb;
    return getThumbMd(t.id);
}

function thumbToDataUrl(url) {
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth || 320;
                c.height = img.naturalHeight || 180;
                c.getContext('2d').drawImage(img, 0, 0);
                resolve(c.toDataURL('image/jpeg', 0.82));
            } catch { resolve(url); }
        };
        img.onerror = () => resolve(url);
        img.src = url;
    });
}

/* ════════════════════════════════════════════
   CARD
════════════════════════════════════════════ */
function mkCard(t, i, playFn) {
    const f = isFav(t.id);
    const pl = S.track?.id === t.id;
    const c = document.createElement('div');
    c.className = 'card' + (pl ? ' playing' : '');
    c.dataset.id = t.id;
    c.style.animationDelay = (i * .045) + 's';
    c.innerHTML = `
    <div class="c-thumb">
      <img class="c-img"
        src="${esc(getThumbHq(t.id))}" loading="lazy"
        onerror="if(!this.dataset.f1){this.dataset.f1=1;this.src='${esc(getThumbMd(t.id))}'}else if(!this.dataset.f2){this.dataset.f2=1;this.src='${esc(getThumbSd(t.id))}'}" alt="">
      <div class="c-shine"></div>
      <div class="c-overlay">
        <button class="c-play-btn">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor"><polygon points="6,3 18,11 6,19"/></svg>
        </button>
      </div>
      <button class="c-fav${f ? ' on' : ''}" onclick="event.stopPropagation();toggleFavT(${i})">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="${f ? 'var(--acc)' : 'none'}" stroke="${f ? 'var(--acc)' : 'rgba(255,255,255,.85)'}" stroke-width="1.4" stroke-linecap="round">
          <path d="M6.5 11.5S1 8 1 5a2.8 2.8 0 0 1 5.5-1 2.8 2.8 0 0 1 5.5 1C12 8 6.5 11.5 6.5 11.5z"/>
        </svg>
      </button>
      <button class="c-pl-add" onclick="event.stopPropagation();plShowCtxById('${esc(t.id)}')" title="플레이리스트에 추가">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/>
        </svg>
      </button>
      ${t.dur ? `<span class="c-dur">${fmt(t.dur)}</span>` : ''}
      ${pl ? '<div class="c-now-bar"><span></span><span></span><span></span></div>' : ''}
    </div>
    <div class="c-info">
      <div class="c-title">${esc(t.title)}</div>
      <div class="c-ch">${esc(t.channel)}</div>
    </div>`;
    c.querySelector('.c-play-btn').addEventListener('click', e => { e.stopPropagation(); playFn(); });
    c.querySelector('.c-thumb').addEventListener('click', playFn);
    return c;
}

/* ════════════════════════════════════════════
   HOME — Apple Music 스타일 "Listen Now" 화면
   (기존 callCs/AndroidBridge 통신 계약은 그대로
   사용하며, 순수하게 홈 화면 구성/렌더링/추천만 담당)
════════════════════════════════════════════ */

/* ── 추천 품질 필터링 ──
   YouTube 검색 결과에는 실제 음원/뮤비 외에
   "플레이리스트 모음", "N시간 연속재생" 같은
   컴필레이션 영상이 섞여 있어, 제목/채널명/길이를
   기준으로 점수를 매겨 실제 곡·앨범·MV를 우선한다.
   (서버 통신 없이 프론트에서 결과만 재정렬/필터링) */
const AM_BAD_TITLE_RE = /(playlist|플레이리스트|모음|총모음|연속\s*듣기|연속\s*재생|non-?stop|dj\s*mix|radio\s*mix|compilation|winter\s*mix|summer\s*mix|greatest\s*hits|best\s*of\s*\d{4}|카라오케|karaoke\s*ver|가사\s*모음|노래\s*모음|음악\s*모음|selected|selection|\d+\s*(hour|시간)|top\s*\d{2,3}\b|hot\s*100|hot100|\bchart(s)?\b|countdown|차트|빌보드|melon\s*chart|genie\s*chart|bugs\s*chart|music\s*bank|인기가요|가요\s*톱|weekly\s*chart|daily\s*chart|monthly\s*chart|실시간\s*차트|\d+\s*곡\b|\d+\s*songs?\b|\d+\s*tracks?\b|\d+\s*hits?\b)/i;
const AM_GOOD_TITLE_RE = /(official\s*(video|audio|mv|music\s*video|teaser|trailer)|m\/v|lyrics|\(official\)|album|앨범)/i;
const AM_BAD_CHANNEL_RE = /(playlist|mix|compilation|various\s*artists|music\s*bank|radio|selected)/i;

function musicScore(t) {
    let score = 0;
    const title = (t.title || '').toLowerCase();
    const ch = (t.channel || '').toLowerCase();
    if (AM_BAD_TITLE_RE.test(title)) score -= 10;
    if (AM_GOOD_TITLE_RE.test(title)) score += 4;
    if (AM_BAD_CHANNEL_RE.test(ch)) score -= 6;
    const dur = t.dur || 0;
    if (dur > 0 && dur < 40) score -= 3;           // 너무 짧음(쇼츠/티저 조각)
    if (dur >= 60 && dur <= 420) score += 3;        // 일반적인 싱글 곡 길이
    if (dur > 1800) score -= 6;                     // 30분 초과 → 컴필레이션 가능성
    if (dur > 3600) score -= 5;                     // 1시간 초과 → 추가 감점
    return score;
}

function rankMusicResults(tracks) {
    return tracks
        .map(t => ({ t, s: musicScore(t) }))
        .filter(x => x.s > -9)
        .sort((a, b) => b.s - a.s)
        .map(x => x.t);
}

/* ── 개인화: 즐겨찾기 + 최근 재생 기록에서 선호 아티스트 추출 ── */
function getUserTaste() {
    let favs = [], recent = [];
    try { favs = JSON.parse(localStorage.getItem('xw_fav') || '[]'); } catch { }
    try { recent = JSON.parse(localStorage.getItem('xw_recent') || '[]'); } catch { }
    const combined = [...favs, ...recent];
    if (!combined.length) return null;
    const freq = {};
    combined.forEach(t => { if (t.channel) freq[t.channel] = (freq[t.channel] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    return top.length ? top : null;
}

function personalizedMadeForYouQuery() {
    const taste = getUserTaste();
    if (taste && taste[0]) return `${taste[0]} official`;
    return 'pop hits official audio 2025';
}

/* Top Picks 히어로 캐러셀 기본 믹스 — 각 항목은 실제 검색어(q)로
   트랙을 받아와 첫 곡의 썸네일을 대표 아트로 쓰고, 탭하면
   전체 목록을 큐로 재생한다. 취향 데이터가 있으면 1번 슬롯을
   선호 아티스트 기반 추천으로 대체한다 */
const AM_HERO_MIXES_BASE = [
    { badge: '오늘의 추천', title: '데일리 믹스', sub: '지금 기분에 맞는 곡', q: 'pop official music video 2025' },
    { badge: 'NEW',       title: 'K-POP 위클리',  sub: '이번 주 신곡 모음',   q: 'kpop official mv 2025' },
    { badge: 'MOOD',      title: '칠한 밤 무드',   sub: 'R&B · Soul',        q: 'r&b soul official audio' },
    { badge: 'INDIE',     title: '인디 감성',      sub: '잔잔한 인디 트랙',   q: 'indie official music video' },
    { badge: 'DRIVE',     title: '드라이브 앤썸',  sub: '달리는 순간을 위해', q: 'driving songs official audio' }
];

function buildHeroMixes() {
    const mixes = AM_HERO_MIXES_BASE.map(m => ({ ...m }));
    const taste = getUserTaste();
    if (taste && taste[0]) {
        mixes[0] = {
            badge: '나를 위한 추천',
            title: `${taste[0]}`,
            sub: '최근 즐겨듣는 아티스트',
            q: `${taste[0]} official`
        };
    }
    return mixes;
}

function mkHeroCard(mix, tracks) {
    const t = tracks[0];
    const el = document.createElement('div');
    el.className = 'am-hero-card';
    el.innerHTML = `
    <img class="am-hero-img" loading="lazy"
      src="${esc(getThumbHq(t.id))}"
      onerror="if(!this.dataset.f1){this.dataset.f1=1;this.src='${esc(getThumbMd(t.id))}'}else if(!this.dataset.f2){this.dataset.f2=1;this.src='${esc(getThumbSd(t.id))}'}" alt="">
    <div class="am-hero-scrim"></div>
    <div class="am-hero-meta">
      <span class="am-hero-badge">${esc(mix.badge)}</span>
      <div class="am-hero-title">${esc(mix.title)}</div>
      <div class="am-hero-sub">${esc(mix.sub)}</div>
    </div>`;
    el.addEventListener('click', () => { S.q = tracks; S.idx = 0; playTrack(tracks[0], 0); });
    return el;
}

async function loadTopPicks(rowId) {
    const row = document.getElementById(rowId); if (!row) return;
    row.innerHTML = `<div class="state" style="padding:40px 16px"><div class="spinner"></div></div>`;
    try {
        const mixes = buildHeroMixes();
        const results = await Promise.all(mixes.map(mix =>
            callCs({ type: 'search', query: mix.q }).then(res => rankMusicResults(res.tracks || [])).catch(() => [])
        ));
        row.innerHTML = '';
        let any = false;
        mixes.forEach((mix, i) => {
            const tracks = results[i];
            if (!tracks.length) return;
            any = true;
            const card = mkHeroCard(mix, tracks.slice(0, 10));
            card.style.animationDelay = (i * .06) + 's';
            row.appendChild(card);
        });
        if (!any) row.innerHTML = `<div class="state" style="padding:40px 16px"><p>불러오지 못했어요</p></div>`;
    } catch { row.innerHTML = `<div class="state" style="padding:40px 16px"><p>로드 실패</p></div>`; }
}

/* 차트 — "billboard hot 100" 같은 단일 차트 쿼리는 유튜브에서
   차트 모음/컴필레이션 영상을 부르기 쉬워 근본적으로 부적합하다.
   대신 장르별로 분리된 "실제 곡" 쿼리를 각각 검색해서, 필터를
   통과한 최상위 1곡만 뽑아 하나의 차트 슬롯으로 사용한다.
   → 결과적으로 모든 순위가 서로 다른 개별 곡/뮤비가 된다. */
const AM_CHART_QUERIES = [
    'pop official audio 2025',
    'kpop official mv 2025',
    'hip hop official audio 2025',
    'r&b official audio 2025',
    'rock official music video 2025',
    'edm official audio 2025',
    'ballad official audio 2025',
    'indie official audio 2025',
    'j-pop official mv 2025',
    'latin official audio 2025'
];

async function loadChart(rowId) {
    const row = document.getElementById(rowId); if (!row) return;
    row.innerHTML = `<div class="state" style="padding:28px 20px"><div class="spinner"></div></div>`;
    try {
        const results = await Promise.all(AM_CHART_QUERIES.map(q =>
            callCs({ type: 'search', query: q }).then(res => rankMusicResults(res.tracks || [])).catch(() => [])
        ));
        const chart = [];
        const seen = new Set();
        results.forEach(tracks => {
            const best = tracks.find(t => t?.id && !seen.has(t.id));
            if (best) { seen.add(best.id); chart.push(best); }
        });
        if (!chart.length) { row.innerHTML = `<div class="state" style="padding:28px"><p>결과 없음</p></div>`; return; }
        row.innerHTML = '';
        chart.forEach((t, i) => {
            const card = mkCard(t, i, () => { S.q = chart; S.idx = i; playTrack(t, i); });
            card.classList.add('am-chart-item');
            const rank = document.createElement('span');
            rank.className = 'am-rank';
            rank.textContent = i + 1;
            card.querySelector('.c-thumb')?.appendChild(rank);
            row.appendChild(card);
        });
    } catch { row.innerHTML = `<div class="state" style="padding:28px"><p>로드 실패</p></div>`; }
}

/* 최근 재생 — 재생 기록은 로컬에만 저장(서버/브릿지 통신 없음) */
function trackRecentPlay(t) {
    if (!t?.id) return;
    try {
        let arr = JSON.parse(localStorage.getItem('xw_recent') || '[]');
        arr = arr.filter(x => x.id !== t.id);
        arr.unshift({ id: t.id, title: t.title, channel: t.channel, dur: t.dur, thumb: t.thumb });
        if (arr.length > 15) arr = arr.slice(0, 15);
        localStorage.setItem('xw_recent', JSON.stringify(arr));
    } catch { }
}

function renderRecentPlayed() {
    const sh = document.getElementById('am-recent-sh');
    const row = document.getElementById('am-recent-row');
    if (!sh || !row) return;
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem('xw_recent') || '[]'); } catch { }
    if (!arr.length) { sh.style.display = 'none'; row.innerHTML = ''; return; }
    sh.style.display = '';
    row.innerHTML = '';
    arr.forEach((t, i) => {
        const card = mkCard(t, i, () => { S.q = arr; S.idx = i; playTrack(t, i); });
        row.appendChild(card);
    });
}

/* 홈 화면 전체 초기 로드 오케스트레이터 */
function initAmHome() {
    loadTopPicks('am-hero-row');
    loadRec(personalizedMadeForYouQuery(), 'am-mix-row');
    loadRec('new single official music video 2025', 'am-new-row');
    loadChart('am-chart-row');
    renderRecentPlayed();
}

/* ════════════════════════════════════════════
   PLAYBACK
════════════════════════════════════════════ */
function playIdx(i) { if (S.q[i]) { S.idx = i; playTrack(S.q[i], i); } }

function playTrack(t, idx = -1) {
    if (hasLocalFile(t)) { playTrackLocal(t, idx); return; }
    if (!S.ytReady || !S.ytPlayer) { toast('⏳ 플레이어 준비 중...'); return; }
    playTrackYt(t, idx);
}

function playTrackLocal(t, idx = -1) {
    initLocalAudio();
    if (!LOCAL.audio) { toast('로컬 플레이어 없음'); return; }
    stopLocalPlayback();
    try { S.ytPlayer?.pauseVideo(); S.ytPlayer?.stopVideo(); } catch { }
    LOCAL.active = true;
    S.track = t; S.idx = idx;
    LOCAL.audio.src = localMediaUrl(t.id);
    LOCAL.audio.load();
    applyVol();
    applyTrackUi(t);
    const playPromise = LOCAL.audio.play();
    if (playPromise?.catch) playPromise.catch(() => toast('로컬 재생 실패'));
    _clearLyrics();
    fetchLyrics(t.id);
}

function playTrackYt(t, idx = -1) {
    stopLocalPlayback();
    if (!S.ytReady || !S.ytPlayer) { toast('⏳ 플레이어 준비 중...'); return; }
    S.track = t; S.idx = idx;
    try { S.ytPlayer.stopVideo(); } catch { }
    S.ytPlayer.loadVideoById(t.id);
    applyTrackUi(t);
    _clearLyrics();
    fetchLyrics(t.id);
}

function applyTrackUi(t) {
    updateBarVisibility();
    const localThumb = trackThumbSrc(t);
    const hq = localThumb.startsWith('data:') ? localThumb : getThumbHq(t.id);
    const md = localThumb.startsWith('data:') ? localThumb : getThumbMd(t.id);
    const bArt = document.getElementById('b-art');
    bArt.src = localThumb.startsWith('data:') ? localThumb : hq;
    bArt.onerror = () => { bArt.src = md; bArt.onerror = () => { bArt.src = t.thumb || getThumbSd(t.id); }; };
    document.getElementById('b-title').textContent = t.title;
    document.getElementById('b-ch').textContent = t.channel || 'YouTube';
    updFavBtn();
    updSaveBtn();
    const npArt = document.getElementById('np-art');
    npArt.src = localThumb.startsWith('data:') ? localThumb : hq;
    npArt.onerror = () => { npArt.src = md; npArt.onerror = () => { npArt.src = t.thumb || getThumbSd(t.id); }; };
    document.getElementById('np-title').textContent = t.title;
    document.getElementById('np-ch').textContent = t.channel || 'YouTube';
    document.querySelectorAll('.card').forEach(c => {
        const playing = c.dataset.id === t.id;
        c.classList.toggle('playing', playing);
        const nb = c.querySelector('.c-now-bar');
        if (playing && !nb) {
            const th = c.querySelector('.c-thumb'); if (th) {
                const d = document.createElement('div'); d.className = 'c-now-bar';
                d.innerHTML = '<span></span><span></span><span></span>'; th.appendChild(d);
            }
        } else if (!playing && nb) nb.remove();
    });
    detectMood(t.title);
    extractThumbColors(hq, md, t.title);
    trackRecentPlay(t);
    post('setTitle', { title: t.title });
    syncMediaSession();
    renderQueue(); openNP();
    const tag = hasLocalFile(t) ? '📥 ' : '';
    toast(`${tag}▶  ${t.title.length > 40 ? t.title.slice(0, 40) + '…' : t.title}`);
    if (OV.active) {
        document.getElementById('np').classList.remove('on');
        _syncOvBar();
    }

    if (NP_LS.active) {
        const lsArt = document.getElementById('np-ls-art');
        if (lsArt) { lsArt.src = hq; lsArt.onerror = () => { lsArt.src = md; }; }
        const lsTitle = document.getElementById('np-ls-title');
        const lsCh    = document.getElementById('np-ls-ch');
        if (lsTitle) lsTitle.textContent = t.title;
        if (lsCh)    lsCh.textContent    = t.channel || 'YouTube';
    }

    if (LV.active) {
        const lvArt   = document.getElementById('np-lv-art');
        const lvTitle = document.getElementById('np-lv-title');
        const lvCh    = document.getElementById('np-lv-ch');
        if (lvArt) { lvArt.src = localThumb.startsWith('data:') ? localThumb : hq; lvArt.onerror = () => { lvArt.src = md; }; }
        if (lvTitle) lvTitle.textContent = t.title;
        if (lvCh)    lvCh.textContent    = t.channel || 'YouTube';
    }
}

function togglePlay() {
    if (LOCAL.active && LOCAL.audio) {
        if (S.playing) LOCAL.audio.pause();
        else LOCAL.audio.play().catch(() => toast('재생 실패'));
        return;
    }
    if (!S.ytPlayer || !S.ytReady) return;
    if (S.playing) S.ytPlayer.pauseVideo();
    else { if (S.track) S.ytPlayer.playVideo(); else toast('🎵 먼저 음악을 검색하세요'); }
}
function nextT() {
    if (!S.q.length) return;
    const n = S.shuffle ? Math.floor(Math.random() * S.q.length) : (S.idx + 1) % S.q.length;
    S.idx = n; playTrack(S.q[n], n);
}
function prevT() {
    if (!S.q.length) return;
    if (S.cur > 3) {
        if (LOCAL.active && LOCAL.audio) LOCAL.audio.currentTime = 0;
        else S.ytPlayer?.seekTo(0);
        return;
    }
    const p = (S.idx - 1 + S.q.length) % S.q.length;
    S.idx = p; playTrack(S.q[p], p);
}
function updPlay() {
    const on = S.playing;
    const PAUSE_PATH = `M118 116C118 91 131 80 154 80H202C225 80 238 91 238 116V396C238 421 225 432 202 432H154C131 432 118 421 118 396ZM274 116C274 91 287 80 310 80H358C381 80 394 91 394 116V396C394 421 381 432 358 432H310C287 432 274 421 274 396Z`;
    const PLAY_PATH = `M133 440a35.37 35.37 0 0 1-17.5-4.67c-12-6.8-19.46-20-19.46-34.33V111c0-14.37 7.46-27.53 19.46-34.33a35.13 35.13 0 0 1 35.77.45l247.85 148.36a36 36 0 0 1 0 61l-247.89 148.4A35.5 35.5 0 0 1 133 440`;
    document.getElementById('cb-play').innerHTML =
        `<svg viewBox="0 0 512 512" fill="currentColor"><path d="${on ? PAUSE_PATH : PLAY_PATH}"/></svg>`;
    document.getElementById('nc-play').innerHTML =
        `<svg viewBox="0 0 512 512" fill="#fff"><path d="${on ? PAUSE_PATH : PLAY_PATH}"/></svg>`;
    const lvPlay = document.getElementById('np-lv-play');
    if (lvPlay) lvPlay.innerHTML = `<svg viewBox="0 0 512 512" fill="#fff"><path d="${on ? PAUSE_PATH : PLAY_PATH}"/></svg>`;
    _syncOvPlayBtn();
}
function toggleShuf() {
    S.shuffle = !S.shuffle;
    ['cb-sh', 'nc-sh'].forEach(id => document.getElementById(id)?.classList.toggle('on', S.shuffle));
    toast(S.shuffle ? '셔플 켜짐' : '셔플 꺼짐');
}
function toggleRep() {
    S.repeat = (S.repeat + 1) % 3;
    ['cb-rep', 'nc-rep'].forEach(id => document.getElementById(id)?.classList.toggle('on', S.repeat > 0));
    toast(['반복 없음', '전체 반복', '한 곡 반복'][S.repeat]);
}
function setVol(v) {
    S.vol = v;
    ['vol-sl', 'np-vol-sl', 'ov-vol-sl'].forEach(id => { const el = document.getElementById(id); if (el) el.value = v; });
    applyVol();
    updateVolTrack(v);
    const vw = document.getElementById('vw'); if (vw) vw.style.display = v === 0 ? 'none' : 'inline';
    const ovVw = document.getElementById('ov-vw'); if (ovVw) ovVw.style.display = v === 0 ? 'none' : 'inline';
}
function updateVolTrack(v) {
    const fill = document.getElementById('np-vol-track-fill');
    if (fill) fill.style.width = v + '%';
}
(function initVolTrack() {
    const input = document.getElementById('np-vol-sl');
    const track = document.getElementById('np-vol-track');
    if (!input || !track) return;
    updateVolTrack(+input.value);

    // Drive dragging directly off the track's own pointer position rather than relying solely
    // on the native <input type=range> drag handling, which can visibly lag behind fast finger
    // movement in the WebView. This computes the value straight from pointer coordinates every
    // frame so the fill always matches the finger 1:1. The bounding rect is measured once per
    // drag (not on every move) so repeated layout reflows don't make the drag feel janky.
    let dragging = false;
    let rect = null;

    function pctFromX(clientX) {
        return Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    }

    function start(e) {
        dragging = true;
        rect = track.getBoundingClientRect();
        track.classList.add('active');
        try { track.setPointerCapture?.(e.pointerId); } catch { }
        setVol(pctFromX(e.clientX));
        e.preventDefault();
    }
    function move(e) {
        if (!dragging) return;
        setVol(pctFromX(e.clientX));
        e.preventDefault();
    }
    function end() {
        if (!dragging) return;
        dragging = false;
        track.classList.remove('active');
    }

    track.addEventListener('pointerdown', start);
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);

    // Keyboard/accessibility: the native input is no longer used for pointer interaction
    // (pointer-events: none in CSS) but still works via focus + arrow keys, and its existing
    // inline oninput handler (see index.html) continues to call setVol() as before.
})();
function applyVol() {
    if (LOCAL.active && LOCAL.audio) {
        LOCAL.audio.volume = S.muted ? 0 : S.vol / 100;
        return;
    }
    if (!S.ytPlayer || !S.ytReady) return;
    S.ytPlayer.setVolume(S.muted ? 0 : S.vol);
}
function toggleMute() {
    S.muted = !S.muted; applyVol();
    const vw = document.getElementById('vw'); if (vw) vw.style.display = S.muted ? 'none' : 'inline';
}

/* ════════════════════════════════════════════
   SEEK BARS
════════════════════════════════════════════ */
function initSeekBar(barId, fillId) {
    const bar = document.getElementById(barId);
    const fill = document.getElementById(fillId);
    if (!bar || !fill) return;
    const thumb = bar.querySelector('.pbd, .np-pd');
    let dragging = false, animPct = 0, targetPct = 0, rafId = null;
    function setPos(pct) {
        fill.style.width = pct.toFixed(3) + '%';
        if (thumb) thumb.style.left = pct.toFixed(3) + '%';
    }
    function animStep() {
        const diff = targetPct - animPct;
        if (Math.abs(diff) > .02) {
            animPct += diff * .14;
            setPos(animPct);
            rafId = requestAnimationFrame(animStep);
        } else {
            animPct = targetPct;
            setPos(targetPct);
            rafId = null;
        }
    }
    bar._setFill = (pct, instant) => {
        targetPct = pct;
        if (instant) { animPct = pct; setPos(pct); if (rafId) { cancelAnimationFrame(rafId); rafId = null; } return; }
        if (!rafId) rafId = requestAnimationFrame(animStep);
    };
    function getP(e) {
        const r = bar.getBoundingClientRect();
        return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    }
    function seek(p, instant) {
        bar._setFill(p * 100, instant);
        if (LOCAL.active && LOCAL.audio && S.dur) LOCAL.audio.currentTime = p * S.dur;
        else if (S.ytPlayer && S.ytReady && S.dur) S.ytPlayer.seekTo(p * S.dur, true);
    }
    bar.addEventListener('mousedown', e => {
        e.preventDefault(); dragging = true; bar.classList.add('dragging'); seek(getP(e), true);
    });
    document.addEventListener('mousemove', e => { if (dragging) seek(getP(e), true); });
    document.addEventListener('mouseup', e => { if (!dragging) return; dragging = false; bar.classList.remove('dragging'); seek(getP(e), true); });
    bar.addEventListener('touchstart', e => { dragging = true; bar.classList.add('dragging'); seek(getP(e.touches[0]), true); }, { passive: true });
    document.addEventListener('touchmove', e => { if (dragging) seek(getP(e.touches[0]), true); }, { passive: true });
    document.addEventListener('touchend', () => { dragging = false; bar.classList.remove('dragging'); });
}
initSeekBar('pb', 'pbf');
initSeekBar('np-pb', 'np-pf');
initSeekBar('np-lv-pb', 'np-lv-pf');

/* ════════════════════════════════════════════
   TICK
════════════════════════════════════════════ */
function startTick() {
    stopTick();
    S.ticker = setInterval(() => {
        try {
            if (LOCAL.active && LOCAL.audio) {
                S.cur = LOCAL.audio.currentTime || 0;
                S.dur = LOCAL.audio.duration || S.track?.dur || 0;
            } else {
                if (!S.ytPlayer || !S.ytReady) return;
                S.cur = S.ytPlayer.getCurrentTime() || 0;
                S.dur = S.ytPlayer.getDuration() || 0;
            }
            const pct = S.dur ? (S.cur / S.dur) * 100 : 0;
            const pb = document.getElementById('pb');
            const npb = document.getElementById('np-pb');
            const ovb = document.getElementById('ov-pb');
            const lvpb = document.getElementById('np-lv-pb');
            if (!pb?.classList.contains('dragging')) pb?._setFill?.(pct);
            if (!npb?.classList.contains('dragging')) npb?._setFill?.(pct);
            if (OV.active && !ovb?.classList.contains('dragging')) ovb?._setFill?.(pct);
            if (LV.active && !lvpb?.classList.contains('dragging')) lvpb?._setFill?.(pct);
            setT('p-cur', S.cur); setT('np-cur', S.cur);
            setT('p-tot', S.dur); setT('np-tot', S.dur);
            if (OV.active) { setT('ov-p-cur', S.cur); setT('ov-p-tot', S.dur); }
            const bpf = document.getElementById('bar-prog-fill');
            if (bpf) bpf.style.width = pct.toFixed(2) + '%';
            syncMediaSession();
        } catch { }
    }, 250);
}
function stopTick() { clearInterval(S.ticker); }

/* ════════════════════════════════════════════
   NOW PLAYING
════════════════════════════════════════════ */
function openNP() {
    document.getElementById('np').classList.add('on');
    updFavBtn();
    if (LY.lines.length > 0) _startLyricsTick();
}
function closeNP() {
    // 랜드스케이프 모드면 먼저 해제
    if (NP_LS.active) _exitNpLandscape();
    if (LV.active) closeLyricsView();
    document.getElementById('np').classList.remove('on');
    _stopLyricsTick();
}

/* ════════════════════════════════════════════
   NP LANDSCAPE FULLSCREEN (Android 전용)
════════════════════════════════════════════ */
const NP_LS = {
    active: false,
    ticker: null,
    curIdx: -1,
    _scrollSpring: null
};

function toggleNpFullscreen() {
    if (NP_LS.active) {
        _exitNpLandscape();
    } else {
        _enterNpLandscape();
    }
}

function _enterNpLandscape() {
    if (LV.active) closeLyricsView();
    NP_LS.active = true;
    const np = document.getElementById('np');
    if (!np) return;

    // DOM 먼저 구성
    _buildLandscapeDOM();
    _renderLsLyrics();
    _startLsTick();

    document.getElementById('np-fs-btn')?.classList.add('on');

    // 가로 전환
    setTimeout(() => {
        try {
            window.AndroidBridge.postMessage(JSON.stringify({
                type: 'orientation', value: 'landscape'
            }));
        } catch(e) {}
    }, 50);
}

function _exitNpLandscape() {
    NP_LS.active = false;
    const np = document.getElementById('np');
    if (!np) return;

    if (NP_LS._scrollSpring) { NP_LS._scrollSpring.stop(); NP_LS._scrollSpring = null; }
    np.style.flexDirection = '';
    np.style.overflow = '';

    document.getElementById('np-fs-btn')?.classList.remove('on');
    _destroyLandscapeDOM();
    _stopLsTick();

    setTimeout(() => {
        try {
            window.AndroidBridge.postMessage(JSON.stringify({
                type: 'orientation', value: 'portrait'
            }));
        } catch(e) {}
    }, 50);
}

function _buildLandscapeDOM() {
    const np = document.getElementById('np');
    if (!np || document.getElementById('np-ls-left')) return;

    // 기존 요소 숨기기
    const artArea = np.querySelector('.np-art-area');
    const panel   = np.querySelector('.np-panel');
    if (artArea) artArea.style.display = 'none';
    if (panel)   panel.style.display   = 'none';

    // np 자체를 flex row로
    np.style.flexDirection = 'row';
    np.style.overflow = 'hidden';

    // ── 왼쪽 컬럼 ──
    const left = document.createElement('div');
    left.id = 'np-ls-left';
    left.style.cssText = [
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'justify-content:center',
        'width:40%',
        'height:100%',
        'padding:20px 14px 20px 24px',
        'box-sizing:border-box',
        'position:relative',
        'z-index:10',
        'flex-shrink:0'
    ].join(';');

    // 앨범 아트
    const artShell = document.createElement('div');
    artShell.style.cssText = [
        'width:min(190px,24vw)',
        'aspect-ratio:1',
        'border-radius:10px',
        'overflow:hidden',
        'flex-shrink:0',
        'box-shadow:0 24px 80px rgba(0,0,0,0.85)',
        'position:relative'
    ].join(';');
    const artImg = document.createElement('img');
    artImg.id = 'np-ls-art';
    artImg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:10px;display:block;';
    const origArt = document.getElementById('np-art');
    if (origArt) artImg.src = origArt.src;
    artShell.appendChild(artImg);
    left.appendChild(artShell);

    // 곡명 + 아티스트
    const meta = document.createElement('div');
    meta.style.cssText = 'width:100%;margin-top:10px;padding:0 4px;';
    const titleEl = document.createElement('div');
    titleEl.id = 'np-ls-title';
    titleEl.style.cssText = [
        'font-size:11px',
        'font-weight:700',
        'color:rgba(255,255,255,0.96)',
        'white-space:nowrap',
        'overflow:hidden',
        'text-overflow:ellipsis',
        'letter-spacing:-0.3px',
        'margin-bottom:3px'
    ].join(';');
    titleEl.textContent = S.track?.title || '—';
    const chEl = document.createElement('div');
    chEl.id = 'np-ls-ch';
    chEl.style.cssText = 'font-size:9.5px;color:rgba(255,255,255,0.48);';
    chEl.textContent = S.track?.channel || '—';
    meta.appendChild(titleEl);
    meta.appendChild(chEl);
    left.appendChild(meta);

    // 재생바
    const prog = document.createElement('div');
    prog.style.cssText = 'width:100%;margin-top:8px;padding:0 4px;';
    prog.innerHTML = `
        <div id="np-ls-pb" style="height:3px;background:rgba(255,255,255,0.18);border-radius:10px;cursor:pointer;position:relative;">
            <div id="np-ls-pf" style="height:100%;background:rgba(255,255,255,0.90);border-radius:10px;width:0%;pointer-events:none;transition:width 0.25s linear;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;">
            <span id="np-ls-cur" style="font-size:8.5px;color:rgba(255,255,255,0.38);font-family:'DM Mono',monospace;">0:00</span>
            <span id="np-ls-tot" style="font-size:8.5px;color:rgba(255,255,255,0.38);font-family:'DM Mono',monospace;">0:00</span>
        </div>
    `;
    left.appendChild(prog);

    // seek 터치 이벤트
    setTimeout(() => {
        const pb = document.getElementById('np-ls-pb');
        if (!pb) return;
        const doSeek = (clientX) => {
            const r = pb.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
            const pos = p * (S.dur || 0);
            if (LOCAL.active && LOCAL.audio) LOCAL.audio.currentTime = pos;
            else if (S.ytPlayer && S.ytReady && S.dur) S.ytPlayer.seekTo(pos, true);
        };
        pb.addEventListener('click', e => doSeek(e.clientX));
        pb.addEventListener('touchstart', e => { e.preventDefault(); doSeek(e.touches[0].clientX); }, { passive: false });
    }, 100);

    // ── 오른쪽 컬럼: 가사 ──
    const right = document.createElement('div');
    right.id = 'np-ls-right';
right.style.cssText = [
        'display:flex',
        'flex-direction:column',
        'justify-content:center',
        'width:60%',
        'height:100%',
        'padding:20px 28px 20px 12px',
        'box-sizing:border-box',
        'overflow:hidden',
        'position:relative',
        'z-index:10',
        '-webkit-mask-image:linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
        'mask-image:linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)'
    ].join(';');

    const scroll = document.createElement('div');
    scroll.id = 'np-ls-scroll';
    scroll.style.cssText = [
        'overflow-y:hidden',
        'overflow-x:hidden',
        'height:100%',
        'padding:30px 8px',
        'box-sizing:border-box',
        'position:relative',
        'scrollbar-width:none',
        '-ms-overflow-style:none'
    ].join(';');
    right.appendChild(scroll);

    np.appendChild(left);
    np.appendChild(right);
}

function _destroyLandscapeDOM() {
    document.getElementById('np-ls-left')?.remove();
    document.getElementById('np-ls-right')?.remove();
    const np = document.getElementById('np');
    if (!np) return;
    const artArea = np.querySelector('.np-art-area');
    const panel   = np.querySelector('.np-panel');
    if (artArea) artArea.style.display = '';
    if (panel)   panel.style.display   = '';
}

function _renderLsLyrics() {
    const scroll = document.getElementById('np-ls-scroll');
    if (!scroll) return;
    scroll.innerHTML = '';

    const inner = document.createElement('div');
    inner.id = 'np-ls-inner';
    inner.style.cssText = 'position:relative;will-change:transform;';
    scroll.appendChild(inner);

    _attachLyricDragScroll(
        scroll,
        () => document.getElementById('np-ls-inner'),
        () => NP_LS._scrollSpring,
        () => _highlightLsLine(NP_LS.curIdx)
    );

    if (!LY.lines.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;color:rgba(255,255,255,0.28);font-size:13px;padding:40px 0;';
        empty.textContent = '가사를 찾을 수 없습니다';
        inner.appendChild(empty);
        return;
    }

    LY.lines.forEach((line, i) => {
        const el = document.createElement('div');
        el.className = 'np-ls-lyric-line';
        el.style.cssText = [
            'font-size:clamp(16px,2.2vw,24px)',
            'font-weight:700',
            'line-height:1.55',
            'color:rgba(255,255,255,0.00)',
            'padding:6px 0',
            'cursor:pointer',
            'word-break:keep-all',
            'overflow-wrap:break-word',
            'will-change:color,filter'
        ].join(';');
        el.textContent = line.text;
        el.addEventListener('click', e => seekToLyric(line.start + 0.05, e));
        inner.appendChild(el);
        LY.lines[i].el_ls = el;
    });
    NP_LS.curIdx = -1;
    NP_LS._scrollSpring = _makeSpring();
}

function _startLsTick() {
    _stopLsTick();
    NP_LS.ticker = setInterval(_syncLsLyrics, 40);
}
function _stopLsTick() {
    clearInterval(NP_LS.ticker);
    NP_LS.ticker = null;
}

function _syncLsLyrics() {
    try {
        const cur = getPlayheadTime();
        const dur = LOCAL.active && LOCAL.audio
            ? (LOCAL.audio.duration || S.dur || 0)
            : (S.ytPlayer?.getDuration?.() || S.dur || 0);
        const pct = dur ? (cur / dur) * 100 : 0;

        // 재생바 업데이트
        const pf = document.getElementById('np-ls-pf');
        if (pf) pf.style.width = pct.toFixed(2) + '%';
        const curEl = document.getElementById('np-ls-cur');
        const totEl = document.getElementById('np-ls-tot');
        if (curEl) curEl.textContent = fmt(cur);
        if (totEl) totEl.textContent = fmt(dur);

        // 아트 / 곡명 동기화
        const origArt = document.getElementById('np-art');
        const lsArt   = document.getElementById('np-ls-art');
        if (origArt && lsArt && origArt.src !== lsArt.src) lsArt.src = origArt.src;

        if (!LY.lines.length) return;

        // 가사 싱크
        let found = -1;
        for (let i = LY.lines.length - 1; i >= 0; i--) {
            if (cur >= LY.lines[i].start) {
                if (cur < LY.lines[i].end) found = i;
                break;
            }
        }
        if (found === NP_LS.curIdx) return;
        NP_LS.curIdx = found;
        _highlightLsLine(found);
    } catch(e) {}
}

function _highlightLsLine(idx) {
    const scroll = document.getElementById('np-ls-scroll');
    LY.lines.forEach((line, i) => {
        if (!line.el_ls) return;
        const el = line.el_ls;
        const d = idx < 0 ? 999 : i - idx;
        el.classList.remove('ls-active', 'ls-prev', 'ls-near');
        if (d === 0) {
            el.style.color      = 'rgba(255,255,255,0.97)';
            el.style.fontWeight = '800';
            el.style.filter     = 'drop-shadow(0 0 16px rgba(255,255,255,0.16))';
            el.classList.add('ls-active');
        } else if (d === -1) {
            el.style.color      = 'rgba(255,255,255,0.52)';
            el.style.fontWeight = '700';
            el.style.filter     = 'none';
            el.classList.add('ls-prev');
        } else if (d === -2) {
            el.style.color      = 'rgba(255,255,255,0.18)';
            el.style.fontWeight = '700';
            el.style.filter     = 'none';
            el.classList.add('ls-near');
        } else if (d === 1) {
            el.style.color      = 'rgba(255,255,255,0.30)';
            el.style.fontWeight = '700';
            el.style.filter     = 'none';
            el.classList.add('ls-near');
        } else if (d === 2) {
            el.style.color      = 'rgba(255,255,255,0.14)';
            el.style.fontWeight = '700';
            el.style.filter     = 'none';
            el.classList.add('ls-near');
        } else {
            /* 범위 밖 줄: 완전 투명 → 5줄 밖은 안 보임 */
            el.style.color      = 'rgba(255,255,255,0.00)';
            el.style.fontWeight = '700';
            el.style.filter     = 'none';
        }
    });
    if (idx >= 0 && LY.lines[idx]?.el_ls && scroll) {
        const el = LY.lines[idx].el_ls;
        const inner = document.getElementById('np-ls-inner');
        if (!inner) return;
        const padTop = parseFloat(getComputedStyle(scroll).paddingTop) || 0;
        const target = (scroll.clientHeight / 2) - padTop - (el.offsetTop + el.offsetHeight / 2);
        if (!NP_LS._scrollSpring) NP_LS._scrollSpring = _makeSpring();
        NP_LS._scrollSpring.to(target, (pos, vel) => {
            inner.style.transform = `translateY(${pos}px)`;
            const spread = Math.max(-20, Math.min(20, vel * -0.055));
            LY.lines.forEach((line, i) => {
                if (!line.el_ls) return;
                const d = i - idx;
                if (d === 0) { line.el_ls.style.transform = 'translateY(0px)'; return; }
                const k = Math.sign(d) * Math.min(Math.abs(d), 4);
                line.el_ls.style.transform = `translateY(${spread * k}px)`;
            });
        });
    }
}

/* ════════════════════════════════════════════
   FAVORITES
════════════════════════════════════════════ */
function isFav(id) { return S.favs.some(f => f.id === id); }
function saveFavs() { localStorage.setItem('xw_fav', JSON.stringify(S.favs)); }
function toggleFavT(idx) {
    const t = S.q[idx]; if (!t) return;
    if (isFav(t.id)) { S.favs = S.favs.filter(f => f.id !== t.id); toast('즐겨찾기 제거'); }
    else { S.favs.push(t); toast('✦ 즐겨찾기 추가'); }
    // Update the heart color FIRST, before anything else. saveFavs/refreshDots/render* below
    // are wrapped so that if any one of them throws (e.g. on unexpected track data), it can
    // no longer silently stop this function partway through and skip the visual update —
    // which is exactly what made the heart appear to "not respond" in some cases.
    if (S.track?.id === t.id) updFavBtn();
    try { saveFavs(); } catch (e) { console.error('saveFavs failed', e); }
    try { refreshDots(); } catch (e) { console.error('refreshDots failed', e); }
    try { renderFavSide(); } catch (e) { console.error('renderFavSide failed', e); }
    try { renderFavGrid(); } catch (e) { console.error('renderFavGrid failed', e); }
}
function favCur() {
    if (!S.track) return;
    const i = S.q.findIndex(t => t.id === S.track.id);
    if (i >= 0) { toggleFavT(i); return; }
    if (isFav(S.track.id)) { S.favs = S.favs.filter(f => f.id !== S.track.id); toast('즐겨찾기 제거'); }
    else { S.favs.push(S.track); toast('✦ 즐겨찾기 추가'); }
    updFavBtn();
    try { saveFavs(); } catch (e) { console.error('saveFavs failed', e); }
    try { renderFavSide(); } catch (e) { console.error('renderFavSide failed', e); }
    try { renderFavGrid(); } catch (e) { console.error('renderFavGrid failed', e); }
}
function _accentColor() {
    // Resolve the --acc custom property to its literal value (e.g. "#fa2d5a") rather than
    // writing the string "var(--acc)" into an SVG presentation attribute: presentation
    // attributes are parsed with the SVG attribute grammar, and unlike a normal stylesheet
    // rule, var() inside them is not reliably supported across WebView engines — it can be
    // silently ignored, which would explain the color never visibly appearing.
    const v = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
    return v || '#fa2d5a';
}
function updFavBtn() {
    const f = !!(S.track && isFav(S.track.id));
    const color = f ? _accentColor() : null;
    ['b-fav', 'np-fav'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.toggle('on', f);
        // Set the SVG path's fill/stroke directly via attribute (not .style) using the
        // resolved literal color — this wins over the inherited "fill=none" presentation
        // attribute on the parent <svg> and doesn't depend on any CSS cascade/specificity
        // or var()-in-attribute support, so the heart reliably colors in immediately.
        // When off, the attributes are removed so each icon falls back to its own default.
        btn.querySelectorAll('svg path').forEach(p => {
            if (f) { p.setAttribute('fill', color); p.setAttribute('stroke', color); }
            else { p.removeAttribute('fill'); p.removeAttribute('stroke'); }
        });
    });
}

async function fetchLyricsForSave(track) {
    const { id, title, channel } = track;
    if (LY.videoId === id && LY.lines.length)
        return LY.lines.map(l => ({ start: l.start, end: l.end, text: l.text }));
    let duration = track.dur || S.dur || 0;
    if (!duration && S.ytPlayer && S.ytReady) {
        try { duration = S.ytPlayer.getDuration() || 0; } catch { }
    }
    if (!duration) {
        for (let i = 0; i < 6 && !duration; i++) {
            await new Promise(r => setTimeout(r, 500));
            duration = track.dur || S.dur || 0;
            if (!duration && S.ytPlayer && S.ytReady) {
                try { duration = S.ytPlayer.getDuration() || 0; } catch { }
            }
        }
    }
    const res = await callCs({ type: 'fetchLyrics', videoId: id, title, channel, duration });
    if (res.success && res.lines?.length) return normalizeLyricLines(res.lines);
    return [];
}

async function saveLocalMusic() {
    if (!S.track) return;
    const pl = ensureLocalPlaylist();
    if (pl.tracks.some(t => t.id === S.track.id)) {
        toast('이미 local music에 저장됨');
        updSaveBtn();
        return;
    }
    toast('저장 중…');
    try {
        let lyrics = [];
        try {
            const fetched = await fetchLyricsForSave(S.track);
            lyrics = normalizeLyricLines(fetched || []);
        } catch { /* 가사 없어도 저장 */ }
        toast('영상 다운로드 중… (처음은 시간이 걸릴 수 있어요)');
        const dl = await callCs({ type: 'downloadVideo', videoId: S.track.id }, 900000);
        if (!dl.success) throw new Error(dl.error || '다운로드 실패');
        const thumbUrl = getThumbMd(S.track.id);
        const thumbLocal = await thumbToDataUrl(thumbUrl);
        pl.tracks.push({
            id: S.track.id,
            title: S.track.title,
            channel: S.track.channel,
            dur: S.track.dur || S.dur || 0,
            thumb: S.track.thumb || thumbUrl,
            thumbLocal: thumbLocal.startsWith('data:') ? thumbLocal : '',
            localFile: true,
            lyrics
        });
        plSave();
        if (PL.curId === LOCAL_PL_ID) plRenderDetail(LOCAL_PL_ID);
        plRenderGrid();
        toast(lyrics.length ? '✦ local music에 저장됨' : '✦ 저장됨 (가사 없음)');
        updSaveBtn();
    } catch {
        toast('저장 실패');
    }
}

function updSaveBtn() {
    const on = S.track && isLocalSaved(S.track.id);
    document.getElementById('np-save')?.classList.toggle('on', !!on);
}
function refreshDots() {
    document.querySelectorAll('.c-fav').forEach(d => {
        const id = d.closest('.card')?.dataset?.id; if (!id) return;
        const f = isFav(id); d.classList.toggle('on', f);
        const p = d.querySelector('path'); if (p) {
            p.setAttribute('fill', f ? _accentColor() : 'none');
            p.setAttribute('stroke', f ? _accentColor() : 'rgba(255,255,255,.85)');
        }
    });
}
function renderFavSide() {
    const el = document.getElementById('fav-side');
    if (!S.favs.length) { el.innerHTML = '<div class="fi-empty">즐겨찾기 없음</div>'; return; }
    el.innerHTML = S.favs.map((f, i) => `
    <div class="fi" onclick="playFav(${i})">
      <img class="fi-art" src="${esc(getThumbMd(f.id))}" onerror="this.src='${esc(f.thumb)}'" alt="">
      <div class="fi-m"><div class="fi-t">${esc(f.title)}</div><div class="fi-c">${esc(f.channel)}</div></div>
    </div>`).join('');
}
function renderFavGrid() {
    const g = document.getElementById('fav-grid');
    if (!S.favs.length) {
        g.innerHTML = `<div class="state" style="grid-column:1/-1">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <path d="M22 38S6 28 6 18a9 9 0 0 1 16-5.6A9 9 0 0 1 38 18C38 28 22 38 22 38z"/>
      </svg><h3>즐겨찾기가 비었어요</h3></div>`;
        return;
    }
    g.innerHTML = '';
    S.favs.forEach((t, i) => {
        const card = mkCard(t, i, () => { S.q = [...S.favs]; S.idx = i; playTrack(t, i); });
        g.appendChild(card);
    });
}
function playFav(i) { S.q = [...S.favs]; S.idx = i; playTrack(S.favs[i], i); }

/* ════════════════════════════════════════════
   QUEUE
════════════════════════════════════════════ */
function renderQueue() {
    const wrap = document.getElementById('q-list');
    if (!S.q.length) {
        wrap.innerHTML = `<div class="state"><svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6 11h32M6 22h22M6 33h28"/></svg><h3>대기열 없음</h3></div>`; return;
    }
    wrap.innerHTML = S.q.map((t, i) => `
    <div class="lcard${i === S.idx ? ' playing' : ''}" onclick="playIdx(${i})">
      <span class="lcard-n">${i + 1}</span>
      <img class="lcard-art" src="${esc(getThumbMd(t.id))}" onerror="this.src='${esc(t.thumb)}'" alt="">
      <div class="lcard-m">
        <div class="lcard-t">${esc(t.title)}</div>
        <div class="lcard-c">${esc(t.channel)}</div>
      </div>
      <span class="lcard-d">${fmt(t.dur)}</span>
      ${i === S.idx ? `<svg width="13" height="13" viewBox="0 0 13 13" fill="var(--acc)"><polygon points="3,2 11,6.5 3,11"/></svg>` : ''}
    </div>`).join('');
}

/* ════════════════════════════════════════════
   VIEWS / ROUTING
════════════════════════════════════════════ */
function gv(v, el) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('on'));
    document.getElementById('v-' + v)?.classList.add('on');
    document.querySelectorAll('.nb').forEach(e => e.classList.remove('on'));
    el?.classList.add('on');
    document.querySelectorAll('.mn-btn').forEach(e => e.classList.remove('on'));
    document.querySelector(`.mn-btn[data-v="${v}"]`)?.classList.add('on');
    if (v === 'home') renderRecentPlayed();
    if (v === 'fav') renderFavGrid();
    if (v === 'queue') renderQueue();
    if (v === 'playlists') plRenderGrid();
}

/* ════════════════════════════════════════════
   PLAYLIST SYSTEM
════════════════════════════════════════════ */
const PL = {
    lists: JSON.parse(localStorage.getItem('xw_pl') || '[]'),
    curId: null
};

const LOCAL_PL_ID = '__local_music__';
const LOCAL_PL_NAME = 'local music';

function ensureLocalPlaylist() {
    let pl = PL.lists.find(p => p.id === LOCAL_PL_ID);
    if (!pl) {
        pl = { id: LOCAL_PL_ID, name: LOCAL_PL_NAME, tracks: [], system: true };
        PL.lists.unshift(pl);
        plSave();
    }
    return pl;
}

function findLocalTrack(id) {
    return plById(LOCAL_PL_ID)?.tracks.find(t => t.id === id) || null;
}

function isLocalSaved(id) { return !!findLocalTrack(id); }

function plSave() { localStorage.setItem('xw_pl', JSON.stringify(PL.lists)); }
function plById(id) { return PL.lists.find(p => p.id === id); }

let _dlgResolve = null;
function plDialog(title, defaultVal = '') {
    return new Promise(resolve => {
        _dlgResolve = resolve;
        document.getElementById('pl-dialog-title').textContent = title;
        const inp = document.getElementById('pl-dialog-input');
        inp.value = defaultVal;
        document.getElementById('pl-dialog-overlay').classList.add('on');
        setTimeout(() => inp.focus(), 80);
    });
}
function plDialogConfirm() {
    const val = document.getElementById('pl-dialog-input').value.trim();
    document.getElementById('pl-dialog-overlay').classList.remove('on');
    if (_dlgResolve) { _dlgResolve(val || null); _dlgResolve = null; }
}
function plDialogCancel() {
    document.getElementById('pl-dialog-overlay').classList.remove('on');
    if (_dlgResolve) { _dlgResolve(null); _dlgResolve = null; }
}

let _confirmResolve = null;
function plConfirm(title, msg) {
    return new Promise(resolve => {
        _confirmResolve = resolve;
        document.getElementById('pl-confirm-title').textContent = title;
        document.getElementById('pl-confirm-msg').textContent = msg;
        document.getElementById('pl-confirm-overlay').classList.add('on');
    });
}
function plConfirmOk() {
    document.getElementById('pl-confirm-overlay').classList.remove('on');
    if (_confirmResolve) { _confirmResolve(true); _confirmResolve = null; }
}
function plConfirmCancel() {
    document.getElementById('pl-confirm-overlay').classList.remove('on');
    if (_confirmResolve) { _confirmResolve(false); _confirmResolve = null; }
}

async function plNewPrompt(defaultName = '') {
    const name = await plDialog('새 플레이리스트', defaultName);
    if (!name) return null;
    const pl = { id: Date.now().toString(), name, tracks: [] };
    PL.lists.unshift(pl);
    plSave(); plRenderGrid();
    return pl.id;
}

async function plRenamePrompt() {
    const pl = plById(PL.curId); if (!pl) return;
    if (pl.system || pl.id === LOCAL_PL_ID) { toast('이 플레이리스트는 이름을 바꿀 수 없어요'); return; }
    const name = await plDialog('이름 변경', pl.name);
    if (!name || name === pl.name) return;
    pl.name = name; plSave();
    document.getElementById('pl-detail-name').textContent = pl.name;
    plRenderGrid();
}

async function plDeleteCurrent() {
    const pl = plById(PL.curId); if (!pl) return;
    if (pl.system || pl.id === LOCAL_PL_ID) { toast('이 플레이리스트는 삭제할 수 없어요'); return; }
    const ok = await plConfirm('플레이리스트 삭제', `"${pl.name}" 플레이리스트를 삭제할까요?`);
    if (!ok) return;
    PL.lists = PL.lists.filter(p => p.id !== PL.curId);
    PL.curId = null; plSave(); plShowList();
}

function plAddTrack(plId, track) {
    const pl = plById(plId); if (!pl) return false;
    if (pl.tracks.some(t => t.id === track.id)) { toast('이미 추가된 곡이에요'); return false; }
    pl.tracks.push({ id: track.id, title: track.title, channel: track.channel, dur: track.dur, thumb: track.thumb });
    plSave();
    if (PL.curId === plId) plRenderDetail(plId);
    toast(`✦ "${pl.name}"에 추가됨`);
    return true;
}

function plRemoveTrack(plId, trackId) {
    const pl = plById(plId); if (!pl) return;
    pl.tracks = pl.tracks.filter(t => t.id !== trackId);
    plSave(); plRenderDetail(plId);
}

function plPlayAll() {
    const pl = plById(PL.curId); if (!pl || !pl.tracks.length) return;
    S.q = [...pl.tracks]; S.idx = 0; playTrack(pl.tracks[0], 0);
}

function plRenderGrid() {
    const g = document.getElementById('pl-grid'); if (!g) return;
    if (!PL.lists.length) {
        g.innerHTML = `<div class="state" style="grid-column:1/-1">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="4" width="14" height="14" rx="2"/><rect x="26" y="4" width="14" height="14" rx="2"/>
        <rect x="4" y="26" width="14" height="14" rx="2"/>
        <line x1="33" y1="26" x2="33" y2="40"/><line x1="26" y1="33" x2="40" y2="33"/>
      </svg>
      <h3>플레이리스트가 없어요</h3>
      <p>상단의 + 버튼으로 만들어보세요</p>
    </div>`;
        return;
    }
    g.innerHTML = '';
    PL.lists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'pl-card';
        const thumbs = pl.tracks.slice(0, 4).map(t => trackThumbSrc(t));
        const coverHtml = thumbs.length === 0
            ? `<div class="pl-cover-empty"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="13" height="13" rx="2"/><rect x="23" y="4" width="13" height="13" rx="2"/><rect x="4" y="23" width="13" height="13" rx="2"/><line x1="29.5" y1="23" x2="29.5" y2="36"/><line x1="23" y1="29.5" x2="36" y2="29.5"/></svg></div>`
            : `<div class="pl-cover${thumbs.length === 1 ? ' single' : ''}">${thumbs.map(src => `<img src="${esc(src)}" onerror="this.src=''" alt="">`).join('')}</div>`;
        card.innerHTML = `${coverHtml}
      <div class="pl-card-info">
        <div class="pl-card-name">${esc(pl.name)}</div>
        <div class="pl-card-count">${pl.tracks.length}곡</div>
      </div>`;
        card.addEventListener('click', () => plRenderDetail(pl.id));
        g.appendChild(card);
    });
}

function plRenderDetail(plId) {
    const pl = plById(plId); if (!pl) return;
    PL.curId = plId;
    document.getElementById('pl-list-view').style.display = 'none';
    document.getElementById('pl-detail-view').style.display = '';
    document.getElementById('pl-detail-name').textContent = pl.name;
    document.getElementById('pl-detail-count').textContent = `${pl.tracks.length}곡`;
    const cover = document.getElementById('pl-detail-cover');
    const thumbs = pl.tracks.slice(0, 4).map(t => trackThumbSrc(t));
    cover.className = 'pl-detail-cover' + (thumbs.length === 1 ? ' single' : '');
    cover.innerHTML = thumbs.length
        ? thumbs.map(src => `<img src="${esc(src)}" alt="">`).join('')
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--glass-md)"><svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 9h24M4 16h16M4 23h20"/></svg></div>`;
    const list = document.getElementById('pl-track-list');
    if (!pl.tracks.length) {
        list.innerHTML = `<div class="state">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 9h30M3 18h20M3 27h24"/></svg>
      <h3 style="font-size:14px">곡이 없어요</h3>
      <p>상단의 곡 추가 버튼을 눌러보세요</p>
    </div>`;
        return;
    }
    list.innerHTML = '';
    pl.tracks.forEach((t, i) => {
        const row = document.createElement('div');
        row.className = 'pl-track' + (S.track?.id === t.id ? ' playing' : '');
        row.innerHTML = `
      <span class="pl-track-num">${i + 1}</span>
      <img class="pl-track-art" src="${esc(trackThumbSrc(t))}" onerror="this.src='${esc(t.thumb || getThumbMd(t.id))}'" alt="">
      <div class="pl-track-m">
        <div class="pl-track-t">${esc(t.title)}</div>
        <div class="pl-track-c">${esc(t.channel)}</div>
      </div>
      <span class="pl-track-dur">${fmt(t.dur)}</span>
      <button class="pl-track-del" onclick="event.stopPropagation();plRemoveTrack('${esc(plId)}','${esc(t.id)}')" title="제거">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <line x1="1.5" y1="1.5" x2="9.5" y2="9.5"/><line x1="9.5" y1="1.5" x2="1.5" y2="9.5"/>
        </svg>
      </button>`;
        row.addEventListener('click', () => { S.q = [...pl.tracks]; S.idx = i; playTrack(t, i); });
        list.appendChild(row);
    });
}

function plShowList() {
    PL.curId = null;
    document.getElementById('pl-list-view').style.display = '';
    document.getElementById('pl-detail-view').style.display = 'none';
    plRenderGrid();
}

let _plAddTimer = null;
function plAddModalOpen() {
    document.getElementById('pl-add-modal-overlay').classList.add('on');
    const inp = document.getElementById('pl-add-modal-inp');
    inp.value = '';
    document.getElementById('pl-add-modal-results').innerHTML =
        `<div class="pl-add-modal-hint">검색어를 입력하세요</div>`;
    setTimeout(() => inp.focus(), 80);
}
function plAddModalClose() {
    document.getElementById('pl-add-modal-overlay').classList.remove('on');
    clearTimeout(_plAddTimer);
}
async function plAddModalSearch(q, immediate = false) {
    q = q?.trim();
    if (!q) {
        document.getElementById('pl-add-modal-results').innerHTML =
            `<div class="pl-add-modal-hint">검색어를 입력하세요</div>`;
        return;
    }
    clearTimeout(_plAddTimer);
    _plAddTimer = setTimeout(async () => {
        const res = document.getElementById('pl-add-modal-results');
        res.innerHTML = `<div class="pl-add-modal-hint"><div class="spinner" style="width:20px;height:20px;border-width:1.5px;margin:0 auto 8px"></div>검색 중...</div>`;
        try {
            const data = await callCs({ type: 'search', query: q + ' official audio OR music video OR mv' });
            const tracks = (data.tracks || []).slice(0, 5); // 한번에 나타나는 개수를 줄여 스캔하기 편하게
            if (!tracks.length) { res.innerHTML = `<div class="pl-add-modal-hint">결과가 없어요</div>`; return; }
            res.innerHTML = '';
            const pl = plById(PL.curId);
            tracks.forEach((t, i) => {
                const alreadyIn = pl?.tracks.some(p => p.id === t.id);
                const row = document.createElement('div');
                row.className = 'pl-modal-row pl-modal-row-in';
                row.style.animationDelay = (i * 55) + 'ms'; // 순차적으로 부드럽게 이어지는 등장
                row.innerHTML = `
          <img class="pl-modal-row-art" src="${esc(getThumbMd(t.id))}" onerror="this.src='${esc(t.thumb)}'" alt="">
          <div class="pl-modal-row-m">
            <div class="pl-modal-row-t">${esc(t.title)}</div>
            <div class="pl-modal-row-c">${esc(t.channel)}</div>
          </div>
          <span class="pl-modal-row-dur">${fmt(t.dur)}</span>
          <button class="pl-modal-add-btn${alreadyIn ? ' added' : ''}" title="${alreadyIn ? '이미 추가됨' : '추가'}">
            ${alreadyIn
                        ? `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="2,6 5,9 9,3"/></svg>`
                        : `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/></svg>`
                    }
          </button>`;
                row.querySelector('.pl-modal-add-btn').addEventListener('click', e => {
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    if (btn.classList.contains('added')) return;
                    if (plAddTrack(PL.curId, t)) {
                        btn.classList.add('added');
                        btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="2,6 5,9 9,3"/></svg>`;
                    }
                });
                res.appendChild(row);
            });
        } catch { res.innerHTML = `<div class="pl-add-modal-hint">검색 실패</div>`; }
    }, immediate ? 0 : 400);
}

let _plCtxTrack = null;
let _lastMouseEvt = null;
document.addEventListener('mousemove', e => { _lastMouseEvt = e; });

function plShowCtxById(trackId) {
    const track = S.q.find(t => t.id === trackId)
        || S.favs.find(t => t.id === trackId)
        || (S.track?.id === trackId ? S.track : null);
    if (!track) return;
    plShowCtx(_lastMouseEvt || { clientX: innerWidth / 2, clientY: innerHeight / 2 }, track);
}

function plShowCtx(e, track) {
    _plCtxTrack = track;
    const menu = document.getElementById('pl-ctx-menu');
    const list = document.getElementById('pl-ctx-list');
    list.innerHTML = PL.lists.length
        ? PL.lists.map(pl => `
        <button class="pl-ctx-item" onclick="plCtxAdd('${esc(pl.id)}')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="1" width="4" height="4" rx="0.8"/><rect x="7" y="1" width="4" height="4" rx="0.8"/>
            <rect x="1" y="7" width="4" height="4" rx="0.8"/>
          </svg>${esc(pl.name)}
        </button>`).join('')
        : '';
    const mw = 210, mh = 80 + PL.lists.length * 36;
    let x = e.clientX, y = e.clientY;
    if (x + mw > innerWidth) x = innerWidth - mw - 8;
    if (y + mh > innerHeight) y = innerHeight - mh - 8;
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    menu.classList.add('on');
}
function plCtxAdd(plId) { if (_plCtxTrack) plAddTrack(plId, _plCtxTrack); plCtxClose(); }
async function plCtxNew() {
    plCtxClose();
    if (!_plCtxTrack) return;
    const track = _plCtxTrack;
    const id = await plNewPrompt(track.title.slice(0, 20));
    if (id) plAddTrack(id, track);
}
function plCtxClose() {
    document.getElementById('pl-ctx-menu').classList.remove('on');
    _plCtxTrack = null;
}
document.addEventListener('click', e => {
    if (!e.target.closest('#pl-ctx-menu')) plCtxClose();
});
function togglePip() { document.getElementById('pip').classList.toggle('on'); }

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */
function fmt(s) { if (!s || isNaN(s)) return '0:00'; return `${Math.floor(s / 60)}:${(Math.floor(s % 60)).toString().padStart(2, '0')}`; }
function setT(id, s) { const el = document.getElementById(id); if (el) el.textContent = fmt(s); }
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
let _tt;
function toast(msg) {
    const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('on'), 2200);
}

/* ════════════════════════════════════════════
   OVERLAY MODE
════════════════════════════════════════════ */
const OV = { active: false, ticker: null, curIdx: -1 };
const OV_BAR_H = 58;

function toggleOverlay() {
    OV.active = !OV.active;
    if (OV.active) { _enterOverlay(); } else { _exitOverlay(); }
}
function _enterOverlay() {
    document.body.classList.add('overlay-mode');
    document.getElementById('np').classList.remove('on');
    document.getElementById('bt-overlay-btn')?.classList.add('on');
    document.getElementById('np-overlay-btn')?.classList.add('on');
    _syncOvBar();
    initSeekBar('ov-pb', 'ov-pbf');
    const ovVol = document.getElementById('ov-vol-sl');
    if (ovVol) ovVol.value = S.vol;
    _startOvLyrics();
    post('overlayMode', { active: false });
    toast('오버레이 모드는 PC 버전에서만 지원됩니다');
    OV.active = false;
    return;
}
function _exitOverlay() {
    document.body.classList.remove('overlay-mode');
    document.getElementById('bt-overlay-btn')?.classList.remove('on');
    document.getElementById('np-overlay-btn')?.classList.remove('on');
    _stopOvLyrics();
    post('overlayMode', { active: false });
    toast('오버레이 모드 꺼짐');
}
function _syncOvBar() {
    if (!S.track) return;
    const hq = getThumbHq(S.track.id), md = getThumbMd(S.track.id);
    const art = document.getElementById('ov-b-art');
    if (art) { art.src = hq; art.onerror = () => { art.src = md; }; }
    const title = document.getElementById('ov-b-title');
    if (title) title.textContent = S.track.title || '—';
    const ch = document.getElementById('ov-b-ch');
    if (ch) ch.textContent = S.track.channel || 'YouTube';
    _syncOvPlayBtn();
}
function _syncOvPlayBtn() {
    const btn = document.getElementById('ov-cb-play');
    if (!btn) return;
    btn.innerHTML = S.playing
        ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2.5" y="2" width="4" height="12" rx="1"/><rect x="9.5" y="2" width="4" height="12" rx="1"/></svg>`
        : `<svg width="17" height="17" viewBox="0 0 17 17" fill="currentColor"><polygon points="4,2.5 14,8.5 4,14.5"/></svg>`;
}
function _startOvLyrics() { _stopOvLyrics(); _buildOvLyricsDOM(); OV.curIdx = -1; OV.ticker = setInterval(_syncOvLyrics, 40); }
function _stopOvLyrics() { clearInterval(OV.ticker); OV.ticker = null; }
function _buildOvLyricsDOM() { OV.curIdx = -1; post('overlayLyrics', { prev: '', active: '', next1: '', next2: '' }); }
function _syncOvLyrics() {
    if (!LY.lines.length) return;
    const cur = getPlayheadTime();
    let found = -1;
    for (let i = LY.lines.length - 1; i >= 0; i--) {
        if (cur >= LY.lines[i].start) {
            if (cur < LY.lines[i].end) found = i;
            break;
        }
    }
    if (found === OV.curIdx) return;
    OV.curIdx = found;
    const get = i => (i >= 0 && i < LY.lines.length) ? (LY.lines[i].text || '') : '';
    post('overlayLyrics', { prev: get(found - 1), active: get(found), next1: get(found + 1), next2: '' });
    if (OV.active) {
        try {
            const dur = LOCAL.active && LOCAL.audio
                ? (LOCAL.audio.duration || S.dur || 0)
                : (S.ytPlayer?.getDuration?.() || S.dur || 0);
            const pct = dur ? (cur / dur) * 100 : 0;
            const ovPb = document.getElementById('ov-pb');
            if (!ovPb?.classList.contains('dragging')) ovPb?._setFill?.(pct);
            setT('ov-p-cur', cur);
            setT('ov-p-tot', dur);
        } catch { }
    }
}

/* ════════════════════════════════════════════
   KEYBOARD
════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowRight') nextT();
    if (e.code === 'ArrowLeft') prevT();
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'Escape') closeNP();
});

/* ════════════════════════════════════════════
   LYRICS SYSTEM
════════════════════════════════════════════ */
const LY = {
    lines: [],
    curIdx: -1,
    ticker: null,
    videoId: null,
    _fetching: null,
    _dotElFs: null
};

/* ── Focus-driven Inertial Spring 유틸 ──────────────────────────
   CSS transition(고정 duration)을 쓰지 않고, 매 프레임 질량-스프링-감쇠
   물리로 목표 위치를 향해 실시간 보간한다.
   → 재생 중 다음 줄로 계속 target이 갱신돼도(연속 tick) 끊기지 않고
     현재 속도를 유지한 채 새 목표로 자연스럽게 이어 붙는다(관성).
──────────────────────────────────────────────────────────────── */
function _makeSpring(stiffness = 80, damping = 15, mass = 1) {
    let pos = 0, target = 0, vel = 0, raf = null, last = 0, onFrame = null;
    function tick(now) {
        const dt = Math.min((now - last) / 1000, 0.032) || 0.016;
        last = now;
        const acc = (-stiffness * (pos - target) - damping * vel) / mass;
        vel += acc * dt;
        pos += vel * dt;
        const settled = Math.abs(target - pos) < 0.05 && Math.abs(vel) < 0.05;
        if (settled) { pos = target; vel = 0; }
        if (onFrame) onFrame(pos, vel);
        raf = settled ? null : requestAnimationFrame(tick);
    }
    return {
        to(t, cb) {
            onFrame = cb || onFrame;
            target = t;
            if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
        },
        jump(v, cb) {
            onFrame = cb || onFrame;
            pos = target = v; vel = 0;
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            if (onFrame) onFrame(pos, vel);
        },
        stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
    };
}

/* ── 가사 패널 수동 드래그 스크롤 ──────────────────────────────
   기존 스프링 애니메이션 로직(_makeSpring, _highlightLine, _highlightLsLine)은
   전혀 건드리지 않는다. 드래그 중에는 스프링을 멈추고 손가락을 1:1로
   따라가게 하다가, 손을 떼면 잠시 후 기존 하이라이트 함수를 그대로
   다시 호출해 원래 스프링 애니메이션으로 현재 재생 줄로 복귀시킨다. */
function _attachLyricDragScroll(scrollEl, getInner, getSpring, resumeFn) {
    if (!scrollEl || scrollEl._dragAttached) return;
    scrollEl._dragAttached = true;
    let dragging = false, startY = 0, startPos = 0, moved = false, resumeTimer = null;

    function currentY(inner) {
        const m = /translateY\(([-\d.]+)px\)/.exec(inner?.style.transform || '');
        return m ? parseFloat(m[1]) : 0;
    }
    function down(y) {
        const inner = getInner();
        if (!inner) return;
        dragging = true; moved = false; startY = y;
        startPos = currentY(inner);
        clearTimeout(resumeTimer);
        const spring = getSpring();
        if (spring) spring.stop();
    }
    function move(y) {
        if (!dragging) return;
        const inner = getInner();
        if (!inner) return;
        const dy = y - startY;
        if (Math.abs(dy) > 4) moved = true;
        inner.style.transform = `translateY(${startPos + dy}px)`;
    }
    function up() {
        if (!dragging) return;
        dragging = false;
        clearTimeout(resumeTimer);
        // 손을 뗀 후 잠시 기다렸다가, 기존 스프링 애니메이션으로 현재 재생 줄에 복귀
        resumeTimer = setTimeout(() => { resumeFn(); }, 2200);
    }

    scrollEl.addEventListener('touchstart', e => down(e.touches[0].clientY), { passive: true });
    scrollEl.addEventListener('touchmove',  e => move(e.touches[0].clientY), { passive: true });
    scrollEl.addEventListener('touchend',   up, { passive: true });
    scrollEl.addEventListener('touchcancel',up, { passive: true });
    scrollEl.addEventListener('mousedown', e => down(e.clientY));
    window.addEventListener('mousemove', e => { if (dragging) move(e.clientY); });
    window.addEventListener('mouseup', up);
    // 드래그 직후 발생하는 클릭(가사 탭 seek)이 오작동하지 않도록 차단
    scrollEl.addEventListener('click', e => {
        if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
}

function _getArtCenter() {
    const ash = document.getElementById('np-ash');
    const canvas = document.getElementById('np-particles');
    if (!ash || !canvas) return { cx: canvas ? canvas.width / 2 : innerWidth / 2, cy: canvas ? canvas.height * .42 : innerHeight * .42 };
    const ar = ash.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    return { cx: ar.left + ar.width / 2 - cr.left, cy: ar.top + ar.height / 2 - cr.top };
}

async function fetchLyrics(videoId) {
    const local = findLocalTrack(videoId);
    if (local?.lyrics?.length) {
        LY.videoId = videoId;
        LY.lines = normalizeLyricLines(local.lyrics);
        _renderLyrics();
        if (NP_LS.active) { NP_LS.curIdx = -1; _renderLsLyrics(); }
        return;
    }
    if (LY.videoId === videoId && LY.lines.length > 0) return;
    if (LY._fetching === videoId) return;
    LY._fetching = videoId;
    LY.lines = [];
    LY.curIdx = -1;
    _showLyricsLoading();
    try {
        const title = S.track?.title ?? '';
        const channel = S.track?.channel ?? '';
        let duration = S.dur || S.track?.dur || 0;
        if (!duration && LOCAL.active && LOCAL.audio) duration = LOCAL.audio.duration || 0;
        if (!duration && S.ytPlayer && S.ytReady) {
            try { duration = S.ytPlayer.getDuration() || 0; } catch { }
        }
        if (!duration) {
            for (let i = 0; i < 6 && !duration; i++) {
                await new Promise(r => setTimeout(r, 500));
                if (LY._fetching !== videoId) return;
                duration = S.dur || S.track?.dur || 0;
                if (!duration && LOCAL.active && LOCAL.audio) duration = LOCAL.audio.duration || 0;
                if (!duration && S.ytPlayer && S.ytReady) {
                    try { duration = S.ytPlayer.getDuration() || 0; } catch { }
                }
            }
        }
        if (LY._fetching !== videoId) return;
        const res = await callCs({ type: 'fetchLyrics', videoId, title, channel, duration });
        if (LY._fetching !== videoId) return;
        if (res.success && res.lines && res.lines.length > 0) {
            LY.videoId = videoId;
            LY.lines = normalizeLyricLines(res.lines);
            _renderLyrics();
            // 랜드스케이프 모드 활성 시 가사 재렌더
            if (NP_LS.active) {
                NP_LS.curIdx = -1;
                _renderLsLyrics();
            }
        } else {
            LY.videoId = null;
            _showLyricsEmpty();
        }
    } catch (err) {
        if (LY._fetching === videoId) {
            LY.videoId = null;
            _showLyricsEmpty();
        }
    } finally {
        if (LY._fetching === videoId) LY._fetching = null;
    }
}

function _renderLyrics() {
    const inner = document.getElementById('np-lyrics-inner');
    const artArea = document.querySelector('.np-art-area');
    if (!inner || !artArea) return;
    document.getElementById('np-no-lyrics')?.remove();
    inner.innerHTML = '';
    LY.lines.forEach((line, i) => {
        const el = document.createElement('div');
        el.className = 'np-lyric-line';
        el.textContent = line.text;
        el.addEventListener('click', e => seekToLyric(line.start + 0.05, e));
        inner.appendChild(el);
        LY.lines[i].el = el;
    });
    artArea.classList.add('has-lyrics');
    inner.style.transform = 'translateY(0px)';
    LY._scrollSpring = _makeSpring();
    _attachLyricDragScroll(
        document.getElementById('np-lyrics-scroll'),
        () => document.getElementById('np-lyrics-inner'),
        () => LY._scrollSpring,
        () => _highlightLine(LY.curIdx, false)
    );
    _startLyricsTick();
    if (OV.active) _buildOvLyricsDOM();
    document.getElementById('np-lv-btn')?.classList.add('show');
    if (LV.active) {
        _renderLvLyrics();
        requestAnimationFrame(() => { _highlightLvLine(LY.curIdx, true); });
    }
    _translateLyricsIfNeeded();
}

function _showLyricsLoading() {
    const inner = document.getElementById('np-lyrics-inner');
    const artArea = document.querySelector('.np-art-area');
    if (!inner) return;
    document.getElementById('np-no-lyrics')?.remove();
    artArea?.classList.add('has-lyrics');
    inner.innerHTML = `<div class="np-lyrics-loading"><div class="spinner"></div><span>가사 불러오는 중...</span></div>`;
}

function _showLyricsEmpty() {
    const inner = document.getElementById('np-lyrics-inner');
    const artArea = document.querySelector('.np-art-area');
    if (!inner) return;
    artArea?.classList.remove('has-lyrics');
    inner.innerHTML = '';
    document.getElementById('np-no-lyrics')?.remove();
    const el = document.createElement('div');
    el.id = 'np-no-lyrics';
    el.className = 'np-no-lyrics';
    el.textContent = '가사를 찾을 수 없습니다';
    document.getElementById('np')?.appendChild(el);
    document.getElementById('np-lv-btn')?.classList.remove('show');
    if (LV.active) closeLyricsView();
}

function _clearLyrics() {
    const inner = document.getElementById('np-lyrics-inner');
    const artArea = document.querySelector('.np-art-area');
    if (inner) { inner.innerHTML = ''; inner.style.transform = 'translateY(0px)'; }
    artArea?.classList.remove('has-lyrics');
    document.getElementById('np-no-lyrics')?.remove();
    document.getElementById('np-fs-lyrics')?.remove();
    document.getElementById('np-fs-artist')?.remove();
    _fsDotsLit = -1;
    if (LY._dotElFs) { LY._dotElFs = null; }
    _stopLyricsTick();
    if (LY._scrollSpring) { LY._scrollSpring.stop(); LY._scrollSpring = null; }
    if (NP_LS._scrollSpring) { NP_LS._scrollSpring.stop(); NP_LS._scrollSpring = null; }
    if (LY._lvScrollSpring) { LY._lvScrollSpring.stop(); LY._lvScrollSpring = null; }
    const lvInner = document.getElementById('np-lv-inner');
    if (lvInner) { lvInner.innerHTML = ''; lvInner.style.transform = 'translateY(0px)'; }
    document.getElementById('np-lv-btn')?.classList.remove('show');
    LY._trVideoId = null;
    LY.lines = [];
    LY.curIdx = -1;
    LY.videoId = null;
    LY._fetching = null;
    // 랜드스케이프 가사도 초기화
    if (NP_LS.active) {
        NP_LS.curIdx = -1;
        const scroll = document.getElementById('np-ls-scroll');
        if (scroll) scroll.innerHTML = '';
    }
}

/* ════════════════════════════════════════════
   LYRICS VIEW (Apple Music 스타일 전용 가사 화면, Android 전용)
   - 기존 미니 가사 패널과 동일한 스프링 물리(_makeSpring)와
     드래그 스크롤(_attachLyricDragScroll)을 그대로 재사용한다.
   - LY.lines[i].el_lv / el_lv_wrap / el_lv_tr 에 이 화면 전용
     DOM 참조를 별도로 저장해 기존 .el(미니 패널) / .el_ls(가로모드)와
     서로 간섭하지 않는다.
════════════════════════════════════════════ */
const LV = { active: false };

function toggleLyricsView() {
    if (LV.active) closeLyricsView();
    else openLyricsView();
}

function openLyricsView() {
    if (!LY.lines.length) { toast('가사가 없어요'); return; }
    if (NP_LS.active) return; // 가로모드 전체화면 중에는 사용하지 않음
    LV.active = true;
    document.getElementById('np')?.classList.add('lyrics-view');
    document.getElementById('np-lv-btn')?.classList.add('on');
    const t = S.track;
    const lvArt   = document.getElementById('np-lv-art');
    const lvTitle = document.getElementById('np-lv-title');
    const lvCh    = document.getElementById('np-lv-ch');
    const origArt = document.getElementById('np-art');
    if (lvArt && origArt) lvArt.src = origArt.src;
    if (lvTitle) lvTitle.textContent = t?.title || '—';
    if (lvCh)    lvCh.textContent    = t?.channel || 'YouTube';
    _renderLvLyrics();
    requestAnimationFrame(() => { _highlightLvLine(LY.curIdx, true); });
    _translateLyricsIfNeeded();
}

function closeLyricsView() {
    if (!LV.active) return;
    LV.active = false;
    document.getElementById('np')?.classList.remove('lyrics-view');
    document.getElementById('np-lv-btn')?.classList.remove('on');
    if (LY._lvScrollSpring) LY._lvScrollSpring.stop();
}

function _renderLvLyrics() {
    const inner = document.getElementById('np-lv-inner');
    if (!inner) return;
    inner.innerHTML = '';

    if (!LY.lines.length) {
        const empty = document.createElement('div');
        empty.className = 'np-lv-empty';
        empty.textContent = '가사를 찾을 수 없습니다';
        inner.appendChild(empty);
        return;
    }

    LY.lines.forEach((line, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'np-lv-line-wrap';
        const main = document.createElement('div');
        main.className = 'np-lyric-line np-lv-line';
        main.textContent = line.text;
        wrap.appendChild(main);
        wrap.addEventListener('click', e => seekToLyric(line.start + 0.05, e));
        inner.appendChild(wrap);

        LY.lines[i].el_lv = main;
        LY.lines[i].el_lv_wrap = wrap;
        LY.lines[i].el_lv_tr = null;
        if (line.tr) _applyLvTranslation(i);
    });

    inner.style.transform = 'translateY(0px)';
    LY._lvScrollSpring = _makeSpring();
    _attachLyricDragScroll(
        document.getElementById('np-lv-scroll'),
        () => document.getElementById('np-lv-inner'),
        () => LY._lvScrollSpring,
        () => _highlightLvLine(LY.curIdx, false)
    );
}

function _highlightLvLine(idx, instant) {
    if (!LY.lines.length) return;
    LY.lines.forEach((line, i) => {
        if (!line.el_lv_wrap) return;
        line.el_lv_wrap.classList.remove('active', 'prev', 'near');
        line.el_lv?.classList.remove('active', 'prev', 'near');
        if (idx < 0) return;
        const d = i - idx;
        let cls = null;
        if (d === 0) cls = 'active';
        else if (d === -1) cls = 'prev';
        else if (d >= 1 && d <= 3) cls = 'near';
        if (cls) {
            line.el_lv_wrap.classList.add(cls);
            line.el_lv?.classList.add(cls);
        }
    });

    if (idx >= 0 && LY.lines[idx]?.el_lv_wrap) {
        const wrap = LY.lines[idx].el_lv_wrap;
        const inner = document.getElementById('np-lv-inner');
        const scroll = document.getElementById('np-lv-scroll');
        if (!scroll || !inner) return;
        const padTop = parseFloat(getComputedStyle(scroll).paddingTop) || 0;
        const target = (scroll.clientHeight / 2) - padTop - (wrap.offsetTop + wrap.offsetHeight / 2);
        if (!LY._lvScrollSpring) LY._lvScrollSpring = _makeSpring();
        const applyFrame = (pos, vel) => {
            inner.style.transform = `translateY(${pos}px)`;
            const spread = Math.max(-20, Math.min(20, vel * -0.055));
            LY.lines.forEach((line, i) => {
                if (!line.el_lv_wrap) return;
                const d = i - idx;
                if (d === 0) { line.el_lv_wrap.style.transform = 'translateY(0px)'; return; }
                const k = Math.sign(d) * Math.min(Math.abs(d), 4);
                line.el_lv_wrap.style.transform = `translateY(${spread * k}px)`;
            });
        };
        if (instant) LY._lvScrollSpring.jump(target, applyFrame);
        else LY._lvScrollSpring.to(target, applyFrame);
    }
}

/* ── 자동 가사 번역 (API 키 없이 쓸 수 있는 구글 번역 비공식 엔드포인트) ──
   외국어(한글이 없는) 줄만 감지해 한국어로 번역, Lyrics View에서
   원문 줄 바로 아래에 작게 표시한다. 동일 문장은 캐시해 재요청하지 않는다. */
const _trCache = new Map();
const _HANGUL_RE = /[\uAC00-\uD7A3\u3131-\u318E]/;
const _LETTER_RE = /\p{L}/u;

function _lineNeedsTranslation(text) {
    if (!text) return false;
    if (_HANGUL_RE.test(text)) return false;
    return _LETTER_RE.test(text);
}

async function _translateText(text) {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=' + encodeURIComponent(text);
    const res = await fetch(url);
    if (!res.ok) throw new Error('translate failed');
    const data = await res.json();
    return (data[0] || []).map(seg => seg[0]).join('').trim();
}

async function _translateLyricsIfNeeded() {
    if (!LY.lines.length) return;
    const videoId = LY.videoId;
    if (!videoId || LY._trVideoId === videoId) return;
    LY._trVideoId = videoId;

    const targets = [];
    LY.lines.forEach((line, i) => { if (_lineNeedsTranslation(line.text)) targets.push(i); });
    if (!targets.length) return;

    let cursor = 0;
    async function worker() {
        while (cursor < targets.length) {
            const i = targets[cursor++];
            if (LY.videoId !== videoId) return;
            const text = LY.lines[i].text;
            let tr = _trCache.get(text);
            if (tr === undefined) {
                try { tr = await _translateText(text); _trCache.set(text, tr); }
                catch { tr = null; }
            }
            if (LY.videoId !== videoId) return;
            if (tr && tr.trim() && tr.trim() !== text.trim()) {
                LY.lines[i].tr = tr;
                _applyLvTranslation(i);
            }
        }
    }
    const pool = [];
    for (let w = 0; w < 4; w++) pool.push(worker());
    await Promise.all(pool);
}

function _applyLvTranslation(i) {
    const line = LY.lines[i];
    if (!line || !line.el_lv_wrap || !line.tr) return;
    if (line.el_lv_tr) { line.el_lv_tr.textContent = line.tr; return; }
    const trEl = document.createElement('div');
    trEl.className = 'np-lv-line-tr';
    trEl.textContent = line.tr;
    line.el_lv_wrap.appendChild(trEl);
    line.el_lv_tr = trEl;
}

/* ════════════════════════════════════════════
   FULLSCREEN STATE (PC 전용, Android에서는 미사용)
════════════════════════════════════════════ */
let _fsResizeObserver = null;

function _attachFsResizeObserver() {
    const np = document.getElementById('np');
    if (!np || _fsResizeObserver) return;
    _fsResizeObserver = new ResizeObserver(() => { _positionFsPanel(); });
    _fsResizeObserver.observe(np);
}
function _detachFsResizeObserver() {
    if (_fsResizeObserver) { _fsResizeObserver.disconnect(); _fsResizeObserver = null; }
}

function _onWindowStateChange(isMaximized) {
    const np = document.getElementById('np');
    if (!np) return;
    if (isMaximized) {
        np.classList.add('fullscreen');
        document.body.classList.add('maximized');
        _attachFsResizeObserver();
        document.querySelectorAll('.np-lyric-line').forEach(el => el.classList.remove('active', 'prev', 'near'));
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    _positionFsPanel();
                    if (LY.lines.length > 0) {
                        _buildFsLyricsDOM();
                        requestAnimationFrame(() => { _highlightFsLine(LY.curIdx); });
                    }
                });
            });
        });
    } else {
        np.classList.remove('fullscreen');
        document.body.classList.remove('maximized');
        _detachFsResizeObserver();
        _restoreNormalMode();
        document.getElementById('np-fs-lyrics')?.remove();
        document.getElementById('np-fs-artist')?.remove();
        if (LY.lines.length > 0) {
            _renderLyrics();
            requestAnimationFrame(() => { _highlightLine(LY.curIdx, true); });
        }
    }
}

const FS_SLOTS = [
    { d: -3, op: 0.18, bl: 4.0, sy: 0.82, sc: 0.90, dy: 0 },
    { d: -2, op: 0.38, bl: 2.0, sy: 0.88, sc: 0.94, dy: 0 },
    { d: -1, op: 0.62, bl: 0.6, sy: 0.95, sc: 0.98, dy: 0 },
    { d: 0,  op: 1.00, bl: 0.0, sy: 1.00, sc: 1.00, dy: 0 },
    { d: 1,  op: 0.58, bl: 0.6, sy: 0.95, sc: 0.98, dy: 0 },
    { d: 2,  op: 0.34, bl: 2.0, sy: 0.88, sc: 0.94, dy: 0 },
    { d: 3,  op: 0.15, bl: 4.0, sy: 0.82, sc: 0.90, dy: 0 },
];
const FS_ROW_H  = 56;
const FS_BEFORE = 3;
const FS_AFTER  = 3;
const FS_SLIDE  = 22;
const FS_TRANS  = [
    'opacity  0.40s var(--lyric-fade, cubic-bezier(0.33,0,0.2,1))',
    'filter   0.40s var(--lyric-fade, cubic-bezier(0.33,0,0.2,1))',
    'transform 0.58s var(--lyric-spring-move, cubic-bezier(0.22,1.14,0.3,1.02))',
].join(', ');

function _fsColor(d) {
    if (d === 0) return 'rgba(255,255,255,0.97)';
    if (Math.abs(d) === 1) return 'rgba(255,255,255,0.65)';
    if (Math.abs(d) === 2) return 'rgba(255,255,255,0.42)';
    return 'rgba(255,255,255,0.22)';
}
function _fsFW(d) {
    if (d === 0) return '800';
    if (Math.abs(d) <= 1) return '600';
    return '500';
}

let _fsLastIdx = -1;
let _fsVisible = new Set();
let _fsPanelRaf = null;

let _posFsPanelRetry = null;
function _positionFsPanel() {
    const shell = document.querySelector('#np.fullscreen .np-art-shell');
    const panel = document.querySelector('#np.fullscreen .np-panel');
    if (!shell || !panel) return;
    const npRect = document.getElementById('np').getBoundingClientRect();
    const artRect = shell.getBoundingClientRect();
    if (artRect.width < 1 || artRect.height < 1) {
        if (_posFsPanelRetry) cancelAnimationFrame(_posFsPanelRetry);
        _posFsPanelRetry = requestAnimationFrame(() => { _posFsPanelRetry = null; _positionFsPanel(); });
        return;
    }
    panel.style.left  = (artRect.left - npRect.left) + 'px';
    panel.style.top   = (artRect.bottom - npRect.top + 16) + 'px';
    panel.style.width = artRect.width + 'px';
}

function _restoreNormalMode() {
    const panel = document.querySelector('.np-panel');
    if (!panel) return;
    ['position','left','top','width','padding','display','flexDirection','gap','background','boxShadow','zIndex']
        .forEach(p => panel.style[p] = '');
}

function _fsApplySlot(el, slot, visible) {
    if (!visible) {
        el.style.opacity = '0';
        el.style.filter  = 'blur(8px)';
        return;
    }
    el.style.opacity    = String(slot.op);
    el.style.filter     = slot.bl > 0 ? `blur(${slot.bl}px)` : 'none';
    el.style.color      = _fsColor(slot.d);
    el.style.fontWeight = _fsFW(slot.d);
    el.style.transform  = `scaleX(${slot.sc}) scaleY(${slot.sy}) translateY(${slot.dy}px)`;
}

function _buildFsLyricsDOM() {
    document.getElementById('np-fs-lyrics')?.remove();
    document.getElementById('np-fs-artist')?.remove();
    const np = document.getElementById('np');
    if (!np) return;
    _fsLastIdx = -1;
    _fsVisible = new Set();
    const container = document.createElement('div');
    container.id = 'np-fs-lyrics';
    const inner = document.createElement('div');
    inner.id = 'np-fs-lyrics-inner';
    inner.style.height = (LY.lines.length * FS_ROW_H) + 'px';
    container.appendChild(inner);
    np.appendChild(container);

    const dotEl = document.createElement('div');
    dotEl.className = 'np-fs-lyric-line np-fs-dot-line';
    dotEl.innerHTML =
        '<span class="np-fs-dot" style="transition-delay:0s"></span>' +
        '<span class="np-fs-dot" style="transition-delay:0.07s"></span>' +
        '<span class="np-fs-dot" style="transition-delay:0.14s"></span>';
    dotEl.style.top        = (-FS_ROW_H) + 'px';
    dotEl.style.transition = 'none';
    dotEl.style.opacity    = '0';
    dotEl.style.filter     = 'blur(8px)';
    dotEl.style.transform  = `scaleX(0.88) scaleY(0.82) translateY(${FS_SLIDE}px)`;
    dotEl.style.willChange = 'transform, opacity, filter';
    dotEl.style.pointerEvents = 'none';
    inner.appendChild(dotEl);
    LY._dotElFs = dotEl;

    LY.lines.forEach((line, i) => {
        const el = document.createElement('div');
        el.className      = 'np-fs-lyric-line';
        el.textContent    = line.text;
        el.style.top       = (i * FS_ROW_H) + 'px';
        el.style.transition = 'none';
        el.style.opacity   = '0';
        el.style.filter    = 'blur(8px)';
        el.style.transform = `scaleX(0.88) scaleY(0.82) translateY(${FS_SLIDE}px)`;
        el.style.color     = 'rgba(255,255,255,0.22)';
        el.style.fontWeight = '500';
        el.style.willChange = 'transform, opacity, filter';
        el.addEventListener('click', e => seekToLyric(line.start + 0.05, e));
        inner.appendChild(el);
        LY.lines[i].el_fs = el;
    });

    requestAnimationFrame(() => {
        _positionFsPanel();
        void inner.offsetHeight;
        requestAnimationFrame(() => { _highlightFsLine(LY.curIdx); });
    });
}

function _highlightFsLine(idx) {
    if (!LY.lines.length) return;
    const isDot = (idx < 0);
    const ai = isDot ? -1 : idx;
    const dir = (_fsLastIdx < 0 && !isDot) ? 1 : (isDot ? 1 : (idx >= _fsLastIdx ? 1 : -1));
    _fsLastIdx = isDot ? -1 : idx;

    const inner = document.getElementById('np-fs-lyrics-inner');
    if (!inner) return;
    const container  = document.getElementById('np-fs-lyrics');
    const containerH = container ? container.offsetHeight : window.innerHeight;
    const offsetY    = Math.round(containerH / 2 - ai * FS_ROW_H - FS_ROW_H / 2);
    if (!LY._fsSpring) LY._fsSpring = _makeSpring();
    LY._fsSpring.to(offsetY, v => { inner.style.transform = `translateY(${v}px)`; });

    const newVisible = new Set();
    const dotEl = LY._dotElFs;
    if (dotEl) {
        const d_dot    = -1 - ai;
        const slot_dot = FS_SLOTS.find(s => s.d === d_dot);
        const wasDotVisible = _fsVisible.has(-1);
        if (!slot_dot) {
            if (wasDotVisible) {
                dotEl.style.transition = FS_TRANS;
                dotEl.style.opacity    = '0';
                dotEl.style.filter     = 'blur(8px)';
                dotEl.style.transform  = `scaleX(0.88) scaleY(0.82) translateY(${dir > 0 ? -FS_SLIDE : FS_SLIDE}px)`;
            }
        } else {
            newVisible.add(-1);
            if (!wasDotVisible) {
                dotEl.style.transition = 'none';
                dotEl.style.opacity    = '0';
                dotEl.style.filter     = `blur(${Math.max(slot_dot.bl, 3)}px)`;
                dotEl.style.transform  = `scaleX(${slot_dot.sc * 0.92}) scaleY(${slot_dot.sy * 0.88}) translateY(${dir > 0 ? FS_SLIDE : -FS_SLIDE}px)`;
                void dotEl.offsetHeight;
                dotEl.style.transition = FS_TRANS;
            } else {
                dotEl.style.transition = FS_TRANS;
            }
            dotEl.style.opacity   = String(slot_dot.op);
            dotEl.style.filter    = slot_dot.bl > 0 ? `blur(${slot_dot.bl}px)` : 'none';
            dotEl.style.transform = `scaleX(${slot_dot.sc}) scaleY(${slot_dot.sy}) translateY(${slot_dot.dy}px)`;
        }
    }

    LY.lines.forEach((line, i) => {
        const el = line.el_fs;
        if (!el) return;
        const d    = i - ai;
        const slot = FS_SLOTS.find(s => s.d === d);
        const wasVisible = _fsVisible.has(i);
        if (!slot) {
            if (wasVisible) {
                el.style.transition = FS_TRANS;
                el.style.opacity    = '0';
                el.style.filter     = 'blur(8px)';
                el.style.transform  = `scaleX(0.88) scaleY(0.82) translateY(${dir > 0 ? -FS_SLIDE : FS_SLIDE}px)`;
            }
            return;
        }
        newVisible.add(i);
        if (!wasVisible) {
            el.style.transition = 'none';
            el.style.opacity    = '0';
            el.style.filter     = `blur(${Math.max(slot.bl, 3)}px)`;
            el.style.transform  = `scaleX(${slot.sc * 0.92}) scaleY(${slot.sy * 0.88}) translateY(${dir > 0 ? FS_SLIDE : -FS_SLIDE}px)`;
            void el.offsetHeight;
            el.style.transition = FS_TRANS;
        } else {
            el.style.transition = FS_TRANS;
        }
        _fsApplySlot(el, slot, true);
    });
    _fsVisible = newVisible;
    if (_fsPanelRaf) cancelAnimationFrame(_fsPanelRaf);
    _fsPanelRaf = requestAnimationFrame(_positionFsPanel);
}

function _startLyricsTick() {
    _stopLyricsTick();
    _clampLyricEnds();
    LY.ticker = setInterval(_syncLyrics, 40);
}
function _stopLyricsTick() { clearInterval(LY.ticker); LY.ticker = null; }

function _clampLyricEnds() {
    for (let i = 0; i < LY.lines.length - 1; i++) {
        const nextStart = LY.lines[i + 1].start;
        if (LY.lines[i].end > nextStart) LY.lines[i].end = nextStart;
        if (LY.lines[i].end <= LY.lines[i].start) LY.lines[i].end = Math.min(LY.lines[i].start + 0.5, nextStart);
    }
    const last = LY.lines[LY.lines.length - 1];
    if (last && (!last.end || last.end <= last.start)) {
        const d = S.dur || getPlayheadTime() || 0;
        last.end = d > last.start ? d : last.start + 4;
    }
}

function _syncLyrics() {
    if (!LY.lines.length) return;
    const cur = getPlayheadTime();
    const isFullscreen = document.getElementById('np')?.classList.contains('fullscreen');
    if (isFullscreen && LY.lines[0].start > 0.5 && cur < LY.lines[0].start) {
        const ratio = cur / LY.lines[0].start;
        const lit = ratio > 0.90 ? 3 : ratio > 0.66 ? 2 : ratio > 0.33 ? 1 : 0;
        if (LY.curIdx !== -1) { LY.curIdx = -1; _highlightFsLine(-1); }
        if (LY._dotElFs && _fsDotsLit !== lit) {
            _fsDotsLit = lit;
            LY._dotElFs.querySelectorAll('.np-fs-dot').forEach((dot, i) => {
                if (i < lit) dot.classList.add('on'); else dot.classList.remove('on');
            });
        }
        return;
    }
    if (isFullscreen && LY._dotElFs && _fsDotsLit !== -1) {
        _fsDotsLit = -1;
        LY._dotElFs.querySelectorAll('.np-fs-dot').forEach(d => d.classList.remove('on'));
    }
    let found = -1;
    for (let i = LY.lines.length - 1; i >= 0; i--) {
        if (cur >= LY.lines[i].start) {
            if (cur < LY.lines[i].end) found = i;
            break;
        }
    }
    if (found === LY.curIdx) return;
    LY.curIdx = found;
    _highlightLine(found);
}

let _fsDotsLit = -1;
function _ensureFsDotsEl() {
    const np = document.getElementById('np');
    if (!np) return null;
    let el = document.getElementById('np-fs-dots');
    if (!el) {
        el = document.createElement('div');
        el.id = 'np-fs-dots';
        el.innerHTML =
            '<span class="np-fs-dot" style="transition-delay:0s"></span>' +
            '<span class="np-fs-dot" style="transition-delay:0.06s"></span>' +
            '<span class="np-fs-dot" style="transition-delay:0.12s"></span>';
        np.appendChild(el);
    }
    return el;
}
function _showFsDots(lit) {
    const el = _ensureFsDotsEl();
    if (!el) return;
    if (_fsDotsLit === -1) {
        el.style.display = 'flex';
        void el.offsetHeight;
        el.classList.add('visible');
    }
    if (_fsDotsLit === lit) return;
    _fsDotsLit = lit;
    const dots = el.querySelectorAll('.np-fs-dot');
    dots.forEach((dot, i) => { if (i < lit) dot.classList.add('on'); else dot.classList.remove('on'); });
}
function _hideFsDots() {
    if (_fsDotsLit === -1) return;
    _fsDotsLit = -1;
    const el = document.getElementById('np-fs-dots');
    if (!el) return;
    el.classList.remove('visible');
    const onEnd = () => { el.style.display = 'none'; el.removeEventListener('transitionend', onEnd); };
    el.addEventListener('transitionend', onEnd);
}

function _highlightLine(idx, instant) {
    if (LV.active) _highlightLvLine(idx, instant);
    if (document.getElementById('np')?.classList.contains('fullscreen')) {
        _highlightFsLine(idx);
        return;
    }
    LY.lines.forEach((line, i) => {
        if (!line.el) return;
        line.el.classList.remove('active', 'prev', 'near');
        if (idx < 0) return;
        const d = i - idx;
        if (d === 0) line.el.classList.add('active');
        else if (d === -1) line.el.classList.add('prev');
        else if (d >= 1 && d <= 3) line.el.classList.add('near');
    });
    if (idx >= 0 && LY.lines[idx]?.el) {
        const el = LY.lines[idx].el;
        const inner = document.getElementById('np-lyrics-inner');
        const scroll = document.getElementById('np-lyrics-scroll');
        if (!scroll || !inner) return;
        // 현재 줄이 패널 "정중앙"에 오도록 inner 전체를 translateY로 이동
        // → 위/아래 줄들이 "밀려나며" 현재 줄이 드러나는 효과 (스크롤이 아닌 물리 기반 이동)
        // scroll의 padding-top만큼 inner가 아래로 밀려서 시작하므로 반드시 빼줘야
        // 실제 중앙과 일치한다 (안 빼면 항상 padding 값만큼 아래로 치우쳐 보임).
        const padTop = parseFloat(getComputedStyle(scroll).paddingTop) || 0;
        const target = (scroll.clientHeight / 2) - padTop - (el.offsetTop + el.offsetHeight / 2);
        if (!LY._scrollSpring) LY._scrollSpring = _makeSpring();
        const applyFrame = (pos, vel) => {
            inner.style.transform = `translateY(${pos}px)`;
            // 관성 스프링에 따라 위/아래 줄들의 간격이 순간적으로 벌어졌다가
            // 스프링이 정착하며 다시 붙는 elastic-spread 효과 (velocity 기반, 자동으로 0에 수렴)
            const spread = Math.max(-20, Math.min(20, vel * -0.055));
            LY.lines.forEach((line, i) => {
                if (!line.el) return;
                const d = i - idx;
                if (d === 0) { line.el.style.transform = 'translateY(0px)'; return; }
                const k = Math.sign(d) * Math.min(Math.abs(d), 4);
                line.el.style.transform = `translateY(${spread * k}px)`;
            });
        };
        if (instant) {
            LY._scrollSpring.jump(target, applyFrame);
        } else {
            LY._scrollSpring.to(target, applyFrame);
        }
    }
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
function setGreet() {
    const h = new Date().getHours();
    document.getElementById('greet-h').textContent =
        h < 6 ? '좋은 새벽이에요' : h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : h < 22 ? '좋은 저녁이에요' : '좋은 밤이에요';
}
setGreet();
updateBarVisibility();
renderFavSide();
if ('mediaSession' in navigator) {
    try {
        navigator.mediaSession.setActionHandler('play', () => { if (!S.playing) togglePlay(); });
        navigator.mediaSession.setActionHandler('pause', () => { if (S.playing) togglePlay(); });
        navigator.mediaSession.setActionHandler('previoustrack', () => prevT());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextT());
    } catch { }
}
setTimeout(() => { initAmHome(); }, 700);
setTimeout(() => toast('✦ SYNC에 오신 걸 환영해요'), 1000);

/* ════════════════════════════════════════════
   ANDROID INTEGRATION
════════════════════════════════════════════ */
window.__onAndroidBack = function() {
    // 랜드스케이프 전체화면 모드면 먼저 해제
    if (NP_LS.active) { _exitNpLandscape(); return; }
    // Lyrics View가 열려 있으면 먼저 닫고 기본 화면으로 복귀
    if (LV.active) { closeLyricsView(); return; }
    const np = document.getElementById('np');
    if (np && np.classList.contains('on')) { closeNP(); return; }
    if (document.getElementById('pl-dialog-overlay')?.classList.contains('on')) { plDialogCancel(); return; }
    if (document.getElementById('pl-confirm-overlay')?.classList.contains('on')) { plConfirmCancel(); return; }
    if (document.getElementById('pl-add-modal-overlay')?.classList.contains('on')) { plAddModalClose(); return; }
};

// 화면 회전 감지 — NP_LS가 active 중이면 무시
function _onOrientationChange() {
    if (NP_LS.active) return;
    // PC fullscreen 처리만 (Android는 NP_LS로 별도 처리)
}
window.addEventListener('resize', _onOrientationChange);
window.addEventListener('orientationchange', () => setTimeout(_onOrientationChange, 150));

// 미니 바 터치 seek
const _barEl = document.getElementById('bar');
if (_barEl) {
    _barEl.addEventListener('touchstart', e => {
        const rect = _barEl.getBoundingClientRect();
        const touch = e.touches[0];
        if (touch.clientY > rect.bottom - 8) {
            e.preventDefault();
            const pct = (touch.clientX - rect.left) / rect.width;
            if (S.ytPlayer && S.ytReady && S.dur) S.ytPlayer.seekTo(pct * S.dur, true);
        }
    }, { passive: false });
}

document.addEventListener('touchend', e => {
    const btn = e.target.closest('.c-play-btn');
    if (btn) { e.preventDefault(); btn.click(); }
}, { passive: false });