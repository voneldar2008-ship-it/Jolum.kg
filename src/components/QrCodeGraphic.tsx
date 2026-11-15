import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface QrCodeGraphicProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}

/**
 * Renders a crisp, synchronous vector SVG QR code with a standard 4-module quiet zone.
 */
export const QrCodeGraphic: React.FC<QrCodeGraphicProps> = ({
  value,
  size = 200,
  className = '',
  label,
}) => {
  const { moduleCount, pathData } = useMemo(() => {
    const qr = QRCode.create(value || 'https://example.com', {
      errorCorrectionLevel: 'M',
    });
    const count = qr.modules.size;
    const parts: string[] = [];

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.modules.get(row, col)) {
          parts.push(`M${col},${row}h1v1h-1z`);
        }
      }
    }

    return {
      moduleCount: count,
      pathData: parts.join(''),
    };
  }, [value]);

  const quietZone = 3;
  const totalSize = moduleCount + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-${quietZone} -${quietZone} ${totalSize} ${totalSize}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label || `QR-код: ${value}`}
      className={`bg-white select-none ${className}`}
    >
      <rect
        x={-quietZone}
        y={-quietZone}
        width={totalSize}
        height={totalSize}
        fill="#ffffff"
      />
      <path d={pathData} fill="#0f172a" />
    </svg>
  );
};

/**
 * Generates a print-ready high-resolution PNG data URL (1024x1180) with clean framing and instruction.
 */
export async function generatePrintableQrPng(
  url: string,
  title: string,
  instruction: string,
  footerText = 'г. Манас · Общественный транспорт'
): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 880,
    margin: 3,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrDataUrl;

  // White poster background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle top brand bar
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, canvas.width, 18);

  // Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 48px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 96);

  // Subtitle / instruction
  ctx.fillStyle = '#475569';
  ctx.font = '600 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(instruction, canvas.width / 2, 146);

  // Draw crisp QR bitmap centered
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to render QR image'));
    img.src = qrDataUrl;
  });

  ctx.drawImage(img, 72, 180, 880, 880);

  // URL footer
  ctx.fillStyle = '#0284c7';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  const truncatedUrl = url.length > 56 ? `${url.slice(0, 53)}...` : url;
  ctx.fillText(truncatedUrl, canvas.width / 2, 1110);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(footerText, canvas.width / 2, 1152);

  return canvas.toDataURL('image/png');
}
