"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

const FILTERS = [
  ["Clean", "源⑤걮?섍쾶", "brightness(1.05) contrast(1.04) saturate(1.02)"],
  ["Portrait", "?몃Ъ", "brightness(1.06) contrast(.96) saturate(.94) sepia(.04)"],
  ["Vivid", "?좊챸???띻꼍", "contrast(1.12) saturate(1.28)"],
  ["Film", "?꾨쫫", "contrast(.94) saturate(.82) sepia(.16)"],
  ["Cinema", "?쒕꽕留?, "contrast(1.18) saturate(.86) hue-rotate(-8deg)"],
  ["Golden", "怨⑤뱺?꾩썙", "brightness(1.05) saturate(1.14) sepia(.2)"],
  ["Mono", "?묐갚", "grayscale(1) contrast(1.12)"],
  ["Matte", "留ㅽ듃", "contrast(.86) brightness(1.05) saturate(.88)"],
  ["Night", "?쇨꼍", "brightness(.9) contrast(1.2) saturate(1.18) hue-rotate(5deg)"],
  ["Food", "?뚯떇", "brightness(1.03) contrast(1.06) saturate(1.2) sepia(.08)"],
  ["Pastel", "?뚯뒪??, "brightness(1.09) contrast(.86) saturate(.84)"],
  ["Moody", "臾대뵒", "brightness(.84) contrast(1.18) saturate(.78)"],
  ["Travel", "?ы뻾", "brightness(1.04) contrast(1.06) saturate(1.16)"],
  ["Skin", "?쇰? ??, "brightness(1.04) contrast(.96) saturate(.92) sepia(.08)"],
  ["Air", "留묒? 怨듦린", "brightness(1.08) contrast(1.02) saturate(.9)"],
  ["Ocean", "諛붾떎", "contrast(1.07) saturate(1.2) hue-rotate(8deg)"],
  ["Autumn", "媛??, "contrast(1.05) saturate(1.12) sepia(.25)"],
  ["Cafe", "移댄럹", "brightness(.98) contrast(1.05) sepia(.2)"],
  ["Dream", "?쒕┝", "brightness(1.08) contrast(.86) saturate(1.08)"],
  ["Documentary", "?ㅽ걧", "contrast(1.1) saturate(.72)"],
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
  const [toast, setToast] = useState("?ъ쭊??遺덈윭?ㅻ㈃ 諛붾줈 ?몄쭛?????덉뼱??");
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
    setToast(`${next.length}?μ쓽 ?ъ쭊??媛?몄솕?듬땲??`);
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
      setToast("?ъ쭊??遺꾩꽍???먯뿰?ㅻ읇寃?蹂댁젙?덉뒿?덈떎.");
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
    setToast(`${targets.length}?μ뿉 媛숈? 蹂댁젙???곸슜?덉뒿?덈떎.`);
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
        <button className="auto-card" onClick={applyAuto}><span className="spark">??/span><span><strong>AI ?먮룞 蹂댁젙</strong><small>諛앷린쨌?鍮꽷룹깋媛먯쓣 ??踰덉뿉</small></span><span>?ㅽ뻾</span></button>
        <div className="quick-grid">
          <button onClick={() => changeAdjust("exposure", 12)}>? 諛앷쾶</button>
          <button onClick={() => changeAdjust("warmth", 18)}>???곕쑜?섍쾶</button>
          <button onClick={() => changeAdjust("saturation", 15)}>???좊챸?섍쾶</button>
          <button onClick={() => setAdjust(DEFAULTS)}>??湲곕낯媛?/button>
        </div>
        <section><h3>鍮?/h3>
          <Slider label="?몄텧" value={adjust.exposure} onChange={(v) => changeAdjust("exposure", v)} />
          <Slider label="?鍮? value={adjust.contrast} onChange={(v) => changeAdjust("contrast", v)} />
          <Slider label="?섏씠?쇱씠?? value={adjust.highlights} onChange={(v) => changeAdjust("highlights", v)} />
          <Slider label="洹몃┝?? value={adjust.shadows} onChange={(v) => changeAdjust("shadows", v)} />
        </section>
        <section><h3>?됱긽</h3>
          <Slider label="梨꾨룄" value={adjust.saturation} onChange={(v) => changeAdjust("saturation", v)} />
          <Slider label="?⑤룄" value={adjust.warmth} onChange={(v) => changeAdjust("warmth", v)} />
        </section>
      </>}
      {tool === "transform" && <>
        <section><h3>?뚯쟾怨?諛섏쟾</h3><p className="hint">?뚯쟾 ?꾩뿉???ъ쭊 ?꾩껜媛 ?꾨젅???덉뿉 ?좎??⑸땲??</p>
          <div className="action-grid">
            <button onClick={() => rotate(-90)}>???쇱そ 90째</button>
            <button onClick={() => rotate(90)}>???ㅻⅨ履?90째</button>
            <button onClick={() => commit(() => setFlipX((v) => !v))}>??醫뚯슦 諛섏쟾</button>
            <button onClick={() => { setRotation(0); setFlipX(false); }}>??珥덇린??/button>
          </div>
        </section>
        <section><h3>?뺣? 諛?異뺤냼</h3>
          <Slider label="諛곗쑉" min={25} max={300} value={Math.round(zoom * 100)} onChange={(v) => setZoom(v / 100)} />
          <div className="action-grid"><button onClick={() => setZoom(1)}>100%</button><button onClick={() => { setZoom(1); setFitMode("contain"); }}>?붾㈃ 留욎땄</button></div>
        </section>
        <section><h3>?먮Ⅴ湲?/h3><p className="hint">?ъ쭊???섏씠嫄곕굹 蹂?뺥븯吏 ?딄퀬 以묒븰 湲곗??쇰줈 ?덉쟾?섍쾶 ?먮쫭?덈떎.</p>
          <div className="ratio-row">{["original","1:1","4:5","16:9"].map((ratio) => <button className={cropRatio === ratio ? "active" : ""} key={ratio} onClick={() => commit(() => setCropRatio(ratio))}>{ratio === "original" ? "?먮낯" : ratio}</button>)}</div>
        </section>
      </>}
      {tool === "curve" && <CurvePanel />}
      {tool === "batch" && <>
        <section><h3>?쇨큵 蹂댁젙</h3><p className="hint">?좏깮???ъ쭊???꾩옱 ?꾨━?뗪낵 ?됱긽 蹂댁젙???곸슜?⑸땲?? ?뚯쟾怨??먮Ⅴ湲곕뒗 ?ъ쭊留덈떎 ?щ씪 ?쒖쇅?⑸땲??</p>
          <div className="batch-summary"><strong>{selected.length || photos.length}???좏깮??/strong><span>?꾨━??쨌 ??쨌 ?됱긽</span></div>
          <button className="primary wide" onClick={batchApply} disabled={!photos.length}>?좏깮 ?ъ쭊??蹂댁젙 ?곸슜</button>
          {batchProgress && <div className="progress"><span style={{ width: `${batchProgress.done / batchProgress.total * 100}%` }} /><em>{batchProgress.done} / {batchProgress.total}</em></div>}
        </section>
      </>}
    </div>
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brandmark">P</div><div><strong>PicAI Studio</strong><small>鍮좊Ⅴ怨??뺥솗???ъ쭊 ?몄쭛</small></div></div>
        <nav className="mode-tabs"><button className="active">?몄쭛</button><button>?쇱씠釉뚮윭由?<b>{photos.length}</b></button></nav>
        <div className="top-actions">
          <button aria-label="?ㅽ뻾 痍⑥냼" disabled={!history.length} onClick={undo}>??/button>
          <button aria-label="?ㅼ떆 ?ㅽ뻾" disabled={!future.length} onClick={redo}>??/button>
          <button className="ghost" onClick={() => { setAdjust(DEFAULTS); setFilter(null); setRotation(0); setZoom(1); }}>珥덇린??/button>
          <button className="primary" onClick={download} disabled={!active}>?대낫?닿린</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="library-panel">
          <div className="panel-title"><span>?ъ쭊</span><button onClick={() => fileRef.current?.click()}>竊?媛?몄삤湲?/button></div>
          <input ref={fileRef} hidden type="file" multiple accept="image/*" onChange={(e) => importFiles(e.target.files)} />
          {!photos.length ? <button className="dropzone" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); importFiles(e.dataTransfer.files); }}>
            <Icon>??/Icon><strong>?ъ쭊 媛?몄삤湲?/strong><small>JPG, PNG, WEBP</small><small>100???댁긽 ?좏깮 媛??/small>
          </button> :
          <div className="photo-list">
            <div className="selection-tools"><span>{selected.length}???좏깮</span><button onClick={() => setSelected(photos.map((p) => p.id))}>?꾩껜</button></div>
            {photos.map((photo) => <button key={photo.id} className={`photo-item ${photo.id === activeId ? "active" : ""} ${selected.includes(photo.id) ? "selected" : ""}`} onClick={(e) => selectPhoto(photo, e)}>
              <img src={photo.url} alt="" /><span><strong>{photo.name}</strong><small>{(photo.size / 1024 / 1024).toFixed(1)} MB</small></span><i>{selected.includes(photo.id) ? "?? : ""}</i>
            </button>)}
          </div>}
          <div className="storage-note"><span>??/span><p><strong>濡쒖뺄?먯꽌 ?덉쟾?섍쾶</strong><small>?ъ쭊? ?쒕쾭濡??꾩넚?섏? ?딆뒿?덈떎.</small></p></div>
        </aside>

        <section className="stage">
          <div className="canvas-toolbar">
            <span>{active ? active.name : "?몄쭛???ъ쭊???좏깮?섏꽭??}</span>
            <div><button onClick={() => setZoom((z) => Math.max(.25, z - .25))}>??/button><output>{Math.round(zoom * 100)}%</output><button onClick={() => setZoom((z) => Math.min(3, z + .25))}>竊?/button><button onClick={() => { setZoom(1); setFitMode("contain"); }}>留욎땄</button></div>
          </div>
          <div className="canvas-wrap" onWheel={(e) => { if (active) { e.preventDefault(); setZoom((z) => Math.min(3, Math.max(.25, z + (e.deltaY < 0 ? .1 : -.1)))); } }}>
            {active ? <div className={`image-frame crop-${cropRatio.replace(":","-")}`}><img className="editing-image" src={active.url} alt={active.name} style={{ filter: cssFilter, transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipX ? -1 : 1})`, objectFit: cropRatio === "original" ? fitMode : "cover" }} /></div> :
            <div className="empty-state"><div className="empty-art"><span>??/span></div><h1>?ъ쭊????鍮좊Ⅴ怨??뺥솗?섍쾶</h1><p>?ъ쭊??媛?몄삤硫?AI ?먮룞 蹂댁젙遺???꾪꽣, ?뚯쟾, ?쇨큵 ?몄쭛源뚯? 諛붾줈 ?쒖옉?????덉뼱??</p><button className="primary large" onClick={() => fileRef.current?.click()}>?ъ쭊 媛?몄삤湲?/button><button className="sample-link" onClick={() => setToast("???ъ쭊???낅줈?쒗빐 ?몄쭛???쒖옉?대낫?몄슂.")}>?섑뵆濡??섎윭蹂닿린 ??/button></div>}
          </div>
          {active && <div className="filter-strip">
            <div className="strip-head"><strong>?꾪꽣</strong><span>留덉슦?ㅻ? ?щ━嫄곕굹 湲멸쾶 ?뚮윭 誘몃━蹂닿린</span></div>
            <div className="filter-list">
              <button className={!filter ? "active" : ""} onClick={() => commit(() => setFilter(null))}><span className="none-thumb">??/span><small>?먮낯</small></button>
              {FILTERS.map(([id, name, style]) => <button key={id} className={filter === id ? "active" : ""} onMouseEnter={() => setHoverFilter(id)} onMouseLeave={() => setHoverFilter(null)} onPointerDown={() => { longPressRef.current = setTimeout(() => setHoverFilter(id), 320); }} onPointerUp={() => { clearTimeout(longPressRef.current); setHoverFilter(null); }} onClick={() => commit(() => setFilter(id))}>
                <img src={active.url} alt="" style={{ filter: style }} /><small>{name}</small>
              </button>)}
            </div>
          </div>}
        </section>

        <aside className="control-panel">
          <div className="tool-tabs">
            {[["basic", "??, "湲곕낯"], ["transform", "??, "蹂??], ["curve", "??, "而ㅻ툕"], ["batch", "??, "?쇨큵"]].map(([id, icon, label]) => <button key={id} className={tool === id ? "active" : ""} onClick={() => setTool(id)}><b>{icon}</b><span>{label}</span></button>)}
          </div>
          {panel}
        </aside>
      </div>

      <div className="mobile-stage-tabs">
        {[["filters", "??, "?꾪꽣"], ["basic", "??, "蹂댁젙"], ["transform", "??, "蹂??], ["batch", "??, "?쇨큵"]].map(([id, icon, label]) => <button className={mobilePanel === id ? "active" : ""} key={id} onClick={() => { setMobilePanel(id); if (id !== "filters") setTool(id); }}><b>{icon}</b><span>{label}</span></button>)}
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
  return <section><h3>??而ㅻ툕</h3><p className="hint">?먯쓣 遺?쒕읇寃??쒕옒洹명빐 諛앷린? ?鍮꾨? 議곗젅?섏꽭??</p>
    <svg className="curve" viewBox="0 0 100 100" preserveAspectRatio="none" onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
      {[25, 50, 75].map((n) => <g key={n}><line x1={n} y1="0" x2={n} y2="100" /><line x1="0" y1={n} x2="100" y2={n} /></g>)}
      <path d={path} />
      {points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(i); }} />)}
    </svg>
    <div className="curve-presets"><button onClick={() => setPoints([[0,100],[25,75],[50,50],[75,25],[100,0]])}>?좏삎</button><button onClick={() => setPoints([[0,100],[25,82],[50,50],[75,18],[100,0]])}>S 而ㅻ툕</button><button onClick={() => setPoints([[0,90],[30,72],[70,30],[100,8]])}>留ㅽ듃</button></div>
  </section>;
}
