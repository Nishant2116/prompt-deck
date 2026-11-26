import type { GameState, Mark, Sudoku, Ttt } from '../types'

// Two small games for while Claude works: tic-tac-toe against a bot that
// plays well but slips now and then, and a 4×4 sudoku (2×2 boxes, digits 1-4).

type Rand = () => number

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const

export const judge = (board: readonly Mark[]): { winner: Ttt['winner']; line: number[] | null } => {
  for (const line of LINES) {
    const [a, b, c] = line
    const mark = board[a]

    if (mark !== '' && mark !== undefined && mark === board[b] && mark === board[c]) {
      return { winner: mark, line: [...line] }
    }
  }

  return { winner: board.every(cell => cell !== '') ? 'draw' : null, line: null }
}

const pick = <T>(list: readonly T[], rand: Rand): T | undefined => list[Math.floor(rand() * list.length)]

const finishing = (board: readonly Mark[], mark: Mark): number | undefined => {
  for (const [a, b, c] of LINES) {
    const cells = [a, b, c]
    const mine = cells.filter(i => board[i] === mark).length
    const empty = cells.filter(i => board[i] === '')

    if (mine === 2 && empty.length === 1) {
      return empty[0]
    }
  }

  return undefined
}

/** The bot's cell: win, block, centre, corner, side; one move in five is a slip. */
export const botMove = (board: readonly Mark[], rand: Rand = Math.random): number | undefined => {
  const empty = board.flatMap((cell, i) => (cell === '' ? [i] : []))

  if (empty.length === 0) {
    return undefined
  }

  if (rand() < 0.2) {
    return pick(empty, rand)
  }
  const win = finishing(board, 'O')

  if (win !== undefined) {
    return win
  }
  const block = finishing(board, 'X')

  if (block !== undefined) {
    return block
  }

  if (board[4] === '') {
    return 4
  }
  const corners = [0, 2, 6, 8].filter(i => board[i] === '')

  return pick(corners.length > 0 ? corners : empty, rand)
}

const scored = (game: Ttt): Ttt => {
  const { winner, line } = judge(game.board)

  if (winner === null) {
    return { ...game, winner, line }
  }
  const score = { ...game.score }

  if (winner === 'X') {
    score.you += 1
  } else if (winner === 'O') {
    score.bot += 1
  } else {
    score.draw += 1
  }

  return { ...game, winner, line, score }
}

export const newTtt = (previous?: Ttt, rand: Rand = Math.random): Ttt => {
  const starter = previous === undefined ? 'X' : previous.starter === 'X' ? 'O' : 'X'
  const board: Mark[] = Array.from({ length: 9 }, () => '')

  if (starter === 'O') {
    const first = botMove(board, rand)

    if (first !== undefined) {
      board[first] = 'O'
    }
  }

  return {
    board,
    winner: null,
    line: null,
    starter,
    score: previous?.score ?? { you: 0, bot: 0, draw: 0 },
  }
}

/** You play X at `cell`; the bot answers at once. */
export const playTtt = (game: Ttt, cell: number, rand: Rand = Math.random): Ttt => {
  if (game.winner !== null || game.board[cell] !== '') {
    return game
  }
  const board = [...game.board]
  board[cell] = 'X'
  const afterYou = scored({ ...game, board })

  if (afterYou.winner !== null) {
    return afterYou
  }
  const reply = botMove(board, rand)

  if (reply !== undefined) {
    board[reply] = 'O'
  }

  return scored({ ...afterYou, board })
}

// Mini sudoku, 4×4: rows, columns and the four 2×2 boxes each hold 1-4.

const BASE = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1]

const shuffle = <T>(list: readonly T[], rand: Rand): T[] => {
  const out = [...list]

  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const swap = out[i] as T
    out[i] = out[j] as T
    out[j] = swap
  }

  return out
}

export const peers = (i: number): number[] => {
  const row = Math.floor(i / 4)
  const col = i % 4
  const box = [Math.floor(row / 2) * 2, Math.floor(col / 2) * 2] as const
  const out = new Set<number>()

  for (let k = 0; k < 4; k += 1) {
    out.add(row * 4 + k)
    out.add(k * 4 + col)
  }

  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < 2; c += 1) {
      out.add((box[0] + r) * 4 + box[1] + c)
    }
  }
  out.delete(i)

  return [...out]
}

const countSolutions = (cells: number[], limit = 2): number => {
  const at = cells.indexOf(0)

  if (at < 0) {
    return 1
  }
  let found = 0

  for (let n = 1; n <= 4 && found < limit; n += 1) {
    if (peers(at).every(p => cells[p] !== n)) {
      cells[at] = n
      found += countSolutions(cells, limit - found)
      cells[at] = 0
    }
  }

  return found
}

/** A fresh puzzle with one solution and about six givens. */
export const newSudoku = (rand: Rand = Math.random): Sudoku => {
  const digits = shuffle([1, 2, 3, 4], rand)
  const rows = shuffle([0, 1], rand).flatMap(band => shuffle([0, 1], rand).map(r => band * 2 + r))
  const cols = shuffle([0, 1], rand).flatMap(stack => shuffle([0, 1], rand).map(c => stack * 2 + c))
  const isTurned = rand() < 0.5
  const solution = Array.from({ length: 16 }, (_, i) => {
    const r = rows[Math.floor(i / 4)] ?? 0
    const c = cols[i % 4] ?? 0
    const from = isTurned ? c * 4 + r : r * 4 + c

    return digits[(BASE[from] ?? 1) - 1] ?? 1
  })
  const givens = [...solution]

  for (const i of shuffle(Array.from({ length: 16 }, (_, k) => k), rand)) {
    const kept = givens[i] ?? 0
    givens[i] = 0

    if (countSolutions([...givens]) !== 1 || givens.filter(n => n > 0).length < 5) {
      givens[i] = kept
    }
  }

  return { givens, cells: [...givens], selected: null, isSolved: false, moves: 0 }
}

/** Cells whose digit repeats in a row, column or box. */
export const clashes = (cells: readonly number[]): Set<number> => {
  const out = new Set<number>()

  cells.forEach((n, i) => {
    if (n > 0 && peers(i).some(p => cells[p] === n)) {
      out.add(i)
    }
  })

  return out
}

export const selectCell = (game: Sudoku, cell: number): Sudoku =>
  game.isSolved || (game.givens[cell] ?? 0) > 0 ? game : { ...game, selected: cell }

/** Puts `n` (0 clears) in the selected cell. */
export const placeDigit = (game: Sudoku, n: number): Sudoku => {
  const at = game.selected

  if (game.isSolved || at === null || (game.givens[at] ?? 0) > 0) {
    return game
  }
  const cells = [...game.cells]
  cells[at] = n
  const isSolved = cells.every(c => c > 0) && clashes(cells).size === 0

  return { ...game, cells, isSolved, moves: game.moves + 1, selected: isSolved ? null : at }
}

export const newGame = (rand: Rand = Math.random): GameState => ({
  kind: 'ttt',
  ttt: newTtt(undefined, rand),
  sudoku: newSudoku(rand),
})
