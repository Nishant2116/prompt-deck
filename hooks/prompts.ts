import type { SavedPrompt } from '../types'

// The prompts live in one Markdown file a person can edit by hand: each
// "## Title" line starts a prompt, and everything under it up to the next
// "## " line is the text sent. Text before the first heading is kept as is.
// A "## " inside a ``` fence belongs to the prompt, not a new heading.

export const STARTER_INTRO = `# Saved prompts

Each prompt starts with a line \`## Title\`. Everything under it, up to the next
\`## \` line, is the text sent to the chat when you click it in the pane.
Edit this file by hand or from the pane; the pane picks up changes in a few seconds.
`

export const STARTER: readonly SavedPrompt[] = [
  { title: 'Continue', text: 'Continue with the next step.' },
  { title: 'Summarise progress', text: "Summarise what changed and what's left." },
  { title: 'Run the tests', text: 'Run the tests and fix any failures.' },
  {
    title: 'Review my diff',
    text: 'Review the current diff for bugs, missed edge cases and anything that should be simpler. List findings most important first.',
  },
  { title: 'Explain simply', text: 'Explain what you just did in plain words, in five lines or fewer.' },
]

export type ParsedFile = { intro: string; prompts: SavedPrompt[] }

export const parsePrompts = (source: string): ParsedFile => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const intro: string[] = []
  const prompts: SavedPrompt[] = []
  let current: { title: string; body: string[] } | undefined
  let isFenced = false

  const flush = () => {
    if (current === undefined) {
      return
    }
    const text = current.body.join('\n').trim()

    if (current.title !== '' && text !== '') {
      prompts.push({ title: current.title, text })
    }
  }

  for (const line of lines) {
    const heading = isFenced ? null : /^##\s+(.+?)\s*#*\s*$/.exec(line)

    if (heading !== null) {
      flush()
      current = { title: heading[1] ?? '', body: [] }
      continue
    }

    if (/^\s*(```|~~~)/.test(line)) {
      isFenced = !isFenced
    }

    if (current === undefined) {
      intro.push(line)
    } else {
      current.body.push(line)
    }
  }
  flush()

  return { intro: intro.join('\n').trim(), prompts }
}

const oneLine = (title: string) => title.replace(/\s+/g, ' ').trim()

export const serializePrompts = (intro: string, prompts: readonly SavedPrompt[]): string => {
  const head = intro.trim() === '' ? STARTER_INTRO.trim() : intro.trim()
  const body = prompts.map(p => `## ${oneLine(p.title)}\n\n${p.text.trim()}\n`).join('\n')

  return `${head}\n\n${body}`
}
