import type { LookId } from '../types'

// The pictures behind each look, drawn in a 1600×1000 box. The full drawing
// fills the app's background and the widget's header and moves slowly; the
// lite one (fewer parts, nothing moving) fills the gallery's thumbnails.
// Every id and class carries a prefix, since several share one document.
// Motion is ambient: long loops, nothing that flashes, and every moving part
// rests in a finished place when motion is reduced.

const round = (n: number) => Math.round(n * 10) / 10

const seeded = (seed: number) => {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Draw = (p: string, lite: boolean) => string

const REDUCE = '@media (prefers-reduced-motion: reduce){*{animation:none!important}}'

const radial = (id: string, color: string, opacity: number) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/>` +
  `<stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

const stars = (rand: () => number, count: number, top: number, cls: (i: number) => string, left = 0, width = 1600) => {
  let out = ''

  for (let i = 0; i < count; i += 1) {
    const r = round(0.6 + rand() * rand() * 2.2)
    out += `<circle class="${cls(i)}" cx="${Math.round(left + rand() * width)}" cy="${Math.round(rand() * top)}" r="${r}" opacity="${round(0.35 + rand() * 0.65)}"/>`
  }

  return out
}

const twinkle = (p: string, lite: boolean) =>
  lite
    ? ''
    : `.${p}-t1{animation:${p}tw 7s ease-in-out infinite alternate}` +
      `.${p}-t2{animation:${p}tw 9s ease-in-out -3s infinite alternate}` +
      `.${p}-t3{animation:${p}tw 11s ease-in-out -6s infinite alternate}` +
      `@keyframes ${p}tw{from{opacity:.2}to{opacity:1}}`

const starClass = (p: string) => (i: number) => (i % 5 === 0 ? `${p}-t${(i % 3) + 1}` : `${p}-st`)

type Blob = { cx: number; cy: number; r: number; color: string; opacity: number }

/** Soft glows on a pale or dark ground, drifting. */
const glow =
  (light: string, dark: string, darkOpacity: number, blobs: Blob[]): Draw =>
  (p, lite) => {
    const drift = [
      [90, 50],
      [-80, 60],
      [70, -70],
      [-90, -40],
    ] as const
    const motion = lite
      ? ''
      : blobs
          .map((_, i) => {
            const [dx, dy] = drift[i % 4] ?? [60, 40]

            return (
              `.${p}-m${i}{transform-box:fill-box;transform-origin:center;animation:${p}m${i} ${21 + i * 6}s ease-in-out infinite alternate}` +
              `@keyframes ${p}m${i}{from{transform:translate(0,0) scale(1)}to{transform:translate(${dx}px,${dy}px) scale(1.14)}}`
            )
          })
          .join('')

    // Floating panes of glass and a few sparkles, as on soft widget design.
    const panes = [
      { x: 1150, y: 110, size: 270, turn: -9 },
      { x: 190, y: 600, size: 210, turn: 11 },
      { x: 720, y: -70, size: 160, turn: 5 },
      { x: 1320, y: 640, size: 120, turn: -14 },
    ]
    const sparkles = [
      [420, 180, 1.2],
      [980, 300, 0.8],
      [1480, 470, 1],
      [300, 880, 0.9],
      [860, 780, 1.3],
      [1180, 900, 0.7],
    ] as const
    const glassMotion = lite
      ? ''
      : panes
          .map(
            (_, i) =>
              `.${p}-q${i}{transform-box:fill-box;transform-origin:center;animation:${p}q${i} ${13 + i * 3}s ease-in-out -${i * 2}s infinite alternate}` +
              `@keyframes ${p}q${i}{from{transform:translateY(0) rotate(0deg)}to{transform:translateY(${i % 2 === 0 ? -26 : 22}px) rotate(${i % 2 === 0 ? 4 : -5}deg)}}`,
          )
          .join('') +
        sparkles.map((_, i) => `.${p}-k${i}{animation:${p}tw ${5 + i}s ease-in-out -${i}s infinite alternate}`).join('') +
        `@keyframes ${p}tw{from{opacity:.15}to{opacity:.95}}`

    return (
      `<defs>${blobs.map((b, i) => radial(`${p}b${i}`, b.color, b.opacity)).join('')}` +
      `<linearGradient id="${p}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="${p}-g0"/><stop offset="1" class="${p}-g1"/></linearGradient></defs>` +
      `<style>.${p}-base{fill:${light}}.${p}-glow{opacity:1}.${p}-g0{stop-color:#fff;stop-opacity:.6}.${p}-g1{stop-color:#fff;stop-opacity:.08}` +
      `.${p}-pane{stroke:#fff;stroke-opacity:.7}.${p}-spark{fill:#fff;opacity:.9}${motion}${glassMotion}` +
      `@media (prefers-color-scheme: dark){.${p}-base{fill:${dark}}.${p}-glow{opacity:${darkOpacity}}` +
      `.${p}-g0{stop-opacity:.07}.${p}-g1{stop-opacity:0}.${p}-pane{stroke-opacity:.24}.${p}-spark{opacity:.6}}${REDUCE}</style>` +
      `<rect class="${p}-base" width="1600" height="1000"/><g class="${p}-glow">` +
      blobs.map((b, i) => `<circle class="${p}-m${i}" cx="${b.cx}" cy="${b.cy}" r="${b.r}" fill="url(#${p}b${i})"/>`).join('') +
      `</g>` +
      panes
        .map(
          (q, i) =>
            `<g class="${p}-q${i}"><rect class="${p}-pane" x="${q.x}" y="${q.y}" width="${q.size}" height="${q.size}" rx="${Math.round(q.size * 0.24)}" ` +
            `transform="rotate(${q.turn} ${q.x + q.size / 2} ${q.y + q.size / 2})" fill="url(#${p}gl)" stroke-width="2"/></g>`,
        )
        .join('') +
      sparkles
        .map(
          ([x, y, k], i) =>
            `<path class="${p}-spark ${p}-k${i}" transform="translate(${x} ${y}) scale(${k})" d="M0-16L3.5-3.5 16 0 3.5 3.5 0 16-3.5 3.5-16 0-3.5-3.5Z"/>`,
        )
        .join('')
    )
  }

// Pixel Quest: an 8-bit field, blocky hills, drifting clouds, bobbing coins.
const pixel: Draw = (p, lite) => {
  const rand = seeded(11)
  const B = 20
  const disk = (cx: number, cy: number, r: number, fill: string, rim: string) => {
    let out = ''

    for (let y = -r; y <= r; y += B) {
      for (let x = -r; x <= r; x += B) {
        const d = Math.hypot(x + B / 2, y + B / 2)

        if (d <= r) {
          out += `<rect x="${cx + x}" y="${cy + y}" width="${B}" height="${B}" fill="${d > r - B ? rim : fill}"/>`
        }
      }
    }

    return out
  }
  const cloud = (x: number, y: number) =>
    (
      [
        [2, 4],
        [1, 7],
        [0, 9],
        [1, 8],
      ] as const
    )
      .map(([from, count], r) => `<rect x="${x + from * B}" y="${y + r * B}" width="${count * B}" height="${B}"/>`)
      .join('')
  const hills = (base: number, amp: number, freq: number, phase: number, cls: string) => {
    let out = ''

    for (let x = 0; x < 1600; x += 40) {
      const top = Math.round((base - amp * Math.abs(Math.sin(x / freq + phase))) / B) * B
      out += `<rect class="${cls}" x="${x}" y="${top}" width="40" height="${880 - top}"/>`
    }

    return out
  }
  let bricks = ''

  for (let row = 0; row < 3; row += 1) {
    for (let x = row % 2 === 0 ? 0 : -40; x < 1600; x += 80) {
      bricks += `<rect class="${p}-brick" x="${x}" y="${906 + row * 32}" width="74" height="26"/>`
    }
  }
  const coin = (x: number, y: number, k: number) =>
    `<g class="${p}-bob${k}"><rect x="${x}" y="${y}" width="24" height="40" fill="#ffd23d"/>` +
    `<rect x="${x + 4}" y="${y + 6}" width="6" height="28" fill="#fff3a6"/><rect x="${x + 18}" y="${y}" width="6" height="40" fill="#e0a000"/></g>`
  const block = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="56" height="56" fill="#f2b705"/><rect x="${x}" y="${y + 50}" width="56" height="6" fill="#9a5b00"/>` +
    `<rect x="${x + 50}" y="${y}" width="6" height="56" fill="#9a5b00"/><rect x="${x + 22}" y="${y + 16}" width="12" height="24" fill="#9a5b00"/>`
  let night = ''

  for (let i = 0; i < (lite ? 16 : 40); i += 1) {
    night += `<rect class="${p}-star" x="${Math.round((rand() * 1600) / 8) * 8}" y="${Math.round((rand() * 480) / 8) * 8}" width="8" height="8"/>`
  }

  return (
    `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="${p}-s0"/><stop offset="1" class="${p}-s1"/></linearGradient></defs>` +
    `<style>.${p}-s0{stop-color:#5fb8ff}.${p}-s1{stop-color:#cdeeff}.${p}-hb{fill:#7fd07a}.${p}-hf{fill:#3fa34d}` +
    `.${p}-grass{fill:#44c35a}.${p}-dirt{fill:#c8742c}.${p}-brick{fill:#a85a22}.${p}-cloud{fill:#fff}` +
    `.${p}-sun{display:inline}.${p}-moon{display:none}.${p}-star{display:none;fill:#fff}` +
    (lite
      ? ''
      : `.${p}-drift{animation:${p}dr 48s linear infinite alternate}@keyframes ${p}dr{from{transform:translateX(0)}to{transform:translateX(220px)}}` +
        [0, 1, 2]
          .map(k => `.${p}-bob${k}{animation:${p}bob 2.6s ease-in-out -${k * 0.8}s infinite alternate}`)
          .join('') +
        `@keyframes ${p}bob{from{transform:translateY(0)}to{transform:translateY(-16px)}}`) +
    `@media (prefers-color-scheme: dark){.${p}-s0{stop-color:#070b26}.${p}-s1{stop-color:#2a3373}.${p}-hb{fill:#1f4d52}.${p}-hf{fill:#173b3a}` +
    `.${p}-grass{fill:#1f7a45}.${p}-dirt{fill:#5b3a26}.${p}-brick{fill:#43291a}.${p}-cloud{fill:#3b467f}` +
    `.${p}-sun{display:none}.${p}-moon{display:inline}.${p}-star{display:inline}}${REDUCE}</style>` +
    `<g shape-rendering="crispEdges"><rect width="1600" height="1000" fill="url(#${p}sky)"/>${night}` +
    `<g class="${p}-sun">${disk(1320, 160, 80, '#ffd23d', '#ffad00')}</g>` +
    `<g class="${p}-moon">${disk(1320, 160, 70, '#f4f1d0', '#d8d3a8')}<rect x="1300" y="140" width="20" height="20" fill="#d8d3a8"/></g>` +
    `<g class="${p}-cloud ${p}-drift">${cloud(120, 120)}${cloud(640, 210)}${lite ? '' : cloud(1000, 70)}</g>` +
    hills(700, 170, 190, 0.4, `${p}-hb`) +
    hills(800, 120, 140, 1.7, `${p}-hf`) +
    block(320, 560) +
    block(376, 560) +
    block(432, 560) +
    coin(900, 640, 0) +
    coin(960, 600, 1) +
    coin(1020, 640, 2) +
    `<rect class="${p}-grass" y="880" width="1600" height="24"/><rect class="${p}-dirt" y="904" width="1600" height="96"/>${bricks}</g>`
  )
}

// Mainframe: green glyph rain on black, falling slowly, with faint scanlines.
const mainframe: Draw = (p, lite) => {
  const rand = seeded(23)
  const count = lite ? 14 : 46
  let rain = ''

  for (let i = 0; i < count; i += 1) {
    const x = Math.round((i + rand() * 0.6) * (1600 / count))
    const length = lite ? 5 + Math.floor(rand() * 6) : 8 + Math.floor(rand() * 14)
    const speed = i % 4
    const start = lite ? Math.round(rand() * 700 - 200) : 0
    let column = ''

    for (let j = 0; j < length; j += 1) {
      const isHead = j === length - 1
      const width = 8 + Math.round(rand() * 8)
      column +=
        `<rect x="${x + (16 - width) / 2}" y="${j * 28}" width="${width}" height="16" rx="2" ` +
        `fill="${isHead ? '#d4ffe6' : '#29f19a'}" opacity="${round(isHead ? 1 : 0.12 + (0.7 * (j + 1)) / length)}"/>`

      if (!isHead && rand() < 0.35) {
        column += `<rect x="${x + 2}" y="${j * 28 + 7}" width="12" height="2" fill="#010403" opacity=".8"/>`
      }
    }
    rain += lite
      ? `<g transform="translate(0 ${start})">${column}</g>`
      : `<g class="${p}-f${speed} ${p}-d${i % 5}">${column}</g>`
  }
  const motion = lite
    ? ''
    : [34, 43, 55, 68].map((s, k) => `.${p}-f${k}{animation:${p}fall ${s}s linear infinite}`).join('') +
      [0, 1, 2, 3, 4].map(k => `.${p}-d${k}{animation-delay:-${k * 9 + 3}s}`).join('') +
      `@keyframes ${p}fall{from{transform:translateY(-720px)}to{transform:translateY(1080px)}}`

  return (
    `<defs>${radial(`${p}vig`, '#0b3a22', 0.55)}<pattern id="${p}scan" width="4" height="4" patternUnits="userSpaceOnUse">` +
    `<rect width="4" height="1" fill="#000"/></pattern></defs><style>${motion}${REDUCE}</style>` +
    `<rect width="1600" height="1000" fill="#010403"/><circle cx="800" cy="500" r="900" fill="url(#${p}vig)"/>` +
    rain +
    `<rect width="1600" height="1000" fill="url(#${p}scan)" opacity=".35"/>`
  )
}

// Lo-fi Dusk: layered ridges under a soft sun, a blossom branch, drifting petals.
const dusk: Draw = (p, lite) => {
  const rand = seeded(31)
  let petals = ''

  if (!lite) {
    for (let i = 0; i < 16; i += 1) {
      petals +=
        `<g transform="translate(${Math.round(200 + rand() * 1500)} -40)"><ellipse class="${p}-petal ${p}-p${i % 4}" ` +
        `rx="9" ry="5" cx="0" cy="0"/></g>`
    }
  }
  const blossoms = [
    [150, 120],
    [230, 100],
    [300, 150],
    [380, 140],
    [455, 175],
    [520, 200],
    [610, 190],
    [250, 60],
    [420, 210],
    [680, 170],
  ]
    .slice(0, lite ? 6 : 10)
    .map(
      ([x, y], i) =>
        `<circle class="${p}-ba" cx="${x}" cy="${y}" r="${i % 3 === 0 ? 20 : 15}"/><circle class="${p}-bb" cx="${x}" cy="${y}" r="5"/>`,
    )
    .join('')
  const motion = lite
    ? ''
    : `.${p}-petal{transform-box:fill-box;transform-origin:center}` +
      [26, 31, 37, 44].map((s, k) => `.${p}-p${k}{animation:${p}fall ${s}s linear -${k * 7 + 2}s infinite}`).join('') +
      `@keyframes ${p}fall{from{transform:translate(0,0) rotate(0deg)}to{transform:translate(-320px,1100px) rotate(540deg)}}` +
      `.${p}-glow{transform-box:fill-box;transform-origin:center;animation:${p}breathe 9s ease-in-out infinite alternate}` +
      `@keyframes ${p}breathe{from{transform:scale(.94);opacity:.8}to{transform:scale(1.06);opacity:1}}`

  return (
    `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="${p}-s0"/>` +
    `<stop offset=".6" class="${p}-s1"/><stop offset="1" class="${p}-s2"/></linearGradient>${radial(`${p}gl`, '#fff1d6', 0.9)}` +
    `<mask id="${p}cres"><rect width="1600" height="1000" fill="#fff"/><circle cx="1272" cy="214" r="62" fill="#000"/></mask></defs>` +
    `<style>.${p}-s0{stop-color:#ffc4b4}.${p}-s1{stop-color:#ffb3c7}.${p}-s2{stop-color:#ffe0c2}` +
    `.${p}-far{fill:#f2a0b6}.${p}-mid{fill:#d97898}.${p}-near{fill:#a9516f}.${p}-br{stroke:#6b3a4c}` +
    `.${p}-ba{fill:#ffd9e3}.${p}-bb{fill:#ff8fb0}.${p}-petal{fill:#ffb3c8}.${p}-sun{display:inline}.${p}-moon{display:none}` +
    `.${p}-st,.${p}-t1,.${p}-t2,.${p}-t3{fill:#fff;display:none}${twinkle(p, lite)}${motion}` +
    `@media (prefers-color-scheme: dark){.${p}-s0{stop-color:#0c0a20}.${p}-s1{stop-color:#2a1d4e}.${p}-s2{stop-color:#5a3266}` +
    `.${p}-far{fill:#3a2a62}.${p}-mid{fill:#2b1f4f}.${p}-near{fill:#1a1334}.${p}-br{stroke:#120d22}` +
    `.${p}-ba{fill:#b5839f}.${p}-bb{fill:#7f4f74}.${p}-petal{fill:#c99ab6}.${p}-sun{display:none}.${p}-moon{display:inline}` +
    `.${p}-st,.${p}-t1,.${p}-t2,.${p}-t3{display:inline}}${REDUCE}</style>` +
    `<rect width="1600" height="1000" fill="url(#${p}sky)"/>` +
    stars(rand, lite ? 24 : 70, 520, starClass(p)) +
    `<g class="${p}-sun"><circle class="${p}-glow" cx="1180" cy="600" r="320" fill="url(#${p}gl)"/><circle cx="1180" cy="600" r="138" fill="#fff4e2"/></g>` +
    `<g class="${p}-moon"><circle cx="1240" cy="230" r="66" fill="#f6efff" mask="url(#${p}cres)"/></g>` +
    `<path class="${p}-far" d="M0 690C190 610 360 650 540 612S880 560 1080 620 1440 596 1600 640V1000H0Z"/>` +
    `<path class="${p}-mid" d="M0 790C220 720 420 760 640 720S1000 690 1200 750 1480 730 1600 760V1000H0Z"/>` +
    `<path class="${p}-near" d="M0 880C260 830 520 870 760 840S1180 810 1380 860 1540 850 1600 870V1000H0Z"/>` +
    `<g class="${p}-br" fill="none" stroke-linecap="round"><path d="M-30 110C120 140 250 92 410 158S620 214 720 186" stroke-width="18"/>` +
    `<path d="M240 112C280 70 300 50 330 40M470 178C500 220 520 240 560 252" stroke-width="8"/></g>` +
    blossoms +
    petals
  )
}

// Deep Space: drifting starfield in two depths, a ringed planet, now and then a shooting star.
const space: Draw = (p, lite) => {
  const rand = seeded(43)
  let flares = ''

  for (let i = 0; i < (lite ? 3 : 7); i += 1) {
    const x = Math.round(rand() * 1600)
    const y = Math.round(rand() * 700)
    flares += `<path d="M${x - 14} ${y}H${x + 14}M${x} ${y - 14}V${y + 14}" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="2.4" fill="#fff"/>`
  }
  const motion = lite
    ? ''
    : `.${p}-l1{animation:${p}dr 150s linear infinite alternate}.${p}-l2{animation:${p}dr2 95s linear infinite alternate}` +
      `@keyframes ${p}dr{from{transform:translateX(0)}to{transform:translateX(-70px)}}` +
      `@keyframes ${p}dr2{from{transform:translateX(0)}to{transform:translateX(-150px)}}` +
      `.${p}-shoot{opacity:0;animation:${p}sh 13s ease-in infinite}` +
      `@keyframes ${p}sh{0%,86%{transform:translate(0,0);opacity:0}88%{opacity:1}97%{transform:translate(620px,230px);opacity:0}100%{opacity:0}}` +
      `.${p}-ring{animation:${p}sheen 7s ease-in-out infinite alternate}@keyframes ${p}sheen{from{stroke-opacity:.6}to{stroke-opacity:.95}}`

  return (
    `<defs><radialGradient id="${p}bg" cx=".6" cy=".4" r=".9"><stop offset="0" stop-color="#121a4a"/><stop offset="1" stop-color="#03040a"/></radialGradient>` +
    radial(`${p}n1`, '#20d3c2', 0.22) +
    radial(`${p}n2`, '#c03cff', 0.22) +
    radial(`${p}n3`, '#3d6bff', 0.2) +
    `<radialGradient id="${p}pl" cx=".32" cy=".3" r=".8"><stop offset="0" stop-color="#ffd7a1"/><stop offset=".5" stop-color="#e0607e"/><stop offset="1" stop-color="#2b1145"/></radialGradient>` +
    `<radialGradient id="${p}mo" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f0f0f6"/><stop offset="1" stop-color="#5d6079"/></radialGradient>` +
    `<linearGradient id="${p}tail" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="${p}front"><rect x="900" y="800" width="900" height="320" transform="rotate(-16 1320 800)"/></clipPath></defs>` +
    `<style>.${p}-st,.${p}-t1,.${p}-t2,.${p}-t3{fill:#e8eeff}${twinkle(p, lite)}${motion}${REDUCE}</style>` +
    `<rect width="1600" height="1000" fill="url(#${p}bg)"/>` +
    `<circle cx="300" cy="320" r="560" fill="url(#${p}n1)"/><circle cx="1260" cy="640" r="640" fill="url(#${p}n2)"/>` +
    `<circle cx="900" cy="120" r="480" fill="url(#${p}n3)"/>` +
    `<g class="${p}-l1">${stars(rand, lite ? 40 : 140, 1000, starClass(p), -80, 1800)}</g>` +
    `<g class="${p}-l2">${stars(rand, lite ? 30 : 90, 1000, starClass(p), -160, 1900)}${flares}</g>` +
    (lite
      ? ''
      : `<g class="${p}-shoot"><path d="M280 110L420 160" stroke="url(#${p}tail)" stroke-width="2.6" stroke-linecap="round"/></g>`) +
    `<ellipse cx="1320" cy="800" rx="330" ry="70" transform="rotate(-16 1320 800)" fill="none" stroke="#ffd9b0" stroke-opacity=".35" stroke-width="12"/>` +
    `<circle cx="1320" cy="800" r="172" fill="url(#${p}pl)"/>` +
    `<ellipse class="${p}-ring" cx="1320" cy="800" rx="330" ry="70" transform="rotate(-16 1320 800)" fill="none" stroke="#ffe3c4" stroke-opacity=".85" stroke-width="12" clip-path="url(#${p}front)"/>` +
    `<circle cx="250" cy="200" r="44" fill="url(#${p}mo)"/>`
  )
}

// Glacier: blue glass tiles that float, with a slow sweep of light across them.
const glacier: Draw = (p, lite) => {
  let rows = ''

  for (let row = 0; row < 4; row += 1) {
    let tiles = ''

    for (let col = 0; col < 6; col += 1) {
      tiles += `<rect x="${col * 290 - 60 + (row % 2) * 40}" y="${row * 290 - 70}" width="262" height="262" rx="38"/>`
    }
    rows += `<g class="${p}-r${row}">${tiles}</g>`
  }
  const motion = lite
    ? ''
    : [11, 13, 12, 14].map((s, k) => `.${p}-r${k}{animation:${p}fl ${s}s ease-in-out -${k * 3}s infinite alternate}`).join('') +
      `@keyframes ${p}fl{from{transform:translateY(0)}to{transform:translateY(-18px)}}` +
      `.${p}-sweep{animation:${p}sw 17s linear infinite}@keyframes ${p}sw{from{transform:translateX(-700px)}to{transform:translateX(2300px)}}`

  return (
    `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="${p}-s0"/><stop offset="1" class="${p}-s1"/></linearGradient>` +
    `<linearGradient id="${p}band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset=".5" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
    `<style>.${p}-s0{stop-color:#b9d2ff}.${p}-s1{stop-color:#6f9ef7}.${p}-t{fill:#fff;fill-opacity:.1;stroke:#fff;stroke-opacity:.45;stroke-width:2}` +
    `.${p}-light{opacity:1}${motion}` +
    `@media (prefers-color-scheme: dark){.${p}-s0{stop-color:#0c1628}.${p}-s1{stop-color:#11244a}.${p}-t{fill-opacity:.02;stroke-opacity:.1}.${p}-light{opacity:.3}}${REDUCE}</style>` +
    `<rect width="1600" height="1000" fill="url(#${p}sky)"/><g class="${p}-t">${rows}</g>` +
    (lite
      ? ''
      : `<g class="${p}-light" transform="rotate(18 800 500)"><rect class="${p}-sweep" x="-300" y="-400" width="460" height="1800" fill="url(#${p}band)"/></g>`)
  )
}

// Aurora: green and violet curtains of light swaying over snowy peaks.
const aurora: Draw = (p, lite) => {
  const rand = seeded(53)
  const bands = [
    { y: 110, amp: 70, top: '#7cffc4', bottom: '#1fd1ff' },
    { y: 190, amp: 55, top: '#3dffb0', bottom: '#2bb8ff' },
    { y: 60, amp: 80, top: '#b79bff', bottom: '#3dffb0' },
  ]
  const ribbon = (k: number, y0: number, amp: number) => {
    let d = `M-160 ${y0}`

    for (let x = -160; x <= 1760; x += 80) {
      d += `L${x} ${round(y0 + amp * Math.sin(x / 190 + k * 1.7) + 26 * Math.sin(x / 57 + k))}`
    }

    for (let x = 1760; x >= -160; x -= 80) {
      d += `L${x} ${round(y0 + 430 + amp * 0.5 * Math.sin(x / 230 + k))}`
    }

    // The curtain's colour, then its rays: fine vertical streaks that sway with it.
    return (
      `<g class="${p}-a ${p}-a${k}"><path d="${d}Z" fill="url(#${p}g${k})"/>` +
      `<path d="${d}Z" fill="url(#${p}rays)" mask="url(#${p}fade${k})"/></g>`
    )
  }
  const motion = lite
    ? ''
    : `.${p}-a{transform-box:fill-box;transform-origin:50% 100%}` +
      [19, 25, 31]
        .map(
          (s, k) =>
            `.${p}-a${k}{animation:${p}s${k} ${s}s ease-in-out -${k * 5}s infinite alternate}` +
            `@keyframes ${p}s${k}{from{transform:translateX(${k % 2 === 0 ? -80 : 70}px) skewX(${k % 2 === 0 ? -6 : 5}deg) scaleY(.9)}` +
            `to{transform:translateX(${k % 2 === 0 ? 80 : -70}px) skewX(${k % 2 === 0 ? 6 : -5}deg) scaleY(1.1)}}`,
        )
        .join('') +
      `.${p}-glow{animation:${p}br 10s ease-in-out infinite alternate}@keyframes ${p}br{from{opacity:.6}to{opacity:1}}`

  return (
    `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#01040d"/>` +
    `<stop offset=".55" stop-color="#071a33"/><stop offset="1" stop-color="#0e2b44"/></linearGradient>` +
    bands
      .map(
        (b, k) =>
          `<linearGradient id="${p}g${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b.top}" stop-opacity="0"/>` +
          `<stop offset=".22" stop-color="${b.top}" stop-opacity=".55"/><stop offset=".6" stop-color="${b.bottom}" stop-opacity=".26"/>` +
          `<stop offset="1" stop-color="${b.bottom}" stop-opacity="0"/></linearGradient>` +
          `<mask id="${p}fade${k}"><rect x="-200" y="-200" width="2000" height="1400" fill="url(#${p}g${k})"/></mask>`,
      )
      .join('') +
    `<pattern id="${p}rays" width="17" height="60" patternUnits="userSpaceOnUse"><rect width="2" height="60" fill="#ffffff" opacity=".55"/>` +
    `<rect x="7" width="1" height="60" fill="#ffffff" opacity=".35"/></pattern>` +
    `</defs><style>.${p}-st,.${p}-t1,.${p}-t2,.${p}-t3{fill:#eafffb}${twinkle(p, lite)}${motion}${REDUCE}</style>` +
    `<rect width="1600" height="1000" fill="url(#${p}sky)"/>` +
    stars(rand, lite ? 40 : 130, 640, starClass(p)) +
    `<g class="${p}-glow">${bands.map((b, k) => ribbon(k, b.y, b.amp)).join('')}</g>` +
    `<path d="M0 760L150 650L260 700L420 560L560 690L700 620L860 720L1010 590L1160 700L1300 610L1450 690L1600 640V1000H0Z" fill="#0a1a2e" stroke="#9fd8e6" stroke-opacity=".35" stroke-width="2.5"/>` +
    `<path d="M0 860L190 760L330 820L520 730L700 830L880 760L1060 850L1240 770L1420 840L1600 790V1000H0Z" fill="#040b16"/>`
  )
}

// Lava Lamp: molten blobs rising, sinking and melting into each other.
const lava: Draw = (p, lite) => {
  const blobs = [
    { cx: 380, cy: 760, r: 300, color: '#ff6a1a', dx: 120, dy: -380 },
    { cx: 1180, cy: 300, r: 330, color: '#ff2e88', dx: -140, dy: 360 },
    { cx: 820, cy: 520, r: 250, color: '#ffc93c', dx: 160, dy: -260 },
    { cx: 1380, cy: 820, r: 280, color: '#c03cff', dx: -120, dy: -420 },
    { cx: 200, cy: 250, r: 230, color: '#ff3d5a', dx: 140, dy: 400 },
    { cx: 980, cy: 920, r: 210, color: '#ff9a2e', dx: -180, dy: -300 },
  ]
  const motion = lite
    ? ''
    : `.${p}-b{transform-box:fill-box;transform-origin:center}` +
      blobs
        .map(
          (b, i) =>
            `.${p}-b${i}{animation:${p}f${i} ${26 + i * 5}s ease-in-out -${i * 4}s infinite alternate}` +
            `@keyframes ${p}f${i}{from{transform:translate(0,0) scale(.88)}50%{transform:translate(${round(b.dx / 2)}px,${b.dy}px) scale(1.14)}` +
            `to{transform:translate(${b.dx}px,${round(b.dy / 3)}px) scale(.96)}}`,
        )
        .join('')

  return (
    `<defs><radialGradient id="${p}bg" cx=".5" cy=".55" r=".85"><stop offset="0" stop-color="#3a0c2a"/>` +
    `<stop offset=".6" stop-color="#1a0617"/><stop offset="1" stop-color="#0a020a"/></radialGradient>` +
    blobs
      .map(
        (b, i) =>
          `<radialGradient id="${p}c${i}"><stop offset="0" stop-color="${b.color}"/><stop offset=".55" stop-color="${b.color}" stop-opacity=".7"/>` +
          `<stop offset="1" stop-color="${b.color}" stop-opacity="0"/></radialGradient>`,
      )
      .join('') +
    `<linearGradient id="${p}sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
    `<style>.${p}-bl{mix-blend-mode:screen}${motion}${REDUCE}</style>` +
    `<rect width="1600" height="1000" fill="url(#${p}bg)"/>` +
    `<g class="${p}-bl">${blobs.map((b, i) => `<circle class="${p}-b ${p}-b${i}" cx="${b.cx}" cy="${b.cy}" r="${b.r}" fill="url(#${p}c${i})"/>`).join('')}</g>` +
    `<rect x="120" width="420" height="1000" fill="url(#${p}sheen)"/>`
  )
}

// Ocean Tide: wave layers rolling past, a sun by day and a moon by night, glints on the water.
const tide: Draw = (p, lite) => {
  const layers = [
    { y: 560, amp: 12, period: 260, s: 36, dir: -1 },
    { y: 650, amp: 18, period: 320, s: 27, dir: 1 },
    { y: 760, amp: 24, period: 380, s: 20, dir: -1 },
    { y: 880, amp: 30, period: 440, s: 15, dir: 1 },
  ]
  const wave = (k: number, y: number, amp: number, period: number) => {
    const start = -2 * period
    let d = `M${start} ${y}`

    for (let x = start; x < 1600 + 2 * period; x += period) {
      d += `Q${x + period / 4} ${y - amp} ${x + period / 2} ${y}T${x + period} ${y}`
    }

    return `<path class="${p}-w ${p}-w${k}" d="${d}V1000H${start}Z"/>`
  }
  let glints = ''

  for (let i = 0; i < (lite ? 6 : 14); i += 1) {
    const y = 560 + i * 30
    const w = 120 - i * 6
    glints += `<rect class="${p}-gl ${p}-g${i % 3}" x="${1220 - w / 2 + ((i * 37) % 40) - 20}" y="${y}" width="${w}" height="4" rx="2"/>`
  }
  const motion = lite
    ? ''
    : layers
        .map(
          (l, k) =>
            `.${p}-w${k}{animation:${p}wv${k} ${l.s}s linear infinite}@keyframes ${p}wv${k}{from{transform:translateX(0)}to{transform:translateX(${l.dir * l.period}px)}}`,
        )
        .join('') +
      [3.6, 4.4, 5.2].map((s, k) => `.${p}-g${k}{animation:${p}gl ${s}s ease-in-out -${k}s infinite alternate}`).join('') +
      `@keyframes ${p}gl{from{opacity:.15}to{opacity:.85}}`

  return (
    `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="${p}-s0"/>` +
    `<stop offset=".7" class="${p}-s1"/><stop offset="1" class="${p}-s2"/></linearGradient>${radial(`${p}halo`, '#fff4dc', 0.85)}</defs>` +
    `<style>.${p}-s0{stop-color:#8fd0ff}.${p}-s1{stop-color:#cfe9ff}.${p}-s2{stop-color:#ffe9cf}` +
    `.${p}-w0{fill:#5bb0ea}.${p}-w1{fill:#3a92da}.${p}-w2{fill:#2674c4}.${p}-w3{fill:#1a5aa3}.${p}-w{stroke:#fff;stroke-opacity:.35;stroke-width:2}` +
    `.${p}-gl{fill:#fff7e0}.${p}-sun{display:inline}.${p}-moon{display:none}${motion}` +
    `@media (prefers-color-scheme: dark){.${p}-s0{stop-color:#030818}.${p}-s1{stop-color:#0c1838}.${p}-s2{stop-color:#22305a}` +
    `.${p}-w0{fill:#12305f}.${p}-w1{fill:#0d2650}.${p}-w2{fill:#0a1d40}.${p}-w3{fill:#071531}.${p}-w{stroke-opacity:.12}` +
    `.${p}-gl{fill:#dfe6ff}.${p}-sun{display:none}.${p}-moon{display:inline}}${REDUCE}</style>` +
    `<rect width="1600" height="1000" fill="url(#${p}sky)"/>` +
    `<g class="${p}-sun"><circle cx="1220" cy="470" r="300" fill="url(#${p}halo)"/><circle cx="1220" cy="480" r="88" fill="#fff3d6"/></g>` +
    `<g class="${p}-moon"><circle cx="1220" cy="300" r="200" fill="url(#${p}halo)" opacity=".35"/><circle cx="1220" cy="300" r="58" fill="#eef2ff"/></g>` +
    layers.map((l, k) => wave(k, l.y, l.amp, l.period)).join('') +
    glints
  )
}

// Neon City: a skyline at night, sky traffic gliding past, windows and signs that glow.
const city: Draw = (p, lite) => {
  const rand = seeded(67)
  const GLOW = ['#7df9ff', '#ff8ad8', '#ffd36e'] as const
  let blinkers = 0
  const layer = (ground: number, minH: number, maxH: number, fill: string, lit: number) => {
    let out = ''

    for (let x = -20; x < 1620; ) {
      const w = 50 + Math.round(rand() * 70)
      const h = minH + Math.round(rand() * (maxH - minH))
      const top = ground - h
      out += `<rect x="${x}" y="${top}" width="${w}" height="${h + 400}" fill="${fill}"/>`

      for (let wy = top + 14; wy < ground - 10; wy += 20) {
        for (let wx = x + 8; wx < x + w - 10; wx += 15) {
          if (rand() < lit) {
            const isBlink = !lite && rand() < 0.08 && blinkers < 40
            blinkers += isBlink ? 1 : 0
            out += `<rect${isBlink ? ` class="${p}-k${blinkers % 3}"` : ''} x="${wx}" y="${wy}" width="6" height="9" fill="${GLOW[Math.floor(rand() * 3)]}" opacity="${round(0.45 + rand() * 0.5)}"/>`
          }
        }
      }
      x += w + 6 + Math.round(rand() * 10)
    }

    return out
  }
  const signs = [
    [190, 700, 70, 26, '#ff3fd2'],
    [610, 742, 96, 22, '#00e5ff'],
    [1010, 690, 60, 34, '#ff3fd2'],
    [1370, 730, 84, 24, '#00e5ff'],
  ] as const
  const lanes = [
    { y: 300, dir: 1, color: '#bff9ff', s: 17 },
    { y: 348, dir: -1, color: '#ff4d7a', s: 22 },
    { y: 410, dir: 1, color: '#bff9ff', s: 26 },
    { y: 456, dir: -1, color: '#ff4d7a', s: 14 },
  ]
  let traffic = ''

  let carCss = ''

  lanes.forEach((lane, k) => {
    for (let c = 0; c < 2; c += 1) {
      const car = `${p}-c${k}${c}`
      carCss += `.${car}{animation-duration:${lane.s + c * 5}s;animation-delay:-${round(rand() * lane.s)}s}`
      const body =
        `<rect x="0" y="${lane.y}" width="44" height="5" rx="2.5" fill="${lane.color}"/>` +
        `<rect x="${lane.dir > 0 ? -90 : 44}" y="${lane.y + 1}" width="90" height="3" rx="1.5" fill="url(#${p}trail${lane.dir > 0 ? 'r' : 'l'})" opacity=".7"/>`
      traffic += lite
        ? `<g transform="translate(${Math.round(200 + rand() * 1200)} 0)">${body}</g>`
        : `<g class="${p}-v${lane.dir > 0 ? 'r' : 'l'} ${car}">${body}</g>`
    }
  })
  const motion = lite
    ? ''
    : `.${p}-vr{animation:${p}goR 18s linear infinite}.${p}-vl{animation:${p}goL 18s linear infinite}` +
      `@keyframes ${p}goR{from{transform:translateX(-220px)}to{transform:translateX(1820px)}}` +
      `@keyframes ${p}goL{from{transform:translateX(1820px)}to{transform:translateX(-220px)}}` +
      [6.5, 9, 12].map((s, k) => `.${p}-k${k}{animation:${p}blink ${s}s ease-in-out -${k * 2}s infinite alternate}`).join('') +
      `@keyframes ${p}blink{from{opacity:.15}to{opacity:.95}}` +
      `.${p}-sign{animation:${p}buzz 5s ease-in-out infinite alternate}@keyframes ${p}buzz{from{opacity:.7}to{opacity:1}}` +
      carCss

  return (
    `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05010f"/>` +
    `<stop offset=".5" stop-color="#17052e"/><stop offset=".8" stop-color="#3a0a4a"/><stop offset="1" stop-color="#5c1450"/></linearGradient>` +
    radial(`${p}moon`, '#ff3fb4', 0.38) +
    `<linearGradient id="${p}trailr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bff9ff" stop-opacity="0"/><stop offset="1" stop-color="#bff9ff"/></linearGradient>` +
    `<linearGradient id="${p}traill" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ff4d7a" stop-opacity="0"/><stop offset="1" stop-color="#ff4d7a"/></linearGradient>` +
    `<linearGradient id="${p}haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3fd2" stop-opacity="0"/><stop offset="1" stop-color="#ff3fd2" stop-opacity=".22"/></linearGradient></defs>` +
    `<style>.${p}-st,.${p}-t1,.${p}-t2,.${p}-t3{fill:#fff}${twinkle(p, lite)}${motion}${REDUCE}</style>` +
    `<rect width="1600" height="1000" fill="url(#${p}sky)"/>` +
    stars(rand, lite ? 20 : 50, 420, starClass(p)) +
    `<circle cx="1240" cy="220" r="300" fill="url(#${p}moon)"/><circle cx="1240" cy="220" r="70" fill="#ffd6f4" opacity=".9"/>` +
    traffic +
    layer(800, 200, 420, '#1a0b3a', 0.12) +
    layer(900, 220, 470, '#120728', 0.16) +
    signs
      .map(
        ([x, y, w, h, c]) =>
          `<g class="${p}-sign"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="${c}" stroke-width="10" stroke-opacity=".25"/>` +
          `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="${c}" stroke-width="3"/></g>`,
      )
      .join('') +
    layer(1000, 90, 300, '#07030f', 0.1) +
    `<rect y="760" width="1600" height="240" fill="url(#${p}haze)"/>`
  )
}

const DRAW: Record<LookId, Draw> = {
  default: glow('#f6efe8', '#17130f', 0.5, [
    { cx: 1460, cy: 80, r: 560, color: '#e8906b', opacity: 0.55 },
    { cx: 1080, cy: -80, r: 460, color: '#f3c19f', opacity: 0.7 },
    { cx: 120, cy: 1000, r: 540, color: '#d97757', opacity: 0.4 },
  ]),
  marigold: glow('#f5ecda', '#140e08', 0.5, [
    { cx: 1440, cy: 70, r: 560, color: '#ffc93c', opacity: 0.85 },
    { cx: 1080, cy: -80, r: 470, color: '#ff9f2e', opacity: 0.7 },
    { cx: 110, cy: 1010, r: 560, color: '#ffd9a0', opacity: 0.9 },
    { cx: -60, cy: 150, r: 380, color: '#ff9f2e', opacity: 0.7 },
  ]),
  peach: glow('#efeff2', '#0d0e13', 0.5, [
    { cx: 80, cy: 40, r: 560, color: '#ffb08a', opacity: 0.8 },
    { cx: 420, cy: -120, r: 380, color: '#ff8f7d', opacity: 0.55 },
    { cx: 1540, cy: 980, r: 600, color: '#7f8dff', opacity: 0.6 },
    { cx: 1180, cy: 1100, r: 420, color: '#c7bcff', opacity: 0.6 },
  ]),
  glacier,
  sage: glow('#ecefe5', '#0e120c', 0.48, [
    { cx: 1500, cy: 60, r: 560, color: '#b9d48a', opacity: 0.8 },
    { cx: 1150, cy: -90, r: 400, color: '#f1e39a', opacity: 0.75 },
    { cx: 60, cy: 1000, r: 560, color: '#9fd1b8', opacity: 0.7 },
    { cx: 420, cy: 1120, r: 360, color: '#f1e39a', opacity: 0.75 },
  ]),
  pixel,
  mainframe,
  dusk,
  space,
  aurora,
  lava,
  tide,
  city,
}

/** The drawing's inner markup for a 1600×1000 box, its ids and classes under `prefix`. */
export const sceneInner = (id: LookId, prefix: string, lite: boolean): string => DRAW[id](prefix, lite)

/** A whole background for the app: the drawing, moving where it moves. */
export const sceneSvg = (id: LookId): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">${sceneInner(id, `s${id}`, false)}</svg>`

/** Which part of the drawing the widget's header shows, as x, y and width; the header is that wide. */
export const HEADER_CROP: Partial<Record<LookId, [number, number, number]>> = {
  pixel: [0, 520, 1600],
  mainframe: [0, 160, 1600],
  dusk: [560, 420, 1040],
  space: [760, 560, 840],
  aurora: [150, 40, 1350],
  lava: [200, 160, 1200],
  tide: [250, 380, 1350],
  city: [150, 300, 1350],
  glacier: [0, 0, 1600],
}
