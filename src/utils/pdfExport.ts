import { SheetDrawing } from '../types';

// 📄 B) PDF Export - Simple version without external libraries
export function exportDrawingsToPDF(drawings: SheetDrawing[], clientName: string) {
  if (drawings.length === 0) {
    alert('Pole jooniseid eksportimiseks!');
    return;
  }

  // Create a printable HTML page
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
