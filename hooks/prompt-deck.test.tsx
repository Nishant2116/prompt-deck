import { expect, test } from 'claude-code/testing'

import { glassArt, heroArt, litArt, thumbArt } from './art'
import { cardRows, dims } from './game'
import { clashes, newGame, newSudoku, placeDigit, playTtt, selectCell } from './games'
import { LOOK_ORDER, themeOf } from './looks'
import { parsePrompts, serializePrompts, STARTER, STARTER_INTRO } from './prompts'

// The test kit's own timer, for letting a press's work settle.
declare const setTimeout: (fn: (value?: unknown) => void, ms: number) => unknown
const settle = () => new Promise(resolve => setTimeout(resolve, 80))

const COLUMNS = 59
/** The width the layout uses: what the pane reports, less its scrollbar. */
const C = COLUMNS - 2
const HALF = Math.floor((C - 2) / 2)

const PANE = {
  plugin: 'prompt-deck',
  component: 'Pane',
  requestId: 'prompt-deck',
  props: {
    title: 'Prompt Deck',
    isFocused: false,
    bodyColumns: COLUMNS,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 60 },
    view: {},
  },
} as const

const SAVED = [
  { title: 'Continue', text: 'Continue with the next step.' },
  { title: 'Run the tests', text: 'Run the tests and fix any failures.' },
]

const SEEDED = { value: { value: { shape: 'prompts-1', value: SAVED }, version: 1 } }

/** A full click, down and up, at a cell of a tile's region. */
const click = async (ui: { pointer: (e: never) => Promise<void> }, region: string, x: number, y: number) => {
  const at = { x: Math.floor(x), y: Math.floor(y), fine: { x, y }, button: 'left', in: region }
  await ui.pointer({ type: 'down', ...at } as never)
  await ui.pointer({ type: 'up', ...at } as never)
  await settle()
}

test('the file format reads back what it writes, fences kept', () => {
  const withFence = [...STARTER, { title: 'Snippet', text: 'Use this:\n\n```md\n## not a heading\n```' }]
  const parsed = parsePrompts(serializePrompts(STARTER_INTRO, withFence))

  expect(parsed.prompts).toEqual(withFence)
  expect(parsed.intro).toBe(STARTER_INTRO.trim())
})

test('every look has art the Svg element takes', () => {
  for (const look of LOOK_ORDER) {
    for (const art of [heroArt(look), litArt(look), glassArt(look, 1), glassArt(look, 2, 'square'), thumbArt(look)]) {
      expect(art.length).toBeLessThan(131072)
      expect(art.startsWith('<svg')).toBe(true)
    }
  }
})

test('every theme builds and paints', () => {
  for (const look of LOOK_ORDER) {
    const theme = themeOf(look)

    if (look === 'default') {
      expect(theme).toBeUndefined()
    } else {
      expect(theme?.problems.filter(line => line.startsWith("Desktop won't paint"))).toEqual([])
    }
  }
})

test('tic-tac-toe answers each move; sudoku spots a clash', () => {
  let ttt = newGame(() => 0.5).ttt
  ttt = playTtt(ttt, 4, () => 0.9)

  expect(ttt.board[4]).toBe('X')
  expect(ttt.board.filter(m => m === 'O').length).toBe(1)

  const puzzle = newSudoku(() => 0.42)
  const blank = puzzle.givens.indexOf(0)
  const row = Math.floor(blank / 4) * 4
  const rowGiven = puzzle.givens.slice(row, row + 4).find(n => n > 0)

  if (rowGiven !== undefined) {
    expect(clashes(placeDigit(selectCell(puzzle, blank), rowGiven).cells).has(blank)).toBe(true)
  }
})

test('a click on a prompt tile sends it as the person; the dots edit it', async ($, on) => {
  const sent: { text: string; asUser?: boolean }[] = []
  on('state.get', ($, e, next) => (e.key === 'prompts' ? SEEDED : next(e)))
  on('prompt.submit', (_, e) => {
    sent.push({ text: e.text, asUser: e.origin.kind === 'plugin' ? e.origin.asUser : undefined })

    return { text: e.text }
  })
  on('clock.after', () => ({ value: undefined }))

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.resize({ columns: HALF, rows: 3, in: 'tile-1' })
  await click(ui, 'tile-1', 6, 1)
  expect(sent).toEqual([{ text: 'Run the tests and fix any failures.', asUser: true }])

  // The mark at the end of the second line opens the editor instead.
  await click(ui, 'tile-1', HALF - 2, 2.2)
  expect(sent.length).toBe(1)
  expect(await ui.find({ key: 'title' })).toBeDefined()

  // A press that slides off before letting go does nothing.
  await ui.pointer({ type: 'down', x: 5, y: 1, fine: { x: 5, y: 1 }, button: 'left', in: 'tile-1' })
  await ui.pointer({ type: 'up', x: 5, y: 9, fine: { x: 5, y: 9 }, button: 'left', in: 'tile-1' })
  await settle()
  await ui.unmount()

  expect(sent.length).toBe(1)
})

test('the lit first tile sends too, through its own region', async ($, on) => {
  const sent: string[] = []
  on('state.get', ($, e, next) => (e.key === 'prompts' ? SEEDED : next(e)))
  on('prompt.submit', (_, e) => {
    sent.push(e.text)

    return { text: e.text }
  })
  on('clock.after', () => ({ value: undefined }))

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.resize({ columns: HALF, rows: 3, in: 'tile-0' })
  await click(ui, 'tile-0', 8, 1)
  await ui.unmount()

  expect(sent).toEqual(['Continue with the next step.'])
})

test('a refused send puts the prompt in the message box instead', async ($, on) => {
  const filled: string[] = []
  on('state.get', ($, e, next) => (e.key === 'prompts' ? SEEDED : next(e)))
  on('prompt.submit', () => ({ drop: 'busy' }))
  on('prompt.fill', (_, e) => {
    filled.push(e.text)

    return { isFilled: true }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('clock.after', () => ({ value: undefined }))

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.post({ press: 'send:0' }, { in: 'tile-0' })
  await settle()
  await ui.unmount()

  expect(filled).toEqual(['Continue with the next step.'])
})

test('the New prompt tile opens the editor, and Save writes the file', async ($, on) => {
  const writes: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('env.get', () => ({ value: '/home/t' }))
  on('fs.exists', () => ({ value: true }))
  on('fs.stat', () => ({ value: { kind: 'file', size: 10, mtimeMs: 7, isLink: false } }))
  on('fs.read', () => ({ value: serializePrompts(STARTER_INTRO, SAVED) }))
  on('fs.write', (_, e) => {
    writes.push(JSON.stringify(e))

    return { value: undefined }
  })
  on('store.get', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'prompts' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__prompt-deck__reload' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.every', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.resize({ columns: HALF, rows: 3, in: 'tile-2' })
  await click(ui, 'tile-2', 10, 1.5)
  await ui.input({ key: 'title', text: 'Ship it', kind: 'change' })
  await ui.input({ key: 'text', text: 'Commit, push and open a PR.', kind: 'change' })
  await ui.press({ key: 'save' })
  await ui.unmount()

  expect(writes.length).toBe(1)
  expect(writes[0]).toContain('/home/t/.claude/prompt-deck/prompts.md')
  expect(writes[0]).toContain('## Ship it')
  expect(writes[0]).toContain('## Continue')
})

test('one game card: a square plays, Swap flips it to sudoku, a square and a key fill it', async ($, on) => {
  const writes: string[] = []
  on('state.set', ($, e, next) => {
    if (e.key === 'game') {
      writes.push(JSON.stringify(e))
    }

    return next(e)
  })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.resize({ columns: C, rows: cardRows(C), in: 'game' })
  // The board is centred; squares are as big as the card allows, with gaps of 1 column and half a line.
  const d = dims(C)
  expect(d.tc).toBeGreaterThanOrEqual(11)
  expect(d.sc).toBeGreaterThanOrEqual(8)
  const x0 = Math.max(1, Math.floor((C - (3 * d.tc + 2)) / 2))
  await click(ui, 'game', x0 + (d.tc + 1) + d.tc / 2, 2.5 + (d.tr + 0.5) + d.tr / 2)
  // Your X lands in the centre square; Claude answers somewhere else.
  expect(writes.at(-1)).toMatch(/"board":\[("[XO]?",){4}"X"/)

  // Swap, the small round button at the header's right, turns the card to the other game.
  await click(ui, 'game', C - 2 - 2, 1)
  expect(writes.at(-1)).toContain('"kind":"sudoku"')
  await ui.advance(500)

  // The puzzle is random: find a square it leaves blank, then click it and the key 3.
  const saved = JSON.parse(writes.at(-1) ?? '{}') as { value: { value: { sudoku: { givens: number[] } } } }
  const blank = saved.value.value.sudoku.givens.indexOf(0)
  const s0 = Math.max(1, Math.floor((C - d.gridW) / 2))
  const before = writes.length
  await click(ui, 'game', s0 + (d.colAt[blank % 4] ?? 0) + d.sc / 2, 2.5 + (d.rowAt[Math.floor(blank / 4)] ?? 0) + d.sr / 2)
  await click(ui, 'game', s0 + 2 * (d.kw + 1) + d.kw / 2, 2.5 + d.gridH + 0.5 + d.sr / 2)
  await ui.unmount()

  expect(writes.length).toBe(before + 2)
  expect(writes.at(-2)).toContain(`"selected":${blank}`)
  expect(writes.at(-1)).toContain('"moves":1')
})

test('a click on a theme thumbnail sets that theme and keeps it, and its picture draws', async ($, on) => {
  const looks: string[] = []
  const stored: string[] = []
  on('theme.set', (_, e) => {
    looks.push(JSON.stringify(e))

    return { value: { isDrawn: true, requestId: 'r1' } }
  })
  on('store.set', (_, e) => {
    stored.push(JSON.stringify(e))

    return { value: undefined }
  })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const inner = C - 4
  const tw = Math.floor((inner - 4) / 5)
  const th = tw >= 12 ? 4 : 3
  await ui.resize({ columns: inner, rows: Math.floor(3 * (th + 1.5)), in: 'gallery' })
  // Mainframe is the second thumbnail of the second row.
  await click(ui, 'gallery', tw + 1 + tw / 2, th + 1.5 + th / 2)
  await ui.unmount()

  expect(looks.length).toBe(1)
  expect(looks[0]).toContain('"scene":"mainframe"')
  expect(looks[0]).toContain('"overrideColorScheme":"dark"')
  expect(stored[0]).toContain('mainframe')

  const backdrop = await $.ui.mount({
    plugin: 'prompt-deck',
    component: 'Backdrop',
    requestId: 'backdrop',
    surface: 'desktop',
    props: { scene: 'mainframe', plugin: 'prompt-deck', glass: { blur: 20, opacity: 0.8 } },
  })
  expect(await backdrop.find({ type: 'Svg' })).toBeDefined()
  await backdrop.unmount()
})

test('the header pills: New prompt opens the editor, the theme pill moves to the next theme', async ($, on) => {
  const looks: string[] = []
  on('theme.set', (_, e) => {
    looks.push(JSON.stringify(e))

    return { value: { isDrawn: true, requestId: 'r1' } }
  })
  on('store.set', () => ({ value: undefined }))

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.resize({ columns: 40, rows: 2, in: 'hero-pills' })
  // "+ New prompt" is 12 characters, so its pill is 16 columns wide; the theme pill follows after a gap of 1.
  await click(ui, 'hero-pills', 6, 1)
  expect(await ui.find({ key: 'title' })).toBeDefined()

  await click(ui, 'hero-pills', 16 + 1 + 4, 1)
  await ui.unmount()

  // From Claude's own look, the next is Marigold.
  expect(looks.length).toBe(1)
  expect(looks[0]).toContain('"scene":"marigold"')
})

test('without regions, the prompts are plain buttons that send', async ($, on) => {
  const sent: string[] = []
  on('state.get', ($, e, next) => (e.key === 'prompts' ? SEEDED : next(e)))
  on('prompt.submit', (_, e) => {
    sent.push(e.text)

    return { text: e.text }
  })
  on('clock.after', () => ({ value: undefined }))

  const ui = await $.ui.mount({ ...PANE, surface: 'mobile' })
  await ui.press({ key: 'send-1' })
  await ui.unmount()
  await settle()

  expect(sent).toEqual(['Run the tests and fix any failures.'])
})
