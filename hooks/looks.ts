import type { ThemeColors, ThemeSetArgs, ThemeStyle } from 'claude-code'

import { makeColors } from './make-colors.js'
import { sceneSvg } from './scenes'

import type { LookId } from '../types'

// Each look is two things: how the widget's bento tiles are painted, and the
// theme it sets on the whole app (colors in both modes, a picture behind the
// chat that the panels frost over, and message bubbles). `default` leaves the
// app as Claude draws it.

type Hex = `#${string}`

/** The widget's paint for one mode. */
export type Paint = {
  tile: string
  tile2: string
  ink: string
  muted: string
  line: string
  shadow: number
}

type Anchors = { 'surface-0': Hex; 'text-primary': Hex } & Partial<
  Record<'surface-1' | 'surface-2' | 'surface-3' | 'text-secondary' | 'text-muted', Hex>
>

type AppTheme = {
  roles: { accent: Hex; danger: Hex; success: Hex; warning: Hex; pro: Hex }
  light?: Anchors
  dark: Anchors
  bubble: { light?: [Hex, Hex]; dark: [Hex, Hex] }
  glass: { blur: number; opacity: number }
  style?: ThemeStyle
}

export type Look = {
  id: LookId
  label: string
  tagline: string
  font: 'sans' | 'serif' | 'mono'
  accent: string
  accent2: string
  /** The highlighted tile's gradient and the ink on it. */
  feature: { from: string; to: string; ink: string }
  /** The header tile: a gradient, or the look's picture cropped. */
  hero:
    | { kind: 'gradient'; stops: [string, string, string]; glow: string; ink: string; soft: string }
    | { kind: 'scene'; ink: { light: string; dark: string }; soft: { light: string; dark: string }; scrim: { light: string; dark: string } }
  paint: { light: Paint; dark: Paint }
  isDarkOnly: boolean
  app?: AppTheme
}

const bubbles: ThemeStyle = {
  UserMessage: { radius: 18, paddingX: 14, paddingY: 10, shadow: { x: 0, y: 2, blur: 12, color: '#0000001f' } },
  ToolUse: { radius: 12 },
}

const dark = (paint: Omit<Paint, 'shadow'>): { light: Paint; dark: Paint } => ({
  light: { ...paint, shadow: 0.45 },
  dark: { ...paint, shadow: 0.45 },
})

export const LOOKS: readonly Look[] = [
  {
    id: 'default',
    label: 'Claude',
    tagline: 'The app as it ships',
    font: 'sans',
    accent: '#d97757',
    accent2: '#5b8def',
    feature: { from: '#f2a882', to: '#d97757', ink: '#ffffff' },
    hero: { kind: 'gradient', stops: ['#f8dcc8', '#eaa582', '#d97757'], glow: '#fff4ea', ink: '#2b160c', soft: '#6e3a22' },
    paint: {
      light: { tile: '#ffffff', tile2: '#f5efe9', ink: '#1f1a16', muted: '#857a70', line: '#ece3da', shadow: 0.08 },
      dark: { tile: '#2a2522', tile2: '#342e2a', ink: '#f3ede6', muted: '#a39a91', line: '#3d3632', shadow: 0.4 },
    },
    isDarkOnly: false,
  },
  {
    id: 'marigold',
    label: 'Marigold',
    tagline: 'Warm amber glass',
    font: 'sans',
    accent: '#f08a1c',
    accent2: '#3d7be0',
    feature: { from: '#ffcf45', to: '#ff902c', ink: '#2a1a08' },
    hero: { kind: 'gradient', stops: ['#ffe066', '#ffb43c', '#ff962e'], glow: '#fff6c4', ink: '#2a1a08', soft: '#6b4512' },
    paint: {
      light: { tile: '#fffaf1', tile2: '#f8eedb', ink: '#2a1c0c', muted: '#8a7455', line: '#f0e3c8', shadow: 0.08 },
      dark: { tile: '#2a2016', tile2: '#352a1d', ink: '#f7ebd8', muted: '#b39c7c', line: '#433627', shadow: 0.4 },
    },
    isDarkOnly: false,
    app: {
      roles: { accent: '#d9731a', danger: '#c2412d', success: '#4f8a3c', warning: '#c98a0b', pro: '#8a5a9e' },
      light: {
        'surface-0': '#f3ead9',
        'surface-1': '#f8f1e4',
        'surface-2': '#fcf7ee',
        'text-primary': '#2a1c0c',
        'text-secondary': '#5b4429',
        'text-muted': '#725b3c',
      },
      dark: {
        'surface-0': '#1b140c',
        'surface-1': '#221a11',
        'surface-2': '#291f15',
        'surface-3': '#2e2318',
        'text-primary': '#f7ebd8',
        'text-secondary': '#dcc8ab',
        'text-muted': '#b39c7c',
      },
      bubble: { light: ['#fde4b8', '#2a1c0c'], dark: ['#3a2914', '#f7ebd8'] },
      glass: { blur: 28, opacity: 0.7 },
      style: bubbles,
    },
  },
  {
    id: 'peach',
    label: 'Peach Haze',
    tagline: 'Milky white, peach and periwinkle',
    font: 'sans',
    accent: '#5b6cf0',
    accent2: '#ff8a6b',
    feature: { from: '#ffad8c', to: '#7d89ff', ink: '#ffffff' },
    hero: { kind: 'gradient', stops: ['#ffd6bf', '#ffa190', '#8f96ff'], glow: '#ffffff', ink: '#16131c', soft: '#463a52' },
    paint: {
      light: { tile: '#ffffff', tile2: '#f4f4f7', ink: '#141418', muted: '#85858f', line: '#ebebf0', shadow: 0.08 },
      dark: { tile: '#1d1e27', tile2: '#262734', ink: '#f3f3f7', muted: '#9d9daa', line: '#30313f', shadow: 0.4 },
    },
    isDarkOnly: false,
    app: {
      roles: { accent: '#4d63e8', danger: '#d8433a', success: '#2f8f5b', warning: '#d98a1c', pro: '#b0558f' },
      light: {
        'surface-0': '#ececef',
        'surface-1': '#f4f4f6',
        'surface-2': '#fafafb',
        'text-primary': '#141418',
        'text-secondary': '#44444c',
        'text-muted': '#5e5e67',
      },
      dark: {
        'surface-0': '#111217',
        'surface-1': '#17181f',
        'surface-2': '#1c1d26',
        'surface-3': '#21222c',
        'text-primary': '#f3f3f7',
        'text-secondary': '#c9c9d4',
        'text-muted': '#9d9daa',
      },
      bubble: { light: ['#ffffff', '#141418'], dark: ['#262838', '#f3f3f7'] },
      glass: { blur: 28, opacity: 0.7 },
      style: bubbles,
    },
  },
  {
    id: 'glacier',
    label: 'Glacier',
    tagline: 'Blue glass tiles',
    font: 'sans',
    accent: '#2f6fed',
    accent2: '#f0743c',
    feature: { from: '#74a9ff', to: '#2f6fed', ink: '#ffffff' },
    hero: { kind: 'gradient', stops: ['#dbe9ff', '#93b9ff', '#4f86f5'], glow: '#ffffff', ink: '#0c1a33', soft: '#2b4370' },
    paint: {
      light: { tile: '#f8fbff', tile2: '#e9f1fd', ink: '#0e1a30', muted: '#66758f', line: '#dfe8f7', shadow: 0.09 },
      dark: { tile: '#142036', tile2: '#1b2a45', ink: '#e9f0ff', muted: '#91a2c2', line: '#26375a', shadow: 0.4 },
    },
    isDarkOnly: false,
    app: {
      roles: { accent: '#2c6ae8', danger: '#d0443c', success: '#22875a', warning: '#c7831a', pro: '#7a5ad6' },
      light: {
        'surface-0': '#e3ecfa',
        'surface-1': '#ecf2fc',
        'surface-2': '#f4f8fe',
        'text-primary': '#0e1a30',
        'text-secondary': '#30405e',
        'text-muted': '#4b5b79',
      },
      dark: {
        'surface-0': '#0a1220',
        'surface-1': '#0f1a2c',
        'surface-2': '#132034',
        'surface-3': '#17253b',
        'text-primary': '#e9f0ff',
        'text-secondary': '#bccbe6',
        'text-muted': '#91a2c2',
      },
      bubble: { light: ['#d4e4ff', '#0e1a30'], dark: ['#1b2d4b', '#e9f0ff'] },
      glass: { blur: 28, opacity: 0.7 },
      style: bubbles,
    },
  },
  {
    id: 'sage',
    label: 'Sage',
    tagline: 'Matcha paper',
    font: 'serif',
    accent: '#5d8f3a',
    accent2: '#c9763a',
    feature: { from: '#cfe39a', to: '#7fb08a', ink: '#16200f' },
    hero: { kind: 'gradient', stops: ['#f1f5cf', '#bcd68e', '#7fb08a'], glow: '#fffbe0', ink: '#16200f', soft: '#3d5230' },
    paint: {
      light: { tile: '#fbfcf7', tile2: '#eef3e4', ink: '#1a2116', muted: '#717d67', line: '#e3eada', shadow: 0.08 },
      dark: { tile: '#1e241a', tile2: '#273021', ink: '#eef2e8', muted: '#9eab92', line: '#323d2a', shadow: 0.4 },
    },
    isDarkOnly: false,
    app: {
      roles: { accent: '#4f7d32', danger: '#b8432f', success: '#2f8a55', warning: '#b5820f', pro: '#7d5a94' },
      light: {
        'surface-0': '#e9ede3',
        'surface-1': '#f0f3eb',
        'surface-2': '#f6f8f2',
        'text-primary': '#1a2116',
        'text-secondary': '#3f4a38',
        'text-muted': '#56624e',
      },
      dark: {
        'surface-0': '#121610',
        'surface-1': '#181d15',
        'surface-2': '#1d2319',
        'surface-3': '#22291e',
        'text-primary': '#eef2e8',
        'text-secondary': '#c5cfbb',
        'text-muted': '#9eab92',
      },
      bubble: { light: ['#dde8cb', '#1a2116'], dark: ['#273320', '#eef2e8'] },
      glass: { blur: 28, opacity: 0.7 },
      style: { ...bubbles, Heading: { fontFamily: ['serif'] } },
    },
  },
  {
    id: 'pixel',
    label: 'Pixel Quest',
    tagline: '8-bit hills, coins and clouds',
    font: 'mono',
    accent: '#f0522f',
    accent2: '#2f7df0',
    feature: { from: '#ffd23d', to: '#ffa800', ink: '#10203a' },
    hero: {
      kind: 'scene',
      ink: { light: '#0f1d3a', dark: '#ffffff' },
      soft: { light: '#2e4a7a', dark: '#c9d6ff' },
      scrim: { light: '#ffffff', dark: '#070b26' },
    },
    paint: {
      light: { tile: '#ffffff', tile2: '#eef5ff', ink: '#10203a', muted: '#66738e', line: '#dfe8f7', shadow: 0.1 },
      dark: { tile: '#161d38', tile2: '#1e2648', ink: '#eef3ff', muted: '#97a3c6', line: '#2b3563', shadow: 0.45 },
    },
    isDarkOnly: false,
    app: {
      roles: { accent: '#e5482a', danger: '#d6283c', success: '#2f9e44', warning: '#e0a800', pro: '#7b4fd6' },
      light: {
        'surface-0': '#e9f1fb',
        'surface-1': '#f1f6fd',
        'surface-2': '#f8fbff',
        'text-primary': '#10203a',
        'text-secondary': '#34466a',
        'text-muted': '#4d5f82',
      },
      dark: {
        'surface-0': '#0f1426',
        'surface-1': '#141a30',
        'surface-2': '#19203a',
        'surface-3': '#1e2542',
        'text-primary': '#eef3ff',
        'text-secondary': '#c3cdea',
        'text-muted': '#97a3c6',
      },
      bubble: { light: ['#fff1b8', '#10203a'], dark: ['#26305a', '#eef3ff'] },
      glass: { blur: 24, opacity: 0.72 },
      style: {
        UserMessage: {
          radius: 0,
          paddingX: 14,
          paddingY: 10,
          borderColor: '#10203a',
          borderWidth: 3,
          shadow: { x: 4, y: 4, blur: 0, color: '#10203a' },
        },
        Heading: { fontFamily: ['mono'] },
        ToolUse: { radius: 0 },
      },
    },
  },
  {
    id: 'mainframe',
    label: 'Mainframe',
    tagline: 'Green glyph rain on black',
    font: 'mono',
    accent: '#29f19a',
    accent2: '#57c7ff',
    feature: { from: '#2cf09c', to: '#0e9b62', ink: '#021208' },
    hero: {
      kind: 'scene',
      ink: { light: '#d8ffe6', dark: '#d8ffe6' },
      soft: { light: '#86dba7', dark: '#86dba7' },
      scrim: { light: '#010403', dark: '#010403' },
    },
    paint: dark({ tile: '#06120c', tile2: '#0b1d13', ink: '#d8ffe6', muted: '#6fa886', line: '#14402a' }),
    isDarkOnly: true,
    app: {
      roles: { accent: '#29f19a', danger: '#ff5a5a', success: '#7be08f', warning: '#e6d44a', pro: '#57c7ff' },
      dark: {
        'surface-0': '#050a07',
        'surface-1': '#08110c',
        'surface-2': '#0b1610',
        'surface-3': '#0e1b14',
        'text-primary': '#d8ffe6',
        'text-secondary': '#a6e0bb',
        'text-muted': '#7fb795',
      },
      bubble: { dark: ['#0f2a1b', '#d8ffe6'] },
      glass: { blur: 20, opacity: 0.8 },
      style: {
        Text: { fontFamily: ['code'] },
        Heading: { fontFamily: ['code'] },
        UserMessage: { radius: 4, paddingX: 14, paddingY: 10, borderColor: '#29f19a', borderWidth: 1 },
        ToolUse: { radius: 4 },
      },
    },
  },
  {
    id: 'dusk',
    label: 'Lo-fi Dusk',
    tagline: 'Pink ridges, blossoms, falling petals',
    font: 'serif',
    accent: '#e4577f',
    accent2: '#7a63d9',
    feature: { from: '#ffb0c4', to: '#e4577f', ink: '#ffffff' },
    hero: {
      kind: 'scene',
      ink: { light: '#2a1824', dark: '#ffffff' },
      soft: { light: '#5a3e50', dark: '#e2cfee' },
      scrim: { light: '#fff5f5', dark: '#0c0a20' },
    },
    paint: {
      light: { tile: '#fffafa', tile2: '#fbecf0', ink: '#2a1824', muted: '#8a6e80', line: '#f3dfe5', shadow: 0.08 },
      dark: { tile: '#1f1934', tile2: '#2a2245', ink: '#f6ecf6', muted: '#a897b6', line: '#3a2f5e', shadow: 0.45 },
    },
    isDarkOnly: false,
    app: {
      roles: { accent: '#e4577f', danger: '#d93a3a', success: '#3f9a6b', warning: '#d9901a', pro: '#7a63d9' },
      light: {
        'surface-0': '#f6e9ea',
        'surface-1': '#faf0f0',
        'surface-2': '#fdf6f6',
        'text-primary': '#2a1824',
        'text-secondary': '#5a3e50',
        'text-muted': '#74586a',
      },
      dark: {
        'surface-0': '#141022',
        'surface-1': '#1a1530',
        'surface-2': '#201a38',
        'surface-3': '#251e40',
        'text-primary': '#f6ecf6',
        'text-secondary': '#d2c2dc',
        'text-muted': '#a897b6',
      },
      bubble: { light: ['#ffdbe4', '#2a1824'], dark: ['#2e2448', '#f6ecf6'] },
      glass: { blur: 28, opacity: 0.7 },
      style: { ...bubbles, UserMessage: { ...bubbles.UserMessage, radius: 22 }, Heading: { fontFamily: ['serif'] } },
    },
  },
  {
    id: 'space',
    label: 'Deep Space',
    tagline: 'Nebula, stars and a ringed planet',
    font: 'sans',
    accent: '#7aa2ff',
    accent2: '#ff7ad1',
    feature: { from: '#7aa2ff', to: '#a46bff', ink: '#ffffff' },
    hero: {
      kind: 'scene',
      ink: { light: '#ffffff', dark: '#ffffff' },
      soft: { light: '#c4c9e8', dark: '#c4c9e8' },
      scrim: { light: '#03040a', dark: '#03040a' },
    },
    paint: dark({ tile: '#0e1226', tile2: '#161b38', ink: '#eef0ff', muted: '#8f96bd', line: '#222a55' }),
    isDarkOnly: true,
    app: {
      roles: { accent: '#7aa2ff', danger: '#ff5f6d', success: '#4fd69c', warning: '#ffc14d', pro: '#c18bff' },
      dark: {
        'surface-0': '#07080f',
        'surface-1': '#0b0d18',
        'surface-2': '#0f1220',
        'surface-3': '#131628',
        'text-primary': '#eef0ff',
        'text-secondary': '#c4c9e8',
        'text-muted': '#9399bd',
      },
      bubble: { dark: ['#18203a', '#eef0ff'] },
      glass: { blur: 26, opacity: 0.7 },
      style: {
        ...bubbles,
        UserMessage: { radius: 22, paddingX: 14, paddingY: 10, shadow: { x: 0, y: 0, blur: 20, color: '#7aa2ff44' } },
      },
    },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    tagline: 'Northern lights swaying over snowy peaks',
    font: 'sans',
    accent: '#34e0a1',
    accent2: '#a78bfa',
    feature: { from: '#5ff2c4', to: '#7aa8ff', ink: '#04131f' },
    hero: {
      kind: 'scene',
      ink: { light: '#ffffff', dark: '#ffffff' },
      soft: { light: '#bdf5e2', dark: '#bdf5e2' },
      scrim: { light: '#020617', dark: '#020617' },
    },
    paint: dark({ tile: '#071426', tile2: '#0c1d36', ink: '#e8fff6', muted: '#8fb3c4', line: '#173052' }),
    isDarkOnly: true,
    app: {
      roles: { accent: '#34e0a1', danger: '#ff6b81', success: '#5be37d', warning: '#ffd166', pro: '#a78bfa' },
      dark: {
        'surface-0': '#030a16',
        'surface-1': '#06101f',
        'surface-2': '#091528',
        'surface-3': '#0c1a30',
        'text-primary': '#e8fff6',
        'text-secondary': '#b7d6dc',
        'text-muted': '#88a9b5',
      },
      bubble: { dark: ['#0d2a33', '#e8fff6'] },
      glass: { blur: 26, opacity: 0.7 },
      style: {
        ...bubbles,
        UserMessage: { radius: 18, paddingX: 14, paddingY: 10, shadow: { x: 0, y: 0, blur: 18, color: '#34e0a144' } },
      },
    },
  },
  {
    id: 'lava',
    label: 'Lava Lamp',
    tagline: 'Molten blobs rising and melting together',
    font: 'sans',
    accent: '#ff7a1a',
    accent2: '#ff2e88',
    feature: { from: '#ffb23d', to: '#ff3d7f', ink: '#1a0510' },
    hero: {
      kind: 'scene',
      ink: { light: '#ffffff', dark: '#ffffff' },
      soft: { light: '#ffd2c2', dark: '#ffd2c2' },
      scrim: { light: '#0d0410', dark: '#0d0410' },
    },
    paint: dark({ tile: '#1d0a18', tile2: '#2a0f22', ink: '#fff0f3', muted: '#c99aa9', line: '#3d1530' }),
    isDarkOnly: true,
    app: {
      roles: { accent: '#ff7a1a', danger: '#ff4d6d', success: '#5be37d', warning: '#ffc93c', pro: '#c77dff' },
      dark: {
        'surface-0': '#0e050c',
        'surface-1': '#140810',
        'surface-2': '#1a0b15',
        'surface-3': '#1f0e1a',
        'text-primary': '#fff0f3',
        'text-secondary': '#e8c3cf',
        'text-muted': '#c09aa8',
      },
      bubble: { dark: ['#2e1024', '#fff0f3'] },
      glass: { blur: 28, opacity: 0.72 },
      style: { ...bubbles, UserMessage: { ...bubbles.UserMessage, radius: 24 } },
    },
  },
  {
    id: 'tide',
    label: 'Ocean Tide',
    tagline: 'Rolling waves under sun or moon',
    font: 'sans',
    accent: '#1f8fd6',
    accent2: '#f28c38',
    feature: { from: '#9fdcff', to: '#3a8fe6', ink: '#03203a' },
    hero: {
      kind: 'scene',
      ink: { light: '#06233f', dark: '#ffffff' },
      soft: { light: '#2b5a80', dark: '#bcd8f5' },
      scrim: { light: '#ffffff', dark: '#050d24' },
    },
    paint: {
      light: { tile: '#f7fbff', tile2: '#e6f2fd', ink: '#06233f', muted: '#5d7690', line: '#d8e8f7', shadow: 0.09 },
      dark: { tile: '#0c1a33', tile2: '#122546', ink: '#e6f2ff', muted: '#8ea6c4', line: '#1d3460', shadow: 0.45 },
    },
    isDarkOnly: false,
    app: {
      roles: { accent: '#1f7fd1', danger: '#d9473f', success: '#1f9d6e', warning: '#d99a1a', pro: '#7a5ad6' },
      light: {
        'surface-0': '#e4f0fb',
        'surface-1': '#edf5fd',
        'surface-2': '#f5f9fe',
        'text-primary': '#06233f',
        'text-secondary': '#2b4a66',
        'text-muted': '#4b6680',
      },
      dark: {
        'surface-0': '#050d1e',
        'surface-1': '#081429',
        'surface-2': '#0b1932',
        'surface-3': '#0e1e3a',
        'text-primary': '#e6f2ff',
        'text-secondary': '#bcd0ea',
        'text-muted': '#8ea6c4',
      },
      bubble: { light: ['#d3e9fb', '#06233f'], dark: ['#12305a', '#e6f2ff'] },
      glass: { blur: 26, opacity: 0.7 },
      style: bubbles,
    },
  },
  {
    id: 'city',
    label: 'Neon City',
    tagline: 'Night skyline, sky traffic, neon signs',
    font: 'mono',
    accent: '#00d5f0',
    accent2: '#ff2bd6',
    feature: { from: '#00e5ff', to: '#ff5fd2', ink: '#14021f' },
    hero: {
      kind: 'scene',
      ink: { light: '#ffffff', dark: '#ffffff' },
      soft: { light: '#9ff6ff', dark: '#9ff6ff' },
      scrim: { light: '#07021a', dark: '#07021a' },
    },
    paint: dark({ tile: '#0d0820', tile2: '#160d33', ink: '#effcff', muted: '#9a93c4', line: '#2a1b55' }),
    isDarkOnly: true,
    app: {
      roles: { accent: '#00d5f0', danger: '#ff4d6d', success: '#3ef0a5', warning: '#ffd23d', pro: '#ff2bd6' },
      dark: {
        'surface-0': '#06031a',
        'surface-1': '#0a0522',
        'surface-2': '#0e0829',
        'surface-3': '#120a31',
        'text-primary': '#effcff',
        'text-secondary': '#c6c2ea',
        'text-muted': '#9a93c4',
      },
      bubble: { dark: ['#1a1040', '#effcff'] },
      glass: { blur: 28, opacity: 0.74 },
      style: {
        UserMessage: {
          radius: 12,
          paddingX: 14,
          paddingY: 10,
          borderColor: '#00d5f0',
          borderWidth: 1,
          shadow: { x: 0, y: 0, blur: 18, color: '#00d5f055' },
        },
        Heading: { fontFamily: ['mono'] },
        ToolUse: { radius: 8 },
      },
    },
  },
]

export const LOOK_ORDER: readonly LookId[] = LOOKS.map(look => look.id)

export const isLookId = (value: unknown): value is LookId =>
  typeof value === 'string' && (LOOK_ORDER as readonly string[]).includes(value)

export const lookOf = (id: LookId): Look => LOOKS.find(look => look.id === id) ?? (LOOKS[0] as Look)

export type BuiltTheme = { args: ThemeSetArgs; bare: ThemeSetArgs; problems: string[] }

const built = new Map<LookId, BuiltTheme>()

/** The app theme for a look, built once: undefined for Claude's own. */
export const themeOf = (id: LookId): BuiltTheme | undefined => {
  const look = lookOf(id)
  const app = look.app

  if (app === undefined) {
    return undefined
  }
  const cached = built.get(id)

  if (cached !== undefined) {
    return cached
  }
  const { theme, problems } = makeColors({
    label: look.label,
    id: `prompt-deck-${id}`,
    roles: app.roles,
    dark: { gray: { anchors: app.dark } },
    ...(app.light === undefined ? { only: 'dark' as const } : { light: { gray: { anchors: app.light } } }),
  })
  const bubble = (pair: [Hex, Hex]) => ({ 'bg-user-message': pair[0], 'text-user-message': pair[1] })
  const colors: ThemeColors = {
    ...theme,
    inputs: {
      ...theme.inputs,
      ...(app.bubble.light === undefined ? {} : { light: { ...theme.inputs?.light, ...bubble(app.bubble.light) } }),
      dark: { ...theme.inputs?.dark, ...bubble(app.bubble.dark) },
    },
  }
  const bare: ThemeSetArgs = {
    colors,
    backdrop: { scene: id, glass: { blur: app.glass.blur, opacity: app.glass.opacity } },
    ...(look.isDarkOnly ? { overrideColorScheme: 'dark' as const } : {}),
  }
  const result = { args: app.style === undefined ? bare : { ...bare, style: app.style }, bare, problems }
  built.set(id, result)

  return result
}

/** The background picture for a scene name the theme carries. */
export const backdropOf = (scene: string): { source: string; alt: string } | undefined =>
  isLookId(scene) && scene !== 'default'
    ? { source: sceneSvg(scene), alt: `${lookOf(scene).label}: ${lookOf(scene).tagline}` }
    : undefined
