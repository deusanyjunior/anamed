'use client';

import Image from 'next/image';
import { useId, useMemo, useRef, useState } from 'react';
import type { OverlayPoint, StudyOverlay } from '@/types';

const DOCS_BASE = 'http://localhost:8000';
type OverlayTool = StudyOverlay['tipo'];

type Props = {
  imageUrl: string;
  overlays?: StudyOverlay[];
  onChange: (overlays: StudyOverlay[]) => void;
};

const toolLabels: Record<OverlayTool, string> = {
  seta: 'Seta',
  linha: 'Linha',
  area: 'Área',
  'area-preenchida': 'Área preenchida',
  'area-inversa': 'Área inversa',
  orientacao: 'Orientação',
};

type OrientationConfig = {
  id: string;
  label: string;
  horizontal: [string, string];
  vertical: [string, string];
};

const orientationDirections: [string, string][] = [
  ['direita', 'esquerda'],
  ['esquerda', 'direita'],
  ['anterior', 'posterior'],
  ['posterior', 'anterior'],
  ['superior', 'inferior'],
  ['inferior', 'superior'],
];

const orientationOptions: OrientationConfig[] = orientationDirections.flatMap(horizontal =>
  orientationDirections.map(vertical => ({
    id: `${horizontal[0]}-${horizontal[1]}__${vertical[0]}-${vertical[1]}`,
    label: `H: ${horizontal[0]}/${horizontal[1]} · V: ${vertical[0]}/${vertical[1]}`,
    horizontal,
    vertical,
  }))
);

function orientationConfig(id?: string) {
  return orientationOptions.find(option => option.id === id) ?? orientationOptions[0];
}

function previewUrl(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith('/') ? url : `${DOCS_BASE}/${url}`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function minimumPoints(tool: OverlayTool) {
  return tool === 'orientacao' ? 1 : tool === 'seta' ? 2 : tool === 'linha' ? 2 : 3;
}

function pointsString(points: OverlayPoint[]) {
  return points.map(point => `${point.x},${point.y}`).join(' ');
}

function pointsLabel(count: number) {
  return `${count} ${count === 1 ? 'ponto' : 'pontos'}`;
}

export default function OverlayEditor({ imageUrl, overlays = [], onChange }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgPrefix = useId().replaceAll(':', '');
  const [tool, setTool] = useState<OverlayTool>('seta');
  const [draftPoints, setDraftPoints] = useState<OverlayPoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [color, setColor] = useState('#dc2626');
  const [opacity, setOpacity] = useState(0.85);
  const [orientationHorizontal, setOrientationHorizontal] = useState(orientationDirections[0].join('-'));
  const [orientationVertical, setOrientationVertical] = useState(orientationDirections[4].join('-'));
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const arrowReplacementIndex = useRef(0);

  const selected = useMemo(() => overlays.find(overlay => overlay.id === selectedId), [overlays, selectedId]);
  const orientationOption = `${orientationHorizontal}__${orientationVertical}`;

  function pointFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame) return null;
    const rect = frame.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-overlay-point]')) return;
    const point = pointFromEvent(event);
    if (!point) return;
    setSelectedId(null);
    setActiveOverlayId(null);
    if (tool === 'orientacao') {
      setDraftPoints([point]);
      return;
    }
    if (tool === 'seta') {
      if (draftPoints.length < 2) {
        if (draftPoints.length === 0) arrowReplacementIndex.current = 0;
        setDraftPoints([...draftPoints, point]);
        return;
      }
      const replacementIndex = arrowReplacementIndex.current;
      arrowReplacementIndex.current = (replacementIndex + 1) % 2;
      setDraftPoints(previous => {
        const next = [...previous];
        next[replacementIndex] = point;
        return next;
      });
      return;
    }
    setDraftPoints(previous => [...previous, point]);
  }

  function finishOverlay() {
    if (draftPoints.length < minimumPoints(tool)) {
      alert(`${toolLabels[tool]} precisa de pelo menos ${pointsLabel(minimumPoints(tool))}.`);
      return;
    }
    const overlay: StudyOverlay = {
      id: selected?.id ?? `overlay-${crypto.randomUUID()}`,
      tipo: tool,
      pontos: draftPoints,
      ...(tool === 'orientacao' ? { orientacao: orientationOption, posicao: draftPoints[0] } : {}),
      cor: color,
      espessura: 0.006,
      opacidade: opacity,
    };
    onChange(selected ? overlays.map(item => item.id === selected.id ? overlay : item) : [...overlays, overlay]);
    setSelectedId(null);
    setActiveOverlayId(overlay.id);
    setDraftPoints([]);
  }

  function previewOverlay(overlay: StudyOverlay) {
    setActiveOverlayId(overlay.id);
    setSelectedId(null);
    setDraftPoints([]);
  }

  function editActiveOverlay() {
    const overlay = overlays.find(item => item.id === activeOverlayId);
    if (overlay) selectOverlay(overlay);
  }

  function selectOverlay(overlay: StudyOverlay) {
    setActiveOverlayId(null);
    setSelectedId(overlay.id);
    setTool(overlay.tipo);
    setColor(overlay.cor ?? '#dc2626');
    setOpacity(overlay.opacidade ?? 0.85);
    if (overlay.tipo === 'orientacao') {
      const [horizontal, vertical] = (overlay.orientacao ?? '').split('__');
      if (horizontal) setOrientationHorizontal(horizontal);
      if (vertical) setOrientationVertical(vertical);
      setDraftPoints([overlay.posicao ?? overlay.pontos[0]]);
    } else {
      setDraftPoints(overlay.pontos);
    }
  }

  function updatePoint(pointIndex: number, event: React.PointerEvent<SVGCircleElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingPoint(pointIndex);
  }

  function moveDraggedPoint(event: React.PointerEvent<HTMLDivElement>) {
    if (draggingPoint === null || !selected) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const pontos = selected.pontos.map((item, index) => index === draggingPoint ? point : item);
    onChange(overlays.map(item => item.id === selected.id ? { ...item, pontos, ...(item.tipo === 'orientacao' ? { posicao: point } : {}) } : item));
    setDraftPoints(pontos);
  }

  function finishDragging() {
    setDraggingPoint(null);
  }

  function removeSelected() {
    const targetId = selectedId ?? activeOverlayId;
    if (!targetId) return;
    onChange(overlays.filter(item => item.id !== targetId));
    setSelectedId(null);
    setActiveOverlayId(null);
    setDraftPoints([]);
  }

  function previewAll() {
    setSelectedId(null);
    setActiveOverlayId(null);
    setDraftPoints([]);
  }

  function startNewOverlay() {
    setSelectedId(null);
    setActiveOverlayId(null);
    setDraftPoints([]);
    setTool('seta');
    arrowReplacementIndex.current = 0;
  }

  function renderOverlay(overlay: StudyOverlay) {
    const points = pointsString(overlay.pontos);
    const colorValue = overlay.cor ?? '#dc2626';
    const common = { stroke: colorValue, strokeWidth: 0.006, opacity: overlay.opacidade ?? 0.85 };
    if (overlay.tipo === 'orientacao' && (overlay.posicao || overlay.pontos[0])) {
      const position = overlay.posicao ?? overlay.pontos[0];
      const config = orientationConfig(overlay.orientacao);
      return <g key={overlay.id} transform={`translate(${position.x} ${position.y})`} opacity={overlay.opacidade ?? 0.85}>
        <line x1="-0.045" y1="0" x2="0.045" y2="0" stroke={colorValue} strokeWidth="0.003" />
        <line x1="0" y1="-0.045" x2="0" y2="0.045" stroke={colorValue} strokeWidth="0.003" />
        <circle cx="0" cy="0" r="0.006" fill={colorValue} />
        <text x="-0.052" y="0.008" textAnchor="end" fontSize="0.019" fontWeight="700" fill={colorValue}>{config.horizontal[0]}</text>
        <text x="0.052" y="0.008" textAnchor="start" fontSize="0.019" fontWeight="700" fill={colorValue}>{config.horizontal[1]}</text>
        <text x="0" y="-0.055" textAnchor="middle" fontSize="0.019" fontWeight="700" fill={colorValue}>{config.vertical[0]}</text>
        <text x="0" y="0.07" textAnchor="middle" fontSize="0.019" fontWeight="700" fill={colorValue}>{config.vertical[1]}</text>
      </g>;
    }
    if (overlay.tipo === 'seta' && overlay.pontos.length >= 2) {
      const start = overlay.pontos[0];
      const end = overlay.pontos[overlay.pontos.length - 1];
      return <line key={overlay.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} {...common} strokeLinecap="round" markerEnd={`url(#${svgPrefix}-arrow-${overlay.id})`} />;
    }
    if (overlay.tipo === 'linha') return <polyline key={overlay.id} points={points} fill="none" {...common} strokeLinejoin="round" />;
    if (overlay.tipo === 'area-inversa' && overlay.pontos.length >= 3) {
      return <g key={overlay.id}>
        <rect x="0" y="0" width="1" height="1" fill={colorValue} fillOpacity={Math.min(overlay.opacidade ?? 0.85, 0.35)} mask={`url(#${svgPrefix}-inverse-${overlay.id})`} />
        <polygon points={points} fill="none" {...common} strokeLinejoin="round" />
      </g>;
    }
    return <polygon key={overlay.id} points={points} fill={overlay.tipo === 'area-preenchida' ? colorValue : 'none'} fillOpacity={overlay.tipo === 'area-preenchida' ? 0.3 : 0} {...common} strokeLinejoin="round" />;
  }

  const displayedOverlays = selected ? overlays.map(item => item.id === selected.id ? { ...item, pontos: draftPoints, ...(item.tipo === 'orientacao' && draftPoints[0] ? { posicao: draftPoints[0] } : {}) } : item) : overlays;
  const draftOverlay = tool === 'orientacao'
    ? { id: 'draft', tipo: tool, pontos: draftPoints, posicao: draftPoints[0], orientacao: orientationOption, cor: color, opacidade: opacity }
    : { id: 'draft', tipo: tool, pontos: draftPoints, cor: color, opacidade: opacity };
  const previewOverlays = draftPoints.length > 0 && !selectedId ? [...displayedOverlays, draftOverlay] : displayedOverlays;
  const orderedPreviewOverlays = [...previewOverlays].sort((first, second) => Number(first.tipo === 'orientacao') - Number(second.tipo === 'orientacao'));

  const editingMode = selectedId !== null || draftPoints.length > 0;

  return (
    <div className="mt-3 border border-slate-200 rounded-lg bg-white p-3 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <strong className="text-xs text-slate-700">Overlay</strong>
        {(Object.keys(toolLabels) as OverlayTool[]).map(value => (
          <button key={value} type="button" onClick={() => { setTool(value); setSelectedId(null); setActiveOverlayId(null); setDraftPoints([]); if (value === 'seta') arrowReplacementIndex.current = 0; }} className={`text-xs border rounded px-2 py-1 ${tool === value && !selectedId ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
            {toolLabels[value]}
          </button>
        ))}
        <label className="text-xs text-slate-600 flex items-center gap-1">Cor da linha <input type="color" value={color} onChange={event => setColor(event.target.value)} /></label>
        <label className="text-xs text-slate-600 flex items-center gap-1">Opacidade <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></label>
      </div>

      {tool === 'orientacao' && <div className="grid gap-2 rounded bg-slate-50 border border-slate-200 p-2">
        <div>
          <span className="block text-[11px] font-semibold text-slate-700 mb-1">Horizontal</span>
          <div className="flex flex-wrap gap-1">
            {orientationDirections.map(direction => {
              const id = direction.join('-');
              return <button key={id} type="button" onClick={() => setOrientationHorizontal(id)} className={`text-[11px] rounded border px-2 py-1 ${orientationHorizontal === id ? 'border-blue-600 bg-blue-100 text-blue-800' : 'border-slate-300 bg-white text-slate-700'}`}>{direction[0]}/{direction[1]}</button>;
            })}
          </div>
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-slate-700 mb-1">Vertical</span>
          <div className="flex flex-wrap gap-1">
            {orientationDirections.map(direction => {
              const id = direction.join('-');
              return <button key={id} type="button" onClick={() => setOrientationVertical(id)} className={`text-[11px] rounded border px-2 py-1 ${orientationVertical === id ? 'border-blue-600 bg-blue-100 text-blue-800' : 'border-slate-300 bg-white text-slate-700'}`}>{direction[0]}/{direction[1]}</button>;
            })}
          </div>
        </div>
      </div>}

      <p className="text-[11px] text-slate-500">{tool === 'seta' ? 'A seta usa dois pontos: origem e ponta. Após o segundo clique, os próximos alternam a substituição desses pontos.' : 'Clique na imagem para marcar pontos. Finalize a forma quando terminar; os pontos podem ser arrastados depois.'}</p>
      <div ref={frameRef} className="relative aspect-[4/3] w-full max-w-2xl overflow-hidden rounded border border-slate-200 bg-slate-100" onPointerDown={handleCanvasPointerDown} onPointerMove={moveDraggedPoint} onPointerUp={finishDragging} onPointerCancel={finishDragging}>
        <Image src={previewUrl(imageUrl)} alt="Imagem para editar overlay" fill unoptimized sizes="(max-width: 640px) 100vw, 672px" className="object-contain" draggable={false} />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
          <defs>
            {previewOverlays.filter(overlay => overlay.tipo === 'seta').map(overlay => (
              <marker key={`marker-${overlay.id}`} id={`${svgPrefix}-arrow-${overlay.id}`} markerWidth="0.08" markerHeight="0.08" refX="0.07" refY="0.04" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 0.08 0.04 L 0 0.08 z" fill={overlay.cor ?? '#dc2626'} /></marker>
            ))}
            {previewOverlays.filter(overlay => overlay.tipo === 'area-inversa').map(overlay => (
              <mask key={`mask-${overlay.id}`} id={`${svgPrefix}-inverse-${overlay.id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1" height="1">
                <rect width="1" height="1" fill="white" />
                <polygon points={pointsString(overlay.pontos)} fill="black" />
              </mask>
            ))}
          </defs>
          {orderedPreviewOverlays.map(overlay => renderOverlay(overlay))}
          {(selected?.pontos ?? draftPoints).map((point, index) => (
            <circle key={`${index}-${point.x}-${point.y}`} data-overlay-point="true" cx={point.x} cy={point.y} r="0.012" fill="#fff" stroke={color} strokeWidth="0.004" onPointerDown={event => updatePoint(index, event)} />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={previewAll} className="text-xs bg-slate-100 border border-slate-300 rounded px-3 py-1.5">Preview</button>
        <button type="button" onClick={startNewOverlay} className="text-xs bg-emerald-50 border border-emerald-300 text-emerald-700 rounded px-3 py-1.5">Novo overlay</button>
        <button type="button" onClick={editingMode ? finishOverlay : editActiveOverlay} disabled={!editingMode && !activeOverlayId} className="text-xs border border-blue-300 bg-blue-50 text-blue-700 disabled:opacity-40 rounded px-3 py-1.5">{editingMode ? 'Finalizar overlay' : 'Editar overlay'}</button>
        <button type="button" onClick={removeSelected} disabled={!selectedId && !activeOverlayId} className="text-xs text-red-600 border border-red-200 rounded px-3 py-1.5 disabled:opacity-40">Remover overlay</button>
      </div>

      {overlays.length > 0 && <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-2">
        {overlays.map(overlay => <button key={overlay.id} type="button" onClick={() => previewOverlay(overlay)} className={`text-xs rounded px-2 py-1 border ${activeOverlayId === overlay.id ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-700'}`}>
          {toolLabels[overlay.tipo]} ({pointsLabel(overlay.pontos.length)})
        </button>)}
      </div>}
    </div>
  );
}
