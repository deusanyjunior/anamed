'use client';

import { useEffect, useState } from 'react';

const zoomLevels = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const storageKey = 'anamed-accessibility-zoom';

export default function AccessibilityZoom() {
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(storageKey));
    if (!zoomLevels.includes(saved)) return;
    const frame = window.requestAnimationFrame(() => setZoom(saved));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.body.style.zoom = String(zoom);
    window.localStorage.setItem(storageKey, String(zoom));
    return () => {
      document.body.style.zoom = '';
    };
  }, [zoom]);

  function changeZoom(direction: -1 | 1) {
    setZoom(previous => {
      const index = zoomLevels.indexOf(previous);
      return zoomLevels[Math.max(0, Math.min(zoomLevels.length - 1, index + direction))];
    });
  }

  function resetZoom() {
    setZoom(1);
  }

  return (
    <div className={`accessibility-zoom ${open ? 'is-open' : ''}`} aria-label="Controles de zoom">
      {open && (
        <div className="accessibility-zoom-panel">
          <button type="button" onClick={() => changeZoom(-1)} aria-label="Diminuir zoom" disabled={zoom === zoomLevels[0]}>−</button>
          <button type="button" onClick={resetZoom} aria-label="Restaurar zoom padrão">{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => changeZoom(1)} aria-label="Aumentar zoom" disabled={zoom === zoomLevels[zoomLevels.length - 1]}>+</button>
        </div>
      )}
      <button type="button" className="accessibility-zoom-toggle" onClick={() => setOpen(previous => !previous)} aria-expanded={open} aria-label={open ? 'Fechar controles de zoom' : 'Abrir controles de zoom'}>
        Zoom
      </button>
    </div>
  );
}
