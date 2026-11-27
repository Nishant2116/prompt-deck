import type { ClientModule, ClientPointerEvent, ClientSurface } from 'claude-code'

// The game card, drawn and clicked in its own region: tic-tac-toe on one
// face, the 4×4 sudoku on the other, and a Swap button that flips the card.
// The board is laid out here in cells and lines, and the same layout tells
// which square a click lands on.

type Kind = 'ttt' | 'sudoku'
type Ttt = {
  board: string[]
  winner: string | null
  line: number[] | null
  score: { you: number; bot: number; draw: number }
}
type Sudoku = { givens: number[]; cells: number[]; selected: number | null; isSolved: boolean; moves: number }
type Props = {
  kind: Kind
  accent: string
  /** Text that reads on a solid accent fill. */
  onAccent: string
  accent2: string
  danger: string
  ttt: Ttt
  sudoku: Sudoku
  clashes: number[]
}
type State = {
  shown: Kind
  /** The swap's wave: the diagonal of squares lighting up now; null at rest. */
  wave: number | null
  /** Squares that just changed, glinting, and the ticks their glint has left. */
  fresh: number[]
  glow: number
  /** Claude's reply, held back a beat after your move. */
  held: number[]
  /** The board as last drawn, to tell what changed. */
  seen: string
  over: string | null
  down: string | null
}
type Rect = { id: string; x: number; y: number; w: number; h: number }

const HEADER = 2
const STATUS = 2
const PILL_W = 12
/** The swap button: a small circle, about as tall as it is wide. */
const SWAP_W = 4
const SWAP_H = 1.5
/** One tick of motion; the wave moves a diagonal per tick, a glint fades over GLOW ticks. */
const TICK_MS = 45
const GLOW = 9
const HOLD = 4

/**
 * Square sizes for a card this many columns wide: as big as the card allows,
 * within limits. The pane sets the card's height from the same numbers.
 */
export const dims = (columns: number) => {
  const tc = Math.max(7, Math.min(13, Math.floor((columns - 6) / 3)))
  const tr = tc >= 11 ? 4 : 3
  const sc = Math.max(5, Math.min(9, Math.floor((columns - 8) / 4)))
  const sr = sc >= 8 ? 3 : 2
  const colAt = [0, sc + 1, 2 * sc + 3, 3 * sc + 4]
  const rowAt = [0, sr + 0.25, 2 * sr + 1, 3 * sr + 1.25]
  const gridW = 4 * sc + 4
  const gridH = 4 * sr + 1.25
  const kw = Math.floor((gridW - 4) / 5)

  return { tc, tr, sc, sr, colAt, rowAt, gridW, gridH, kw }
}

/** The lines a card needs to hold either face. */
export const cardRows = (columns: number) => {
  const d = dims(columns)
  // A spare line above the status row keeps its button clear of the board.
  const ttt = HEADER + 0.5 + 3 * d.tr + 1.5 + 1.5 + STATUS
  const sudoku = HEADER + 0.5 + d.gridH + 0.5 + d.sr + 1.5 + STATUS

  return Math.ceil(Math.max(ttt, sudoku))
}

// Colours, mixed here so a square can fade from one to another. A Box paints
// one flat colour, so a square's gradient is a stack of faint layers that all
// start at the same edge and reach different distances: where more of them
// overlap, the colour is stronger. No two layers butt against each other, so
// no seam shows between them.
type Rgba = [number, number, number, number]
/**
 * How a square is painted: a base colour; a glow strongest at the top that is
 * gone by `reach`, a share of the height; a tint gathering toward the right
 * edge; its rim and its ink.
 */
type Face = {
  base: string
  glow: string
  glowAlpha: number
  reach: number
  side: string | null
  sideAlpha: number
  rim: string
  ink: string
}
/** Layers in a glow: more where it is strong, so its steps stay too fine to see. */
const glowLayers = (alpha: number) => (alpha > 0.5 ? 24 : 12)
const SIDE_LAYERS = 8
/** The opacity each of `n` stacked layers needs for all of them together to reach `total`. */
const each = (total: number, n: number) => 1 - (1 - Math.min(0.98, Math.max(0, total))) ** (1 / n)
/** A share as a whole percentage, the only kind a size takes. */
const percent = (share: number) => `${Math.max(1, Math.min(100, Math.round(share * 100)))}%`

const parse = (c: string): Rgba | null => {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c)

  if (m === null) {
    return null
  }
  const n = Number.parseInt(m[1] ?? '0', 16)

  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, m[2] === undefined ? 1 : Number.parseInt(m[2], 16) / 255]
}
const byte = (v: number) =>
  Math.round(Math.max(0, Math.min(255, v)))
    .toString(16)
    .padStart(2, '0')
const blend = (a: Rgba, b: Rgba, t: number): Rgba => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  a[3] + (b[3] - a[3]) * t,
]
/** `c` moved toward `to` by `t`, at opacity `alpha`. */
const shade = (c: string, to: string, t: number, alpha = 1): string => {
  const a = parse(c)
  const b = parse(to)

  if (a === null || b === null) {
    return c
  }
  const m = blend(a, b, t)

  return `#${byte(m[0])}${byte(m[1])}${byte(m[2])}${byte(alpha * 255)}`
}
/** Ink that reads on a solid fill of `c`: white or near-black, whichever stands out more. */
const inkOn = (c: string) => {
  const rgb = parse(c)

  if (rgb === null) {
    return '#ffffff'
  }
  const [r, g, b] = rgb.slice(0, 3).map(v => {
    const x = v / 255

    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  const lum = 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)

  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.0555 ? '#ffffff' : '#140f0c'
}

/** The latest props of each drawn card, for its timer to read. */
const latest = new WeakMap<object, Props>()

const boardKey = (p: Props, kind: Kind) => (kind === 'ttt' ? p.ttt.board.join(',') : p.sudoku.cells.join(','))

const rest = (p: Props): State => ({
  shown: p.kind,
  wave: null,
  fresh: [],
  glow: 0,
  held: [],
  seen: boardKey(p, p.kind),
  over: null,
  down: null,
})

/** A square's diagonal from the top left: the order the wave reaches it. */
const diagOf = (kind: Kind, i: number) => (kind === 'ttt' ? Math.floor(i / 3) + (i % 3) : Math.floor(i / 4) + (i % 4))
const LAST_DIAG = { ttt: 4, sudoku: 7 } as const

/** Every place a click means something, in the region's cells and lines. */
const layout = (kind: Kind, columns: number, rows: number): { rects: Rect[]; x0: number } => {
  const rects: Rect[] = [{ id: 'game:swap', x: columns - 2 - SWAP_W, y: 0, w: SWAP_W, h: HEADER }]

  if (kind === 'ttt') {
    const { tc, tr } = dims(columns)
    const x0 = Math.max(1, Math.floor((columns - (3 * tc + 2)) / 2))

    for (let i = 0; i < 9; i += 1) {
      rects.push({ id: `ttt:${i}`, x: x0 + (i % 3) * (tc + 1), y: HEADER + 0.5 + Math.floor(i / 3) * (tr + 0.5), w: tc, h: tr })
    }
    rects.push({ id: 'ttt:new', x: columns - 2 - PILL_W, y: rows - STATUS, w: PILL_W, h: STATUS })

    return { rects, x0 }
  }
  const { sc, sr, colAt, rowAt, gridW, gridH, kw } = dims(columns)
  const x0 = Math.max(1, Math.floor((columns - gridW) / 2))

  for (let i = 0; i < 16; i += 1) {
    rects.push({
      id: `sdk:${i}`,
      x: x0 + (colAt[i % 4] ?? 0),
      y: HEADER + 0.5 + (rowAt[Math.floor(i / 4)] ?? 0),
      w: sc,
      h: sr,
    })
  }

  for (let k = 0; k < 5; k += 1) {
    rects.push({ id: `num:${k < 4 ? k + 1 : 0}`, x: x0 + k * (kw + 1), y: HEADER + 0.5 + gridH + 0.5, w: kw, h: sr })
  }
  rects.push({ id: 'sdk:new', x: columns - 2 - PILL_W, y: rows - STATUS, w: PILL_W, h: STATUS })

  return { rects, x0 }
}

const hit = (st: State, s: ClientSurface<State>, e: ClientPointerEvent): string | null => {
  if (st.wave !== null) {
    return null
  }
  const x = e.fine?.x ?? e.x + 0.5
  const y = e.fine?.y ?? e.y + 0.5

  return (
    layout(st.shown, s.columns, s.rows).rects.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)?.id ??
    null
  )
}

/**
 * One tick of motion. A swap shows the other face at once and sends a wave of
 * light across its squares; a changed square glints and fades; Claude's reply
 * waits a beat after your move. Ticks with nothing moving draw nothing.
 */
const step = (s: ClientSurface<State>) => {
  const p = latest.get(s)
  const st = s.state

  if (p === undefined || st === undefined) {
    return
  }
  const isStill = s.isMotionReduced

  if (p.kind !== st.shown) {
    s.setState({ ...rest(p), wave: isStill ? null : 0 })

    return
  }
  let next = st
  const key = boardKey(p, st.shown)

  if (key !== st.seen) {
    const was = st.seen.split(',')
    const now = key.split(',')
    const fresh = isStill || was.length !== now.length ? [] : now.flatMap((v, i) => (v !== was[i] ? [i] : []))
    const held = st.shown === 'ttt' ? fresh.filter(i => now[i] === 'O' && fresh.length > 1) : []
    next = { ...next, seen: key, fresh, held, glow: fresh.length > 0 ? GLOW + (held.length > 0 ? HOLD : 0) : 0 }
  }

  if (next.wave !== null) {
    next = { ...next, wave: next.wave + 1 > LAST_DIAG[next.shown] + 2 ? null : next.wave + 1 }
  } else if (next.glow > 0) {
    const glow = next.glow - 1
    next = { ...next, glow, ...(glow === 0 ? { fresh: [], held: [] } : {}) }
  }

  if (next !== st) {
    s.setState(next)
  }
}

const Game: ClientModule<Props, State> = (p, s) => {
  const { Box, Text } = s.elements
  latest.set(s, p)

  if (s.state === undefined) {
    s.setState(rest(p))
    s.every(TICK_MS, () => step(s))
  }
  const st = s.state ?? rest(p)

  s.onPointer(e => {
    const was = s.state ?? rest(p)

    if (e.type === 'leave') {
      s.setState({ ...was, over: null, down: null })

      return
    }
    const id = hit(was, s, e)

    if (e.type === 'enter' || e.type === 'move') {
      if (id !== was.over) {
        s.setState({ ...was, over: id })
      }

      return
    }

    if (e.type === 'down') {
      if (e.button === 'left') {
        s.setState({ ...was, down: id })
      }

      return
    }

    if (id !== null && id === was.down) {
      s.post({ press: id })
    }
    s.setState({ ...was, down: null })
  })

  // The card's picture lies beneath; the card itself only draws what sits on it.
  const card = { borderStyle: 'round', borderColor: '#00000000', flexDirection: 'column' } as const

  /**
   * How lit a square is now: -1 not yet reached by the swap's wave, 2 at its
   * crest or a fresh glint, 1 as either fades, 0 at rest.
   */
  const lit = (i: number, diag: number): -1 | 0 | 1 | 2 => {
    if (st.wave !== null) {
      return diag > st.wave ? -1 : diag === st.wave ? 2 : diag === st.wave - 1 ? 1 : 0
    }

    if (st.fresh.includes(i) && !(st.held.includes(i) && st.glow > GLOW)) {
      return st.glow > GLOW / 2 ? 2 : 1
    }

    return 0
  }
  // The faces a square can wear. Glass: frosted, lighter at the top, with a
  // cool tint creeping in from the right. Solid: a tone lit from the top
  // left and deepening below. A glint lifts either toward white, then fades.
  const W = '#ffffff'
  const glass = (strength: number, rim: string): Face => ({
    base: shade(p.accent, W, 0, Math.min(0.12, 0.05 * strength)),
    glow: shade(p.accent, W, 0.45),
    glowAlpha: Math.min(0.6, 0.2 * strength),
    reach: 0.9,
    side: shade(p.accent2, W, 0.1),
    sideAlpha: Math.min(0.26, 0.11 * strength),
    rim,
    ink: p.accent,
  })
  const solid = (tone: string, lift = 0): Face => ({
    base: shade(tone, '#000000', 0.14 * (1 - lift)),
    glow: shade(tone, W, 0.5 + lift * 0.3),
    glowAlpha: 0.75,
    reach: 1,
    side: null,
    sideAlpha: 0,
    rim: shade(tone, W, 0.4 + lift * 0.3),
    ink: inkOn(tone),
  })
  const soft = (tone: string, strength: number): Face => ({
    base: shade(tone, W, 0, Math.min(0.3, 0.1 * strength)),
    glow: shade(tone, W, 0.35),
    glowAlpha: Math.min(0.7, 0.3 * strength),
    reach: 0.9,
    side: null,
    sideAlpha: 0,
    rim: shade(tone, W, 0, 0.45),
    ink: tone,
  })
  const hidden: Face = {
    base: '#00000000',
    glow: '#00000000',
    glowAlpha: 0,
    reach: 1,
    side: null,
    sideAlpha: 0,
    rim: `${p.accent}18`,
    ink: p.accent,
  }
  /** A face as the swap's wave or a fresh move lights it: -1 dark, 2 brightest. */
  const glint = (level: -1 | 0 | 1 | 2, rest: Face, mark: string | null): Face =>
    level === -1
      ? hidden
      : level === 0
        ? rest
        : mark !== null
          ? solid(mark, level === 2 ? 1 : 0.5)
          : { ...soft(p.accent, level === 2 ? 2.2 : 1.4), rim: level === 2 ? p.accent : `${p.accent}a0` }

  /** A rounded square painted with a face, and what sits on it centred above. */
  const tile = (width: number, height: number, face: Face, top: JSX.Element | false) => {
    const layers = glowLayers(face.glowAlpha)
    const glow = shade(face.glow, W, 0, each(face.glowAlpha, layers))
    const side = face.side === null ? null : shade(face.side, W, 0, each(face.sideAlpha, SIDE_LAYERS))

    return (
      <Box width={width} height={height} borderStyle="round" borderColor={face.rim} padding={0} overflow="hidden">
        <Box position="absolute" top={0} left={0} width="100%" height="100%" backgroundColor={face.base} />
        {face.glowAlpha > 0 &&
          Array.from({ length: layers }, (_, k) => (
            <Box
              position="absolute"
              top={0}
              left={0}
              width="100%"
              height={percent((face.reach * (k + 1)) / layers)}
              backgroundColor={glow}
            />
          ))}
        {side !== null &&
          Array.from({ length: SIDE_LAYERS }, (_, k) => (
            <Box position="absolute" top={0} left={0} width="100%" height="100%" flexDirection="row" justifyContent="flex-end">
              <Box width={percent((k + 1) / SIDE_LAYERS)} height="100%" backgroundColor={side} />
            </Box>
          ))}
        <Box position="absolute" top={0} left={0} width="100%" height="100%" alignItems="center" justifyContent="center">
          {top}
        </Box>
      </Box>
    )
  }

  const { x0 } = layout(st.shown, s.columns, s.rows)
  const D = dims(s.columns)
  const isOver = (id: string) => st.over === id
  const pill = (id: string, label: string, width: number, isPrimary: boolean) => {
    const face = isPrimary
      ? solid(p.accent, isOver(id) ? 0.5 : 0)
      : isOver(id)
        ? { ...soft(p.accent, 1.6), rim: p.accent }
        : { ...soft(p.accent, 0.9), rim: `${p.accent}66` }

    return tile(
      width,
      1.5,
      face,
      <Text size="footnote" weight="bold" color={isPrimary ? face.ink : p.accent}>
        {label}
      </Text>,
    )
  }
  const chip = (label: string, tone: string) => (
    <Text size="footnote" weight="bold" color={tone}>
      {label}
    </Text>
  )
  const header = (title: string, chips: JSX.Element[], other: string) => (
    <Box height={HEADER} flexDirection="row" justifyContent="space-between" alignItems="center" paddingX={2}>
      <Box flexDirection="row" gap={1} alignItems="center">
        <Text size="heading" weight="bold">
          {title}
        </Text>
        {chips}
      </Box>
      {tile(
        SWAP_W,
        SWAP_H,
        solid(p.accent, isOver('game:swap') ? 0.6 : 0),
        <Text weight="bold" color={inkOn(p.accent)}>
          ⇄
        </Text>,
      )}
    </Box>
  )

  if (st.shown === 'ttt') {
    const t = p.ttt
    const isThinking = st.held.length > 0 && st.glow > GLOW
    const status = isThinking
      ? 'Claude is thinking…'
      : t.winner === 'X'
        ? 'You win!'
        : t.winner === 'O'
          ? 'Claude wins'
          : t.winner === 'draw'
            ? 'Draw'
            : 'Your move (X)'
    const cell = (i: number) => {
      const isHeld = isThinking && st.held.includes(i)
      const mark = isHeld ? '' : (t.board[i] ?? '')
      const level = lit(i, diagOf('ttt', i))
      // The winning line fills once every glint has settled.
      const isWin = (t.line?.includes(i) ?? false) && st.glow === 0 && st.wave === null
      const isOpen = mark === '' && t.winner === null
      const isHover = isOpen && isOver(`ttt:${i}`)
      const tone = mark === 'O' ? p.accent2 : p.accent
      // Once a game is won, the winning line keeps its light and the rest steps back.
      const isBehind = t.winner !== null && t.winner !== 'draw' && !isWin && st.glow === 0 && st.wave === null
      const rest =
        mark === ''
          ? isHover
            ? glass(2, p.accent)
            : glass(isBehind ? 0.6 : 1, `${p.accent}40`)
          : isWin
            ? { ...solid(tone, 0.35), rim: shade(tone, W, 0.75) }
            : isBehind
              ? { ...glass(0.8, `${tone}66`), ink: tone }
              : solid(tone)
      const face = glint(level, rest, mark === '' ? null : tone)

      return tile(
        D.tc,
        D.tr,
        face,
        level !== -1 && (mark !== '' || isHover) && (
          <Text size="title" weight="bold" color={mark === '' ? p.accent : face.ink} {...(mark === '' ? { dimColor: true } : {})}>
            {mark === '' ? 'X' : mark}
          </Text>
        ),
      )
    }

    return (
      <Box {...card} width={s.columns} height={s.rows}>
        {header('Tic-tac-toe', [chip(`You ${t.score.you}`, p.accent), chip(`Claude ${t.score.bot}`, p.accent2)], 'Sudoku')}
        <Box height={0.5} />
        {[0, 1, 2].map(r => (
          <Box flexDirection="column">
            <Box height={D.tr} flexDirection="row" gap={1} marginLeft={x0}>
              {cell(r * 3)}
              {cell(r * 3 + 1)}
              {cell(r * 3 + 2)}
            </Box>
            <Box height={0.5} />
          </Box>
        ))}
        <Box flexGrow={1} />
        <Box height={STATUS} flexDirection="row" justifyContent="space-between" alignItems="center" paddingX={2}>
          <Text weight="bold" wrap="truncate-end" {...(t.winner === 'X' ? { color: p.accent } : {})}>
            {status}
          </Text>
          {pill('ttt:new', t.winner === null ? 'Restart' : 'Play again', PILL_W, t.winner !== null)}
        </Box>
      </Box>
    )
  }
  const g = p.sudoku
  const bad = new Set(p.clashes)
  const square = (i: number) => {
    const n = g.cells[i] ?? 0
    const isGiven = (g.givens[i] ?? 0) > 0
    const isPicked = g.selected === i
    const isHover = !isGiven && !g.isSolved && isOver(`sdk:${i}`)
    const level = lit(i, diagOf('sudoku', i))
    const rest = isPicked
      ? { ...solid(p.accent), ...(bad.has(i) ? { rim: p.danger } : {}) }
      : isHover
        ? glass(2, p.accent)
        : isGiven
          ? glass(1.7, `${p.accent}70`)
          : glass(g.isSolved ? 1.4 : 1, `${p.accent}40`)
    const face = glint(level, rest, null)

    return tile(
      D.sc,
      D.sr,
      face,
      level !== -1 && n > 0 && (
        <Text
          size={D.sr >= 3 ? 'title' : 'heading'}
          weight={isGiven ? 'bold' : 'semibold'}
          {...(isPicked && level === 0
            ? { color: face.ink }
            : bad.has(i)
              ? { color: p.danger }
              : isGiven
                ? {}
                : { color: p.accent })}
        >
          {String(n)}
        </Text>
      ),
    )
  }
  const band = (r: number) => (
    <Box height={D.sr} flexDirection="row" marginLeft={x0}>
      {square(r * 4)}
      <Box width={1} />
      {square(r * 4 + 1)}
      <Box width={2} />
      {square(r * 4 + 2)}
      <Box width={1} />
      {square(r * 4 + 3)}
    </Box>
  )
  const key = (n: number) => {
    const id = `num:${n}`
    const isHover = isOver(id) && g.selected !== null
    const level = lit(100 + n, LAST_DIAG.sudoku)
    const face = glint(level, isHover ? solid(p.accent, 0.2) : glass(1.3, `${p.accent}5c`), null)

    return tile(
      D.kw,
      D.sr,
      face,
      level !== -1 && (
        <Text weight="bold" size={D.sr >= 3 ? 'heading' : 'body'} color={isHover && level === 0 ? face.ink : p.accent}>
          {n === 0 ? '⌫' : String(n)}
        </Text>
      ),
    )
  }
  const status = g.isSolved ? `Solved in ${g.moves}` : g.selected === null ? 'Tap a square' : 'Pick a number'

  return (
    <Box {...card} width={s.columns} height={s.rows}>
      {header('Mini sudoku', [chip(`${g.moves} ${g.moves === 1 ? 'move' : 'moves'}`, p.accent)], 'Tic-tac-toe')}
      <Box height={0.5} />
      {band(0)}
      <Box height={0.25} />
      {band(1)}
      <Box height={0.75} />
      {band(2)}
      <Box height={0.25} />
      {band(3)}
      <Box height={0.5} />
      <Box height={D.sr} flexDirection="row" gap={1} marginLeft={x0}>
        {key(1)}
        {key(2)}
        {key(3)}
        {key(4)}
        {key(0)}
      </Box>
      <Box flexGrow={1} />
      <Box height={STATUS} flexDirection="row" justifyContent="space-between" alignItems="center" paddingX={2}>
        <Text weight="bold" wrap="truncate-end" {...(g.isSolved ? { color: p.accent } : {})}>
          {status}
        </Text>
        {pill('sdk:new', 'New one', PILL_W, g.isSolved)}
      </Box>
    </Box>
  )
}

export default Game
