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
  /** A square's frame and fill at a level of light, or as it rests. */
  const glint = (level: -1 | 0 | 1 | 2, border: string, fill: string) =>
    level === -1
      ? { borderColor: `${p.accent}18`, backgroundColor: '#00000000' }
      : level === 2
        ? { borderColor: p.accent, backgroundColor: `${p.accent}5c` }
        : level === 1
          ? { borderColor: `${p.accent}a0`, backgroundColor: `${p.accent}30` }
          : { borderColor: border, backgroundColor: fill }

  const { x0 } = layout(st.shown, s.columns, s.rows)
  const D = dims(s.columns)
  const isOver = (id: string) => st.over === id
  const pill = (id: string, label: string, width: number, isPrimary: boolean) => (
    <Box
      width={width}
      height={1.5}
      padding={0}
      alignItems="center"
      borderStyle="round"
      borderColor={isPrimary || isOver(id) ? p.accent : `${p.accent}66`}
      backgroundColor={isPrimary ? (isOver(id) ? `${p.accent}dd` : p.accent) : isOver(id) ? `${p.accent}33` : `${p.accent}17`}
      justifyContent="center"
    >
      <Text size="footnote" weight="bold" color={isPrimary ? p.onAccent : p.accent}>
        {label}
      </Text>
    </Box>
  )
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
      <Box
        width={SWAP_W}
        height={SWAP_H}
        borderStyle="round"
        padding={0}
        borderColor={isOver('game:swap') ? p.onAccent : p.accent}
        backgroundColor={isOver('game:swap') ? `${p.accent}dd` : p.accent}
        alignItems="center"
        justifyContent="center"
      >
        <Text weight="bold" color={p.onAccent}>
          ⇄
        </Text>
      </Box>
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
      const look = isWin
        ? { borderColor: tone, backgroundColor: tone }
        : glint(level, isHover ? p.accent : `${p.accent}3a`, isHover ? `${p.accent}2e` : `${p.accent}14`)

      return (
        <Box width={D.tc} height={D.tr} borderStyle="round" {...look} alignItems="center" justifyContent="center">
          {level !== -1 && (mark !== '' || isHover) && (
            <Text size="title" weight="bold" color={isWin ? p.onAccent : tone} {...(mark === '' ? { dimColor: true } : {})}>
              {mark === '' ? 'X' : mark}
            </Text>
          )}
        </Box>
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
    const look = glint(
      level,
      isPicked || isHover ? p.accent : isGiven ? `${p.accent}55` : `${p.accent}30`,
      isPicked ? p.accent : isHover ? `${p.accent}2e` : isGiven ? `${p.accent}26` : `${p.accent}0f`,
    )

    return (
      <Box width={D.sc} height={D.sr} borderStyle="round" {...look} alignItems="center" justifyContent="center">
        {level !== -1 && n > 0 && (
          <Text
            size={D.sr >= 3 ? 'title' : 'heading'}
            weight={isGiven ? 'bold' : 'semibold'}
            {...(bad.has(i) ? { color: p.danger } : isPicked && level === 0 ? { color: p.onAccent } : isGiven ? {} : { color: p.accent })}
          >
            {String(n)}
          </Text>
        )}
      </Box>
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

    return (
      <Box
        width={D.kw}
        height={D.sr}
        borderStyle="round"
        {...glint(level, isHover ? p.accent : `${p.accent}55`, isHover ? p.accent : `${p.accent}1f`)}
        alignItems="center"
        justifyContent="center"
      >
        {level !== -1 && (
          <Text weight="bold" size={D.sr >= 3 ? 'heading' : 'body'} color={isHover && level === 0 ? p.onAccent : p.accent}>
            {n === 0 ? '⌫' : String(n)}
          </Text>
        )}
      </Box>
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
