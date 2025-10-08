import { SheetDrawing } from '../types';

// Helper: Generate SVG for a drawing
function generateDrawingSVG(drawing: SheetDrawing, width = 400, height = 300): string {
  if (drawing.points.length < 2) return '';

  // Calculate bounds
  const xs = drawing.points.map(p => p.x);
  const ys = drawing.points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  const drawingWidth = maxX - minX;
  const drawingHeight = maxY - minY;
  
  // Calculate scale to fit
  const scale = Math.min(
    (width - 40) / drawingWidth,
    (height - 40) / drawingHeight
  );
  
  // Center offset
  const offsetX = (width - drawingWidth * scale) / 2 - minX * scale;
  const offsetY = (height - drawingHeight * scale) / 2 - minY * scale;
  
  // Transform point
  const tx = (p: { x: number; y: number }) => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY
  });
  
  const transformedPoints = drawing.points.map(tx);
  
  // Generate polyline points
  const polylinePoints = transformedPoints
    .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  
  // Generate decorations
  let decorationsSVG = '';
  for (const decor of drawing.decorations) {
    const p = decor.pos === 'start' 
      ? transformedPoints[0] 
      : transformedPoints[transformedPoints.length - 1];
    
    const q = decor.pos === 'start'
      ? transformedPoints[1]
      : transformedPoints[transformedPoints.length - 2];
    
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const baseLen = decor.sizeMM * scale * 0.5; // scaled size
    
    if (decor.kind === 'HEM_CLOSED') {
      const angle1 = angle + (decor.pos === 'start' ? 180 : 0) - 30;
      const rad1 = angle1 * Math.PI / 180;
      const p2x = p.x + Math.cos(rad1) * baseLen;
      const p2y = p.y + Math.sin(rad1) * baseLen;
      const angle2 = angle1 + 160;
      const rad2 = angle2 * Math.PI / 180;
      const p3x = p2x + Math.cos(rad2) * baseLen * 0.7;
      const p3y = p2y + Math.sin(rad2) * baseLen * 0.7;
      decorationsSVG += `<polyline points="${p.x},${p.y} ${p2x},${p2y} ${p3x},${p3y}" fill="none" stroke="#ef4444" stroke-width="2"/>`;
    } else if (decor.kind === 'HEM_OPEN') {
      const angle1 = angle + (decor.pos === 'start' ? 180 : 0) - 30;
      const rad1 = angle1 * Math.PI / 180;
      const p2x = p.x + Math.cos(rad1) * baseLen;
      const p2y = p.y + Math.sin(rad1) * baseLen;
      decorationsSVG += `<line x1="${p.x}" y1="${p.y}" x2="${p2x}" y2="${p2y}" stroke="#ef4444" stroke-width="2"/>`;
    } else if (decor.kind === 'CREASE') {
      const skew = 15;
      const angle1 = angle + (decor.pos === 'start' ? 180 : 0) - 30 + (decor.pos === 'start' ? -skew : skew);
      const rad1 = angle1 * Math.PI / 180;
      const p2x = p.x + Math.cos(rad1) * baseLen;
      const p2y = p.y + Math.sin(rad1) * baseLen;
      decorationsSVG += `<line x1="${p.x}" y1="${p.y}" x2="${p2x}" y2="${p2y}" stroke="#ef4444" stroke-width="2"/>`;
    }
  }
  
  // Paint side arrow
  let paintArrowSVG = '';
  if (drawing.paintSide) {
    const cx = (minX + maxX) / 2 * scale + offsetX;
    const cy = (minY + maxY) / 2 * scale + offsetY;
    const scaledWidth = drawingWidth * scale;
    const scaledHeight = drawingHeight * scale;
    let ax = cx, ay = cy, lx = cx, ly = cy;
    const off = 20;
    
    if (drawing.paintSide === 'TOP') {
      ay = cy - scaledHeight / 2 - off;
      ly = cy - scaledHeight / 2;
    } else if (drawing.paintSide === 'BOTTOM') {
      ay = cy + scaledHeight / 2 + off;
      ly = cy + scaledHeight / 2;
    } else if (drawing.paintSide === 'LEFT') {
      ax = cx - scaledWidth / 2 - off;
      lx = cx - scaledWidth / 2;
    } else if (drawing.paintSide === 'RIGHT') {
      ax = cx + scaledWidth / 2 + off;
      lx = cx + scaledWidth / 2;
    }
    
    paintArrowSVG = `
      <line x1="${ax}" y1="${ay}" x2="${lx}" y2="${ly}" stroke="${drawing.paintColor}" stroke-width="3" marker-end="url(#arrowhead-${drawing.id})"/>
      <defs>
        <marker id="arrowhead-${drawing.id}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="${drawing.paintColor}" />
        </marker>
      </defs>
    `;
  }
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f9fafb"/>
      <polyline points="${polylinePoints}" fill="none" stroke="#111827" stroke-width="3" stroke-linejoin="round"/>
      ${transformedPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#2563eb"/>`).join('')}
      ${decorationsSVG}
      ${paintArrowSVG}
    </svg>
  `;
}

// 📄 PDF Export with SVG drawings
export function exportDrawingsToPDF(drawings: SheetDrawing[], clientName: string) {
  if (drawings.length === 0) {
    alert('Pole jooniseid eksportimiseks!');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Palun luba popup\'id PDF eksportimiseks!');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Plekk Tellimus - ${clientName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          padding: 40px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #333;
          padding-bottom: 20px;
        }
        .header h1 {
          font-size: 32px;
          color: #333;
          margin-bottom: 10px;
        }
        .header p {
          color: #666;
          font-size: 14px;
        }
        .summary {
          background: #f5f5f5;
          padding: 20px;
          margin-bottom: 30px;
          border-radius: 8px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-item .label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .summary-item .value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        .drawing {
          page-break-inside: avoid;
          margin-bottom: 40px;
          border: 2px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }
        .drawing-header {
          background: #333;
          color: white;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .drawing-title {
          font-size: 18px;
          font-weight: bold;
        }
        .drawing-badge {
          background: white;
          color: #333;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }
        .drawing-body {
          padding: 20px;
        }
        .drawing-details {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .detail-item {
          text-align: center;
          padding: 10px;
          background: #f9f9f9;
          border-radius: 5px;
        }
        .detail-label {
          font-size: 11px;
          color: #666;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        .detail-value {
          font-size: 16px;
          font-weight: bold;
          color: #333;
        }
        .color-preview {
          display: inline-block;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid #ccc;
          vertical-align: middle;
          margin-left: 10px;
        }
        .drawing-svg {
          margin-top: 20px;
          display: flex;
          justify-content: center;
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
        }
        .footer {
          margin-top: 60px;
          text-align: center;
          color: #999;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 Plekk Tellimus</h1>
        <p>${clientName} | ${new Date().toLocaleDateString('et-EE')}</p>
      </div>

      <div class="summary">
        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">Jooniseid kokku</div>
            <div class="value">${drawings.length}</div>
          </div>
          <div class="summary-item">
            <div class="label">Plekke kokku</div>
            <div class="value">${drawings.reduce((sum, d) => sum + d.quantity, 0)} tk</div>
          </div>
          <div class="summary-item">
            <div class="label">Kogupikkus</div>
            <div class="value">${drawings.reduce((sum, d) => sum + (d.totalLengthMM * d.quantity), 0)} mm</div>
          </div>
        </div>
      </div>

      ${drawings.map((drawing, idx) => `
        <div class="drawing">
          <div class="drawing-header">
            <div class="drawing-title">Joonis #${idx + 1}</div>
            <div class="drawing-badge">${drawing.paintLabel}</div>
          </div>
          <div class="drawing-body">
            <div class="drawing-details">
              <div class="detail-item">
                <div class="detail-label">Pikkus</div>
                <div class="detail-value">${drawing.totalLengthMM} mm</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Kogus</div>
                <div class="detail-value">${drawing.quantity} tk</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Punkte</div>
                <div class="detail-value">${drawing.points.length}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Värv</div>
                <div class="detail-value">
                  ${drawing.paintLabel}
                  <span class="color-preview" style="background-color: ${drawing.paintColor};"></span>
                </div>
              </div>
            </div>
            
            <div class="drawing-svg">
              ${generateDrawingSVG(drawing)}
            </div>
            
            ${drawing.decorations.length > 0 ? `
              <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px;">
                <strong>Dekoratsioonid:</strong>
                ${drawing.decorations.map(d => 
                  `<span style="margin-left: 10px; font-size: 12px;">
                    ${d.pos === 'start' ? 'Algus' : 'Lõpp'}: ${d.kind} (${d.sizeMM}mm)
                  </span>`
                ).join(', ')}
              </div>
            ` : ''}
            
            ${drawing.notes ? `
              <div style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 5px;">
                <strong>Märkused:</strong> ${drawing.notes}
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}

      <div class="footer">
        <p>Genereeritud: ${new Date().toLocaleString('et-EE')} | ${clientName}</p>
        <p style="margin-top: 10px;">Powered by Plekk Portal © 2025</p>
      </div>

      <script>
        window.onload = function() {
          setTimeout(() => {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
