"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

const FILTERS = [
  ["Clean", "깨끗하게", "brightness(1.05) contrast(1.04) saturate(1.02)"],
  ["Portrait", "인물", "brightness(1.06) contrast(.96) saturate(.94) sepia(.04)"],
  ["Vivid", "선명한 풍경", "contrast(1.12) saturate(1.28)"],
  ["Film", "필름", "contrast(.94) saturate(.82) sepia(.16)"],
  ["Cinema", "시네마", "contrast(1.18) saturate(.86) hue-rotate(-8deg)"],
  ["Golden", "골든아워", "brightness(1.05) saturate(1.14) sepia(.2)"],
  ["Mono", "흑백", "grayscale(1) contrast(1.12)"],
  ["Matte", "매트", "contrast(.86) brightness(1.05) saturate(.88)"],
  ["Night", "야경", "brightness(.9) contrast(1.2) saturate(1.18) hue-rotate(5deg)"],
  ["Food", "음식", "brightness(1.03) contrast(1.06) saturate(1.2) sepia(.08)"],
  ["Pastel", "파스텔", "brightness(1.09) contrast(.86) saturate(.84)"],
  ["Moody", "무디", "brightness(.84) contrast(1.18) saturate(.78)"],
  ["Travel", "여행", "brightness(1.04) contrast(1.06) saturate(1.16)"],
  ["Skin", "피부 톤", "brightness(1.04) contrast(.96) saturate(.92) sepia(.08)"],
  ["Air", "맑은 공기", "brightness(1.08) contrast(1.02) saturate(.9)"],
  ["Ocean", "바다", "contrast(1.07) saturate(1.2) hue-rotate(8deg)"],
  ["Autumn", "가을", "contrast(1.05) saturate(1.12) sepia(.25)"],
  ["Cafe", "카페", "brightness(.98) contrast(1.05) sepia(.2)"],
  ["Dream", "드림", "brightness(1.08) contrast(.86) saturate(1.08)"],
  ["Documentary", "다큐", "contrast(1.1) saturate(.72)"],
];

const DEFAULTS = { exposure: 0, contrast: 0, saturation: 0, warmth: 0, highlights: 0, shadows: 0 };

function Icon({ children }) {
  return <span aria-hidden="true" className="icon">{children}</span>;
}

function Slider({ label, value, min = -100, max = 100, onChange }) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <output>{value > 0 ? "+" : ""}{value}</output>
      <input aria-label={label} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export default function Editor() {
  const [photos, setPhotos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [adjust, setAdjust] = useState(DEFAULTS);
  const [filter, setFilter] = useState(null);
  const [hoverFilter, setHoverFilter] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState("contain");
  const [cropRatio, setCropRatio] = useState("original");
  const [tool, setTool] = useState("basic");
  const [mobilePanel, setMobilePanel] = useState("filters");
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [batchProgress, setBatchProgress] = useState(null);
  const [toast, setToast] = useState("사진을 불러오면 바로 편집할 수 있어요.");
  const fileRef = useRef(null);
  const longPressRef = useRef(null);

  const active = photos.find((p) => p.id === activeId);
  const visibleFilter = hoverFilter ?? filter;
  const cssFilter = useMemo(() => {
    const preset = FILTERS.find(([id]) => id === visibleFilter)?.[2] || "";
    const b = 1 + adjust.exposure / 120 + adjust.highlights / 400;
    const c = 1 + adjust.contrast / 100;
    const s = 1 + adjust.saturation / 100;
    return `${preset} brightness(${Math.max(.15, b)}) contrast(${Math.max(.2, c)}) saturate(${Math.max(0, s)}) sepia(${Math.max(0, adjust.warmth) / 350}) hue-rotate(${Math.min(0, adjust.warmth) / 8}deg)`;
  }, [visibleFilter, adjust]);

  const snapshot = useCallback(() => ({ adjust, filter, rotation, flipX, zoom, cropRatio }), [adjust, filter, rotation, flipX, zoom, cropRatio]);
  const commit = useCallback((next) => {
    setHistory((h) => [...h.slice(-29), snapshot()]);
    setFuture([]);
    next();
  }, [snapshot]);

  const importFiles = useCallback((files) => {
    const accepted = [...files].filter((f) => f.type.startsWith("image/"));
    if (!accepted.length) return;
    const next = accepted.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      edits: null,
    }));
    setPhotos((old) => [...old, ...next]);
    setActiveId((id) => id || next[0].id);
    setSelected((old) => [...new Set([...old, ...next.map((p) => p.id)])]);
    setToast(`${next.length}장의 사진을 가져왔습니다.`);
  }, []);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function selectPhoto(photo, event) {
    setActiveId(photo.id);
    if (event?.ctrlKey || event?.metaKey) {
      setSelected((s) => s.includes(photo.id) ? s.filter((id) => id !== photo.id) : [...s, photo.id]);
    } else {
      setSelected([photo.id]);
    }
    if (photo.edits) {
      setAdjust(photo.edits.adjust);
      setFilter(photo.edits.filter);
      setRotation(photo.edits.rotation || 0);
      setFlipX(Boolean(photo.edits.flipX));
    }
  }

  function changeAdjust(key, value) {
    setAdjust((a) => ({ ...a, [key]: value }));
  }

  function applyAuto() {
    commit(() => {
      setAdjust({ exposure: 8, contrast: 7, saturation: 8, warmth: 3, highlights: -8, shadows: 12 });
      setFilter("Clean");
      setToast("사진을 분석해 자연스럽게 보정했습니다.");
    });
  }

  function undo() {
    const prev = history.at(-1);
    if (!prev) return;
    setFuture((f) => [snapshot(), ...f]);
    setHistory((h) => h.slice(0, -1));
    Object.entries(prev).forEach(([k, v]) => ({ adjust: setAdjust, filter: setFilter, rotation: setRotation, flipX: setFlipX, zoom: setZoom, cropRatio: setCropRatio }[k]?.(v)));
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((h) => [...h, snapshot()]);
    setFuture((f) => f.slice(1));
    Object.entries(next).forEach(([k, v]) => ({ adjust: setAdjust, filter: setFilter, rotation: setRotation, flipX: setFlipX, zoom: setZoom, cropRatio: setCropRatio }[k]?.(v)));
  }

  function rotate(direction) {
    commit(() => {
      setRotation((r) => (r + direction + 360) % 360);
      setZoom(1);
      setFitMode("contain");
    });
  }

  async function batchApply() {
    const targets = selected.length ? selected : photos.map((p) => p.id);
    if (!targets.length) return;
    const edits = { adjust, filter, rotation: 0, flipX: false };
    for (let i = 0; i < targets.length; i++) {
      await new Promise((r) => setTimeout(r, 35));
      setBatchProgress({ done: i + 1, total: targets.length });
    }
    setPhotos((ps) => ps.map((p) => targets.includes(p.id) ? { ...p, edits } : p));
    setTimeout(() => setBatchProgress(null), 900);
    setToast(`${targets.length}장에 같은 보정을 적용했습니다.`);
  }

  function download() {
    if (!active) return;
    const image = new Image();
    image.onload = () => {
      const quarter = rotation % 180 !== 0;
      const canvas = document.createElement("canvas");
      canvas.width = quarter ? image.naturalHeight : image.naturalWidth;
      canvas.height = quarter ? image.naturalWidth : image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.filter = cssFilter;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.scale(flipX ? -1 : 1, 1);
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      const ratioValue = cropRatio === "original" ? null : ({ "1:1": 1, "4:5": .8, "16:9": 16 / 9 })[cropRatio];
      let output = canvas;
      if (ratioValue) {
        const currentRatio = canvas.width / canvas.height;
        const sw = currentRatio > ratioValue ? canvas.height * ratioValue : canvas.width;
        const sh = currentRatio > ratioValue ? canvas.height : canvas.width / ratioValue;
        output = document.createElement("canvas");
        output.width = Math.round(sw);
        output.height = Math.round(sh);
        output.getContext("2d").drawImage(canvas, (canvas.width - sw) / 2, (canvas.height - sh) / 2, sw, sh, 0, 0, output.width, output.height);
      }
      output.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `PicAI_${active.name.replace(/\.[^.]+$/, "")}.jpg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, "image/jpeg", .94);
    };
    image.src = active.url;
  }

  const panel = (
    <div className="control-content">
      {tool === "basic" && <>
        <button className="auto-card" onClick={applyAuto}><span className="spark">✦</span><span><strong>AI 자동 보정</strong><small>밝기·대비·색감을 한 번에</small></span><span>실행</span></button>
        <div className="quick-grid">
          <button onClick={() => changeAdjust("exposure", 12)}>☀ 밝게</button>
          <button onClick={() => changeAdjust("warmth", 18)}>♨ 따뜻하게</button>
          <button onClick={() => changeAdjust("saturation", 15)}>◉ 선명하게</button>
          <button onClick={() => setAdjust(DEFAULTS)}>↺ 기본값</button>
        </div>
        <section><h3>빛</h3>
          <Slider label="노출" value={adjust.exposure} onChange={(v) => changeAdjust("exposure", v)} />
          <Slider label="대비" value={adjust.contrast} onChange={(v) => changeAdjust("contrast", v)} />
          <Slider label="하이라이트" value={adjust.highlights} onChange={(v) => changeAdjust("highlights", v)} />
          <Slider label="그림자" value={adjust.shadows} onChange={(v) => changeAdjust("shadows", v)} />
        </section>
        <section><h3>색상</h3>
          <Slider label="채도" value={adjust.saturation} onChange={(v) => changeAdjust("saturation", v)} />
          <Slider label="온도" value={adjust.warmth} onChange={(v) => changeAdjust("warmth", v)} />
        </section>
      </>}
      {tool === "transform" && <>
        <section><h3>회전과 반전</h3><p className="hint">회전 후에도 사진 전체가 프레임 안에 유지됩니다.</p>
          <div className="action-grid">
            <button onClick={() => rotate(-90)}>↶ 왼쪽 90°</button>
            <button onClick={() => rotate(90)}>↷ 오른쪽 90°</button>
            <button onClick={() => commit(() => setFlipX((v) => !v))}>↔ 좌우 반전</button>
            <button onClick={() => { setRotation(0); setFlipX(false); }}>↺ 초기화</button>
          </div>
        </section>
        <section><h3>확대 및 축소</h3>
          <Slider label="배율" min={25} max={300} value={Math.round(zoom * 100)} onChange={(v) => setZoom(v / 100)} />
          <div className="action-grid"><button onClick={() => setZoom(1)}>100%</button><button onClick={() => { setZoom(1); setFitMode("contain"); }}>화면 맞춤</button></div>
        </section>
        <section><h3>자르기</h3><p className="hint">사진을 늘이거나 변형하지 않고 중앙 기준으로 안전하게 자릅니다.</p>
          <div className="ratio-row">{["original","1:1","4:5","16:9"].map((ratio) => <button className={cropRatio === ratio ? "active" : ""} key={ratio} onClick={() => commit(() => setCropRatio(ratio))}>{ratio === "original" ? "원본" : ratio}</button>)}</div>
        </section>
      </>}
      {tool === "curve" && <CurvePanel />}
      {tool === "batch" && <>
        <section><h3>일괄 보정</h3><p className="hint">선택한 사진에 현재 프리셋과 색상 보정을 적용합니다. 회전과 자르기는 사진마다 달라 제외됩니다.</p>
          <div className="batch-summary"><strong>{selected.length || photos.length}장 선택됨</strong><span>프리셋 · 톤 · 색상</span></div>
          <button className="primary wide" onClick={batchApply} disabled={!photos.length}>선택 사진에 보정 적용</button>
          {batchProgress && <div className="progress"><span style={{ width: `${batchProgress.done / batchProgress.total * 100}%` }} /><em>{batchProgress.done} / {batchProgress.total}</em></div>}
        </section>
      </>}
    </div>
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brandmark">P</div><div><strong>PicAI Studio</strong><small>빠르고 정확한 사진 편집</small></div></div>
        <nav className="mode-tabs"><button className="active">편집</button><button>라이브러리 <b>{photos.length}</b></button></nav>
        <div className="top-actions">
          <button aria-label="실행 취소" disabled={!history.length} onClick={undo}>↶</button>
          <button aria-label="다시 실행" disabled={!future.length} onClick={redo}>↷</button>
          <button className="ghost" onClick={() => { setAdjust(DEFAULTS); setFilter(null); setRotation(0); setZoom(1); }}>초기화</button>
          <button className="primary" onClick={download} disabled={!active}>내보내기</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="library-panel">
          <div className="panel-title"><span>사진</span><button onClick={() => fileRef.current?.click()}>＋ 가져오기</button></div>
          <input ref={fileRef} hidden type="file" multiple accept="image/*" onChange={(e) => importFiles(e.target.files)} />
          {!photos.length ? <button className="dropzone" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); importFiles(e.dataTransfer.files); }}>
            <Icon>↑</Icon><strong>사진 가져오기</strong><small>JPG, PNG, WEBP</small><small>100장 이상 선택 가능</small>
          </button> :
          <div className="photo-list">
            <div className="selection-tools"><span>{selected.length}장 선택</span><button onClick={() => setSelected(photos.map((p) => p.id))}>전체</button></div>
            {photos.map((photo) => <button key={photo.id} className={`photo-item ${photo.id === activeId ? "active" : ""} ${selected.includes(photo.id) ? "selected" : ""}`} onClick={(e) => selectPhoto(photo, e)}>
              <img src={photo.url} alt="" /><span><strong>{photo.name}</strong><small>{(photo.size / 1024 / 1024).toFixed(1)} MB</small></span><i>{selected.includes(photo.id) ? "✓" : ""}</i>
            </button>)}
          </div>}
          <div className="storage-note"><span>⚡</span><p><strong>로컬에서 안전하게</strong><small>사진은 서버로 전송되지 않습니다.</small></p></div>
        </aside>

        <section className="stage">
          <div className="canvas-toolbar">
            <span>{active ? active.name : "편집할 사진을 선택하세요"}</span>
            <div><button onClick={() => setZoom((z) => Math.max(.25, z - .25))}>−</button><output>{Math.round(zoom * 100)}%</output><button onClick={() => setZoom((z) => Math.min(3, z + .25))}>＋</button><button onClick={() => { setZoom(1); setFitMode("contain"); }}>맞춤</button></div>
          </div>
          <div className="canvas-wrap" onWheel={(e) => { if (active) { e.preventDefault(); setZoom((z) => Math.min(3, Math.max(.25, z + (e.deltaY < 0 ? .1 : -.1)))); } }}>
            {active ? <div className={`image-frame crop-${cropRatio.replace(":","-")}`}><img className="editing-image" src={active.url} alt={active.name} style={{ filter: cssFilter, transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipX ? -1 : 1})`, objectFit: cropRatio === "original" ? fitMode : "cover" }} /></div> :
            <div className="empty-state"><div className="empty-art"><span>✦</span></div><h1>사진을 더 빠르고 정확하게</h1><p>사진을 가져오면 AI 자동 보정부터 필터, 회전, 일괄 편집까지 바로 시작할 수 있어요.</p><button className="primary large" onClick={() => fileRef.current?.click()}>사진 가져오기</button><button className="sample-link" onClick={() => setToast("내 사진을 업로드해 편집을 시작해보세요.")}>샘플로 둘러보기 →</button></div>}
          </div>
          {active && <div className="filter-strip">
            <div className="strip-head"><strong>필터</strong><span>마우스를 올리거나 길게 눌러 미리보기</span></div>
            <div className="filter-list">
              <button className={!filter ? "active" : ""} onClick={() => commit(() => setFilter(null))}><span className="none-thumb">∅</span><small>원본</small></button>
              {FILTERS.map(([id, name, style]) => <button key={id} className={filter === id ? "active" : ""} onMouseEnter={() => setHoverFilter(id)} onMouseLeave={() => setHoverFilter(null)} onPointerDown={() => { longPressRef.current = setTimeout(() => setHoverFilter(id), 320); }} onPointerUp={() => { clearTimeout(longPressRef.current); setHoverFilter(null); }} onClick={() => commit(() => setFilter(id))}>
                <img src={active.url} alt="" style={{ filter: style }} /><small>{name}</small>
              </button>)}
            </div>
          </div>}
        </section>

        <aside className="control-panel">
          <div className="tool-tabs">
            {[["basic", "☼", "기본"], ["transform", "⌗", "변형"], ["curve", "⌁", "커브"], ["batch", "▦", "일괄"]].map(([id, icon, label]) => <button key={id} className={tool === id ? "active" : ""} onClick={() => setTool(id)}><b>{icon}</b><span>{label}</span></button>)}
          </div>
          {panel}
        </aside>
      </div>

      <div className="mobile-stage-tabs">
        {[["filters", "◫", "필터"], ["basic", "☼", "보정"], ["transform", "⌗", "변형"], ["batch", "▦", "일괄"]].map(([id, icon, label]) => <button className={mobilePanel === id ? "active" : ""} key={id} onClick={() => { setMobilePanel(id); if (id !== "filters") setTool(id); }}><b>{icon}</b><span>{label}</span></button>)}
      </div>
      {active && mobilePanel !== "filters" && <div className="mobile-sheet">{panel}</div>}
      <div className="toast" role="status">{toast}</div>
    </main>
  );
}

function CurvePanel() {
  const [points, setPoints] = useState([[0, 100], [25, 72], [50, 50], [75, 28], [100, 0]]);
  const [drag, setDrag] = useState(null);
  function move(e) {
    if (drag == null) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100));
    const y = Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100));
    setPoints((p) => p.map((v, i) => i === drag ? [x, y] : v).sort((a, b) => a[0] - b[0]));
  }
  const path = points.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
  return <section><h3>톤 커브</h3><p className="hint">점을 부드럽게 드래그해 밝기와 대비를 조절하세요.</p>
    <svg className="curve" viewBox="0 0 100 100" preserveAspectRatio="none" onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
      {[25, 50, 75].map((n) => <g key={n}><line x1={n} y1="0" x2={n} y2="100" /><line x1="0" y1={n} x2="100" y2={n} /></g>)}
      <path d={path} />
      {points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(i); }} />)}
    </svg>
    <div className="curve-presets"><button onClick={() => setPoints([[0,100],[25,75],[50,50],[75,25],[100,0]])}>선형</button><button onClick={() => setPoints([[0,100],[25,82],[50,50],[75,18],[100,0]])}>S 커브</button><button onClick={() => setPoints([[0,90],[30,72],[70,30],[100,8]])}>매트</button></div>
  </section>;
}
