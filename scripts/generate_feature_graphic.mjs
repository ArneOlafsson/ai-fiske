import sharp from 'sharp';

async function createFeatureGraphic() {
  const width = 1024;
  const height = 500;
  
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#081724" />
          <stop offset="50%" stop-color="#0F2B42" />
          <stop offset="100%" stop-color="#081724" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#081724" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="100%" stop-color="#38BDF8" />
        </linearGradient>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#bg)" />
      <circle cx="512" cy="230" r="350" fill="url(#glow)" />
      
      <path d="M 0 380 Q 256 360, 512 380 T 1024 380 L 1024 500 L 0 500 Z" fill="#05101A" opacity="0.6" />
      <path d="M 0 420 Q 256 400, 512 420 T 1024 420 L 1024 500 L 0 500 Z" fill="#030910" opacity="0.8" />

      <g transform="translate(512, 105)">
        <rect x="-110" y="-16" width="220" height="32" rx="16" fill="#1E3A54" stroke="#38BDF8" stroke-width="1.5" />
        <text x="0" y="5" text-anchor="middle" fill="#38BDF8" font-family="sans-serif" font-size="13" font-weight="bold" letter-spacing="2">SVERIGES FISKEAPP</text>
      </g>

      <text x="512" y="215" text-anchor="middle" fill="url(#textGrad)" font-family="sans-serif" font-size="56" font-weight="900" letter-spacing="1">Bertlids Fiskeapp</text>

      <text x="512" y="275" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="22" font-weight="500" letter-spacing="0.5">Artbestamning med AI - Fangstdagbok - Fiskevader</text>

      <g transform="translate(512, 340)">
        <g transform="translate(-240, 0)">
          <rect x="-95" y="-18" width="190" height="36" rx="10" fill="#13283B" stroke="#334155" stroke-width="1" />
          <text x="0" y="5" text-anchor="middle" fill="#E2E8F0" font-family="sans-serif" font-size="14" font-weight="600">AI-Fiskidentifiering</text>
        </g>
        <g transform="translate(0, 0)">
          <rect x="-95" y="-18" width="190" height="36" rx="10" fill="#13283B" stroke="#334155" stroke-width="1" />
          <text x="0" y="5" text-anchor="middle" fill="#E2E8F0" font-family="sans-serif" font-size="14" font-weight="600">Dolda vikar &amp; Tips</text>
        </g>
        <g transform="translate(240, 0)">
          <rect x="-95" y="-18" width="190" height="36" rx="10" fill="#13283B" stroke="#334155" stroke-width="1" />
          <text x="0" y="5" text-anchor="middle" fill="#E2E8F0" font-family="sans-serif" font-size="14" font-weight="600">Smart Huggprognos</text>
        </g>
      </g>
    </svg>
  `);

  const outPath = 'c:/Users/ArneOlafsson/Antigravity2/fiskeappen-2027/assets/images/google-play-feature-graphic-1024x500.png';
  await sharp(svgOverlay)
    .png()
    .toFile(outPath);

  console.log('Successfully created Feature Graphic at:', outPath);
}

createFeatureGraphic().catch(console.error);
