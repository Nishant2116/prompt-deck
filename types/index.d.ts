export type SavedPrompt = { title: string; text: string }

/** The editor's card: `index` -1 is a new prompt; `isArmed` while Delete asks again. */
export type Editing = { index: number; title: string; text: string; isArmed: boolean } | null

export type LookId =
  | 'default'
  | 'marigold'
  | 'peach'
  | 'glacier'
  | 'sage'
  | 'pixel'
  | 'mainframe'
  | 'dusk'
  | 'space'
  | 'aurora'
  | 'lava'
  | 'tide'
  | 'city'

export type Mark = 'X' | 'O' | ''

export type Ttt = {
  board: Mark[]
  winner: 'X' | 'O' | 'draw' | null
  line: number[] | null
  starter: 'X' | 'O'
  score: { you: number; bot: number; draw: number }
}

export type Sudoku = {
  /** 16 cells, 0 where the puzzle leaves a blank. */
  givens: number[]
  cells: number[]
  selected: number | null
  isSolved: boolean
  moves: number
}

export type GameState = { kind: 'ttt' | 'sudoku'; ttt: Ttt; sudoku: Sudoku }

declare module 'claude-code' {
  interface PluginState {
    'prompt-deck': {
      prompts: Shaped<SavedPrompt[]>
      editing: Shaped<Editing>
      look: LookId
      sent: number | null
      game: Shaped<GameState>
    }
  }
}
