import type { LookId } from '../types'
import { lookOf } from './looks'
import { HEADER_CROP, sceneInner } from './scenes'

// Pictures that sit under the widget's tiles: square, so they always cover a
// tile of any width, with what matters in the top part that a short tile
// shows. The tile clips them to its rounded shape.

const square = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="4000" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMin slice">${inner}</svg>`

const radial = (id: string, color: string, opacity: number, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/>` +
  `<stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

/** The header tile's picture: the look's gradient with floating bubbles, or its scene, moving. */
export const heroArt = (id: LookId): string => {
  const look = lookOf(id)
  const hero = look.hero

  if (hero.kind === 'gradient') {
    const [a, m, z] = hero.stops

    return square(
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2=".55"><stop offset="0" stop-color="${a}"/>` +
        `<stop offset=".55" stop-color="${m}"/><stop offset="1" stop-color="${z}"/></linearGradient>` +
        `${radial('w', hero.glow, 0.8)}${radial('d', z, 0.9)}</defs>` +
        `<style>.f1{animation:fa 9s ease-in-out infinite alternate}.f2{animation:fa 12s ease-in-out -4s infinite alternate}` +
        `.f3{animation:fb 10s ease-in-out -2s infinite alternate}.dr{animation:fc 18s ease-in-out infinite alternate}` +
        `@keyframes fa{from{transform:translateY(0)}to{transform:translateY(-26px)}}` +
        `@keyframes fb{from{transform:translate(0,0)}to{transform:translate(-22px,18px)}}` +
        `@keyframes fc{from{transform:translate(0,0)}to{transform:translate(60px,30px)}}` +
        `@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>` +
        `<rect width="1000" height="1000" fill="url(#g)"/>` +
        `<circle class="dr" cx="160" cy="20" r="520" fill="url(#w)"/><circle cx="1000" cy="420" r="460" fill="url(#d)"/>` +
        `<circle class="f1" cx="860" cy="110" r="130" fill="#fff" fill-opacity=".16"/><circle class="f2" cx="730" cy="40" r="56" fill="#fff" fill-opacity=".2"/>` +
        `<circle class="f3" cx="940" cy="300" r="34" fill="#fff" fill-opacity=".22"/>`,
    )
  }
  const [cx, cy, cw] = HEADER_CROP[id] ?? [0, 0, 1600]

  return square(
    `<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="sc" stop-opacity=".78"/>` +
      `<stop offset=".7" class="sc" stop-opacity="0"/></linearGradient></defs>` +
      `<style>.sc{stop-color:${hero.scrim.light}}.bg{fill:${hero.scrim.light}}` +
      `@media (prefers-color-scheme: dark){.sc{stop-color:${hero.scrim.dark}}.bg{fill:${hero.scrim.dark}}}</style>` +
      `<rect class="bg" width="1000" height="1000"/>` +
      `<svg x="0" y="0" width="1000" height="1000" viewBox="${cx} ${cy} ${cw} ${cw}" preserveAspectRatio="xMidYMin meet">${sceneInner(id, 'h', false)}</svg>` +
      `<rect width="1000" height="1000" fill="url(#s)"/>`,
  )
}

/** Wide art for short tiles: 10 by 7, so a tile at least that wide is always covered. */
const wide = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="2800" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMin slice">${inner}</svg>`

/**
 * A tile's glass: the look's own surface, a soft light from one corner, the
 * accent's glow from another, in the light or dark the system shows.
 */
export const glassArt = (id: LookId, variant: number, shape: 'wide' | 'square' = 'wide'): string => {
  const look = lookOf(id)
  const L = look.paint.light
  const D = look.paint.dark
  const h = shape === 'wide' ? 700 : 1000
  const corners = [
    [930, 40, 60, h - 40],
    [70, 40, 940, h - 60],
    [960, h - 60, 80, 60],
  ] as const
  const [ax, ay, bx, by] = corners[variant % corners.length] ?? corners[0]
  const dots =
    shape === 'square'
      ? `<pattern id="d" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="2.2" fill="${look.accent}" fill-opacity=".16"/></pattern>` +
        `<rect width="1000" height="${h}" fill="url(#d)"/>`
      : ''
  const inner =
    `<defs>${radial('a', look.accent, 0.55)}${radial('b', look.accent2, 0.4)}` +
    `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/>` +
    `<stop offset=".45" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>` +
    `<style>.t{fill:${L.tile}}.g{opacity:.55}.s{opacity:.9}` +
    `@media (prefers-color-scheme: dark){.t{fill:${D.tile}}.g{opacity:.7}.s{opacity:.1}}</style>` +
    `<rect class="t" width="1000" height="${h}"/>` +
    `<g class="g"><circle cx="${ax}" cy="${ay}" r="${Math.round(h * 0.75)}" fill="url(#a)"/>` +
    `<circle cx="${bx}" cy="${by}" r="${Math.round(h * 0.55)}" fill="url(#b)"/></g>` +
    dots +
    `<rect class="s" width="1000" height="${h}" fill="url(#s)"/>`

  return shape === 'wide' ? wide(inner) : square(inner)
}

/** The lit prompt tile: the look's vivid gradient, gloss, and rings in a corner. */
export const litArt = (id: LookId): string => {
  const f = lookOf(id).feature

  return wide(
    `<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2=".7"><stop offset="0" stop-color="${f.from}"/><stop offset="1" stop-color="${f.to}"/></linearGradient>` +
      `${radial('l', '#ffffff', 0.55)}${radial('k', f.to, 0.9)}</defs>` +
      `<rect width="1000" height="700" fill="url(#f)"/><circle cx="1000" cy="700" r="520" fill="url(#k)"/>` +
      `<circle cx="80" cy="-40" r="560" fill="url(#l)"/>` +
      `<g fill="none" stroke="#ffffff"><circle cx="900" cy="560" r="150" stroke-opacity=".28" stroke-width="5"/>` +
      `<circle cx="900" cy="560" r="250" stroke-opacity=".18" stroke-width="5"/><circle cx="900" cy="560" r="350" stroke-opacity=".1" stroke-width="5"/></g>` +
      `<path d="M770 120l14 34 34 14-34 14-14 34-14-34-34-14 34-14z" fill="#ffffff" fill-opacity=".7"/>`,
  )
}

/** A theme's thumbnail in the gallery. */
export const thumbArt = (id: LookId): string => {
  const look = lookOf(id)
  const hero = look.hero

  if (hero.kind === 'gradient') {
    const [a, m, z] = hero.stops
    const p = look.paint.light

    return square(
      `<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${m}"/>` +
        `<stop offset="1" stop-color="${z}"/></linearGradient>${radial('w', '#ffffff', 0.55, 0.2, 0, 0.8)}</defs>` +
        `<rect width="1000" height="1000" fill="url(#t)"/><rect width="1000" height="1000" fill="url(#w)"/>` +
        `<rect x="140" y="380" width="720" height="560" rx="70" fill="${p.tile}"/>` +
        `<rect x="230" y="480" width="380" height="44" rx="22" fill="${p.ink}" fill-opacity=".8"/>` +
        `<rect x="230" y="570" width="260" height="34" rx="17" fill="${p.muted}" fill-opacity=".6"/>`,
    )
  }

  return square(
    `<svg x="0" y="0" width="1000" height="1000" viewBox="300 0 1000 1000" preserveAspectRatio="xMidYMid slice">${sceneInner(id, 't', true)}</svg>`,
  )
}
