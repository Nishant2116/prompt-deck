import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register, Timer } from 'claude-code'

import type { LookId, SavedPrompt } from '../types'
import { glassArt, heroArt, litArt, thumbArt } from './art'
import { clashes, newGame, newSudoku, newTtt, placeDigit, playTtt, selectCell } from './games'
import { LOOKS, LOOK_ORDER, backdropOf, isLookId, lookOf, themeOf } from './looks'
import { STARTER, STARTER_INTRO, parsePrompts, serializePrompts } from './prompts'
import { cardRows } from './game'

const PLUGIN = 'prompt-deck'
const PANE = 'prompt-deck'
const TITLE = 'Prompt Deck'
const POLL_MS = 2500
const SENT_MS = 1800

// The bento grid, in the pane's own cells (columns) and text lines (rows).
// Every clickable tile is a Client sized in lines, so the app stretches its
// region over the whole tile and clicks land where they are drawn.
const GAP_X = 2
const HERO_H = 8
const TILE_H = 3
const THUMB_GAP = 1
const BELOW_THUMB = 1.5
const SCROLLBAR = 2

// Change a shape tag when that value's fields change: it declines what an
// earlier version stored, which outlives a reload.
const prompts = atom({ plugin: 'prompt-deck', key: 'prompts' } as const, [], { shape: 'prompts-1' })
const editing = atom({ plugin: 'prompt-deck', key: 'editing' } as const, null, { shape: 'editing-1' })
const look = atom({ plugin: 'prompt-deck', key: 'look' } as const, 'default')
const sent = atom({ plugin: 'prompt-deck', key: 'sent' } as const, null)
const game = atom({ plugin: 'prompt-deck', key: 'game' } as const, newGame(), { shape: 'game-1' })

// Module variables start over on a reload; everything drawn lives in $.state.
const mod: {
  filePath: string
  shownPath: string
  intro: string
  lastMtime: number
  isBusy: boolean
  draft: { title?: string; text?: string }
  poller: Timer | undefined
  sentTimer: Timer | undefined
} = {
  filePath: '',
  shownPath: '~/.claude/prompt-deck/prompts.md',
  intro: STARTER_INTRO,
  lastMtime: -1,
  isBusy: false,
  draft: {},
  poller: undefined,
  sentTimer: undefined,
}

async function writeFile($: Engine, list: readonly SavedPrompt[]) {
  await $.fs.write(mod.filePath, serializePrompts(mod.intro, list))
  mod.lastMtime = (await $.fs.stat(mod.filePath)).mtimeMs
}

async function applyLook($: Engine, id: LookId) {
  const theme = themeOf(id)

  if (theme === undefined) {
    await $.theme.clear()

    return
  }

  try {
    await $.theme.set(theme.args)
  } catch (error) {
    // An older app that takes no `style`: the colors and picture alone.
    $.ui.log(`prompt-deck: ${String(error)}`)
    await $.theme.set(theme.bare)
  }
}

async function poll($: Engine) {
  const stat = await $.fs.stat(mod.filePath).catch(() => undefined)

  if (stat === undefined) {
    // Deleted by hand: start again from the starter set.
    mod.intro = STARTER_INTRO
    await writeFile($, STARTER)
    await update($, prompts, () => [...STARTER])

    return
  }

  if (stat.mtimeMs !== mod.lastMtime) {
    mod.lastMtime = stat.mtimeMs
    const parsed = parsePrompts(await $.fs.read(mod.filePath))
    mod.intro = parsed.intro
    await update($, prompts, () => parsed.prompts)
  }

  // A look picked in another session reaches this one too.
  const stored = await $.store.get('look')
  const current = await read($, look)

  if (isLookId(stored) && stored !== current) {
    await update($, look, () => stored)
    await applyLook($, stored)
  }
}

async function send($: Engine, index: number) {
  const prompt = (await read($, prompts))[index]

  if (prompt === undefined) {
    return
  }

  if (mod.isBusy) {
    $.ui.toast(`"${prompt.title}" is queued. It sends when Claude finishes.`)
  }
  await update($, sent, () => index)
  mod.sentTimer?.cancel()
  mod.sentTimer = $.clock.after(SENT_MS, () => {
    update($, sent, now => (now === index ? null : now)).catch(() => undefined)
  })

  try {
    const result = await $.prompt.submit({ text: prompt.text, asUser: true })

    if (result.drop !== undefined) {
      throw new Error('dropped')
    }
  } catch {
    const filled = await $.prompt.fill({ text: prompt.text }).catch(() => undefined)
    $.ui.toast(
      filled?.isFilled === true
        ? `"${prompt.title}" is in the message box. Press Enter to send.`
        : `Couldn't send "${prompt.title}".`,
    )
  }
}

async function startEdit($: Engine, index: number) {
  const list = await read($, prompts)
  const prompt = list[index]
  mod.draft = {}
  await update($, editing, () =>
    prompt === undefined
      ? { index: -1, title: '', text: '', isArmed: false }
      : { index, title: prompt.title, text: prompt.text, isArmed: false },
  )
}

async function save($: Engine) {
  const open = await read($, editing)

  if (open === null) {
    return
  }
  const title = (mod.draft.title ?? open.title).trim()
  const text = (mod.draft.text ?? open.text).trim()

  if (title === '' || text === '') {
    $.ui.toast('A prompt needs a title and some text.')

    return
  }
  const list = await read($, prompts)
  const next =
    open.index < 0 || open.index >= list.length
      ? [...list, { title, text }]
      : list.map((one, i) => (i === open.index ? { title, text } : one))
  await writeFile($, next)
  await update($, prompts, () => next)
  await update($, editing, () => null)
  mod.draft = {}
}

async function remove($: Engine) {
  const open = await read($, editing)

  if (open === null || open.index < 0) {
    return
  }

  if (!open.isArmed) {
    await update($, editing, now => (now === null ? null : { ...now, isArmed: true }))

    return
  }
  const list = await read($, prompts)
  const next = list.filter((_, i) => i !== open.index)
  await writeFile($, next)
  await update($, prompts, () => next)
  await update($, editing, () => null)
  mod.draft = {}
}

async function cancel($: Engine) {
  mod.draft = {}
  await update($, editing, () => null)
}

async function pickLook($: Engine, id: LookId) {
  await update($, look, () => id)
  await $.store.set('look', id)
  await applyLook($, id)
}

/** What a press on a tile does, by the id the tile reported. */
async function act($: Engine, id: string) {
  const [kind, arg = ''] = id.split(':')
  const n = Number(arg)

  if (kind === 'new') {
    await startEdit($, -1)
  } else if (kind === 'send') {
    await send($, n)
  } else if (kind === 'edit') {
    await startEdit($, n)
  } else if (kind === 'ttt') {
    await update($, game, g => ({ ...g, kind: 'ttt' as const, ttt: arg === 'new' ? newTtt(g.ttt) : playTtt(g.ttt, n) }))
  } else if (kind === 'sdk') {
    await update($, game, g => ({
      ...g,
      kind: 'sudoku' as const,
      sudoku: arg === 'new' ? newSudoku() : selectCell(g.sudoku, n),
    }))
  } else if (kind === 'game' && arg === 'swap') {
    await update($, game, g => ({ ...g, kind: g.kind === 'ttt' ? ('sudoku' as const) : ('ttt' as const) }))
  } else if (kind === 'num') {
    await update($, game, g => ({ ...g, kind: 'sudoku' as const, sudoku: placeDigit(g.sudoku, n) }))
  } else if (kind === 'look' && isLookId(arg)) {
    await pickLook($, arg)
  } else if (kind === 'theme') {
    // The header's theme pill: on to the next theme in the gallery's order.
    const current = await read($, look)
    const at = LOOK_ORDER.indexOf(current)
    await pickLook($, LOOK_ORDER[(at + 1) % LOOK_ORDER.length] ?? 'default')
  }
}

/** Near-black or white, whichever reads better on a solid `hex` fill. */
const readableOn = (hex: string) => (contrast(hex, '#ffffff') >= contrast(hex, '#101014') ? '#ffffff' : '#101014')

function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const n = Number.parseInt(hex.slice(1, 7), 16)
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = v / 255

      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }) as [number, number, number]

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number]

  return (x + 0.05) / (y + 0.05)
}

/** Short prompt text for a tile, on one line. */
const preview = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim()

  return flat.length > 160 ? `${flat.slice(0, 159).trimEnd()}…` : flat
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? ''
      mod.filePath = `${home}/.claude/prompt-deck/prompts.md`
      mod.shownPath = home === '' ? mod.filePath : '~/.claude/prompt-deck/prompts.md'

      if (!(await $.fs.exists(mod.filePath))) {
        mod.intro = STARTER_INTRO
        await writeFile($, STARTER)
      }
      mod.lastMtime = -1
      await poll($)

      const stored = await $.store.get('look')
      const id = isLookId(stored) ? stored : 'default'
      await update($, look, () => id)

      if (id !== 'default') {
        await applyLook($, id)
      }
      await $.command.register({ name: 'prompts', description: 'Open the Prompt Deck pane' })

      // While the mod is being built in a session's mods folder only: a tool
      // that reloads the latest code, so a change can be seen without a new turn.
      if ($.plugin.root.includes('/dev-mods/')) {
        await $.tool.register({
          name: 'reload',
          description: 'Reload Prompt Deck from its files (development only).',
          inputSchema: { type: 'object', properties: {} },
          isDeferred: false,
        })
      }
      void $.ui.open({ id: PANE, title: TITLE, columns: 60 })

      mod.poller?.cancel()
      mod.poller = $.clock.every(POLL_MS, () => {
        poll($).catch(() => undefined)
      })
    } catch (error) {
      $.ui.log(`prompt-deck: ${String(error)}`)
    }

    return next(e)
  })

  on('command.run', { command: 'prompts' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE, columns: 60 })

    return { text: 'Prompt Deck opened.' }
  })

  on('tool.run', { tool: 'mcp__prompt-deck__reload' as never }, async () => ({ result: 'Reloaded.' }))

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) {
      mod.isBusy = true
    }

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      mod.isBusy = false
    }

    return next(e)
  })

  // Each tile's region reports its own presses here.
  on('ui.message', async ($, e, next) => {
    const data = e.data

    if (typeof data === 'object' && data !== null && 'press' in data && typeof data.press === 'string') {
      await act($, data.press)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    const scene = e.props.plugin === PLUGIN ? backdropOf(e.props.scene) : undefined

    if (scene === undefined || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={scene.source} alt={scene.alt} isInteractive />
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const list = await read($, prompts)
    const open = await read($, editing)
    const lookId = await read($, look)
    const lk = lookOf(lookId)
    const accent = lk.accent

    // Minimized to a widget: titles at a glance, nothing to press.
    if (e.props.placement === 'widget') {
      return (
        <Box flexDirection="column" gap="xs" padding="sm">
          <Text size="footnote" weight="semibold">
            {TITLE}
          </Text>
          {list.slice(0, 4).map(prompt => (
            <Text size="footnote" dimColor wrap="truncate-end">
              {prompt.title}
            </Text>
          ))}
        </Box>
      )
    }

    const editor =
      open === null ? null : (
        <Box key="editor" flexDirection="column" gap="sm" borderStyle="round" borderColor={accent} padding="md">
          <Text weight="semibold">{open.index < 0 ? 'New prompt' : 'Edit prompt'}</Text>
          <Input
            key="title"
            placeholder="Short title, like Continue"
            value={open.title}
            autoFocus
            submitLabel="save"
            onInput={value => {
              mod.draft.title = value
            }}
            onSubmit={value => {
              mod.draft.title = value

              return save($)
            }}
          />
          <Input
            key="text"
            placeholder="The prompt to send"
            rows={5}
            value={open.text}
            submitLabel="save"
            onInput={value => {
              mod.draft.text = value
            }}
            onSubmit={value => {
              mod.draft.text = value

              return save($)
            }}
          />
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            <Button key="save" variant="primary" label="Save" onPress={() => save($)} />
            <Button key="cancel" label="Cancel" onPress={() => cancel($)} />
            {open.index >= 0 && (
              <Button
                key="delete"
                label={open.isArmed ? 'Press again to delete' : 'Delete'}
                dimColor={!open.isArmed}
                onPress={() => remove($)}
              />
            )}
          </Box>
        </Box>
      )

    if (e.surface === 'desktop') {
      const { Svg, Client } = $.ui.resolve(e)
      // The pane's scrollbar takes about two columns of the width it reports.
      const C = Math.max(30, (e.props.bodyColumns ?? 60) - SCROLLBAR)
      const isTwoUp = C >= 48
      const half = isTwoUp ? Math.floor((C - GAP_X) / 2) : C
      const g = await read($, game)
      const sentIndex = await read($, sent)

      // The header tile: the look's picture, clipped, with its words on top.
      const hero = lk.hero
      const heroInk =
        hero.kind === 'gradient' ? hero.ink : hero.ink.light === hero.ink.dark ? hero.ink.light : 'text'
      const heroSoft =
        hero.kind === 'gradient' ? hero.soft : hero.soft.light === hero.soft.dark ? hero.soft.light : 'text'
      const onAccent = readableOn(accent)
      // A picture over the whole tile, its words and buttons on a layer above.
      // A rounded border brings its own inner padding on the desktop, so the
      // picture is pinned to the tile's edges on a layer of its own.
      const pinned = (w: number | string, rows: number, art: string, alt: string) => (
        <Box position="absolute" top={0} left={0} width={w} height={rows} overflow="hidden" flexDirection="column">
          <Svg source={art} alt={alt} />
        </Box>
      )
      const onArt = (key: string, w: number, rows: number, art: string, alt: string, top: JSX.Element) => (
        <Box key={key} width={w} height={rows} borderStyle="round" borderColor="#00000000" overflow="hidden" flexDirection="column">
          {pinned(w, rows, art, alt)}
          <Box position="absolute" top={0} left={0} width={w} height={rows}>
            {top}
          </Box>
        </Box>
      )
      const header = (
        <Box key="hero" width={C} height={HERO_H} borderStyle="round" borderColor={`${accent}44`} overflow="hidden" flexDirection="column">
          {pinned(C, HERO_H, heroArt(lookId), `${lk.label}: ${lk.tagline}`)}
          <Box
            position="absolute"
            top={0}
            left={0}
            width={C}
            height={HERO_H}
            flexDirection="column"
            justifyContent="space-between"
            paddingX="lg"
            paddingY="md"
          >
            <Box flexDirection="column">
              <Text size="caption" weight="bold" color={heroSoft}>
                PROMPT DECK
              </Text>
              <Text size="title" weight="bold" color={heroInk}>
                Quick prompts
              </Text>
              <Text size="footnote" weight="medium" color={heroSoft}>
                {list.length === 0 ? 'Nothing saved yet' : `${list.length} saved · tap one to send`}
              </Text>
            </Box>
            <Client
              key="hero-pills"
              module="./pills.tsx"
              props={{
                pills: [
                  { id: 'new', label: '+ New prompt', isPrimary: true },
                  { id: 'theme', label: `${lk.label} ›`, isPrimary: false },
                ],
                accent,
                onAccent,
                ink: heroInk === 'text' ? accent : heroInk,
              }}
              width={Math.min(C - 6, 40)}
              height={2}
            />
          </Box>
        </Box>
      )

      // Prompt tiles, then the "New prompt" tile, two to a row.
      const tile = (i: number) => {
        const prompt = list[i]
        const isLit = i === 0 && prompt !== undefined
        const props = {
          kind: prompt === undefined ? ('new' as const) : ('prompt' as const),
          index: i,
          title: prompt?.title ?? '',
          preview: prompt === undefined ? '' : preview(prompt.text),
          isLit,
          isSent: sentIndex === i,
          accent,
          onAccent,
          ink: isLit ? lk.feature.ink : null,
        }
        const region = <Client key={`tile-${i}`} module="./tile.tsx" props={props} width={half} height={TILE_H} />

        if (prompt === undefined) {
          return region
        }

        return onArt(
          `art-${i}`,
          half,
          TILE_H,
          isLit ? litArt(lookId) : glassArt(lookId, i),
          isLit ? `${prompt.title}, highlighted` : prompt.title,
          region,
        )
      }
      const count = list.length + 1
      const perRow = isTwoUp ? 2 : 1
      const tileRows: number[][] = []

      for (let i = 0; i < count; i += perRow) {
        tileRows.push(Array.from({ length: Math.min(perRow, count - i) }, (_, k) => i + k))
      }

      // The game card: one face at a time, flipped by its Swap button.
      const GAME_H = cardRows(C)
      const gameCard = onArt(
        'game-art',
        C,
        GAME_H,
        glassArt(lookId, 2, 'square'),
        g.kind === 'ttt' ? 'Tic-tac-toe board' : 'Mini sudoku board',
        <Client
          key="game"
          module="./game.tsx"
          props={{
            kind: g.kind,
            accent,
            onAccent,
            accent2: lk.accent2,
            danger: '#e5484d',
            ttt: g.ttt,
            sudoku: g.sudoku,
            clashes: [...clashes(g.sudoku.cells)],
          }}
          width={C}
          height={GAME_H}
        />,
      )

      // The theme gallery: thumbnails below, a clear layer above that rings
      // the active one and takes the click.
      const inner = C - 4
      const thumbsPerRow = inner >= 52 ? 5 : inner >= 38 ? 4 : 3
      const tw = Math.floor((inner - THUMB_GAP * (thumbsPerRow - 1)) / thumbsPerRow)
      const th = tw >= 12 ? 4 : 3
      const items = LOOKS.map(one => ({ id: one.id, label: one.label, isActive: one.id === lookId }))
      const thumbRows: (typeof items)[] = []

      for (let k = 0; k < items.length; k += thumbsPerRow) {
        thumbRows.push(items.slice(k, k + thumbsPerRow))
      }
      const galleryH = thumbRows.length * (th + BELOW_THUMB)
      const gallery = (
        <Box key="themes" width={C} borderStyle="round" borderColor={`${accent}30`} backgroundColor={`${accent}0d`} flexDirection="column" paddingX={2} paddingY="sm">
          <Box height={2} flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text size="heading" weight="bold">
              Theme <Text dimColor>· {lk.label}</Text>
            </Text>
            {inner >= 44 && (
              <Text size="footnote" dimColor>
                Restyles the whole app
              </Text>
            )}
          </Box>
          <Box key="grid" height={galleryH} flexDirection="column">
            {thumbRows.map(row => (
              <Box flexDirection="column">
                <Box height={th} flexDirection="row" gap={THUMB_GAP}>
                  {row.map(item => (
                    <Box width={tw} height={th} borderStyle="round" borderColor="#00000000" overflow="hidden" flexDirection="column">
                      {pinned(tw, th, thumbArt(item.id), item.label)}
                    </Box>
                  ))}
                </Box>
                <Box height={BELOW_THUMB} />
              </Box>
            ))}
            <Box position="absolute" top={0} left={0} width={inner} height={galleryH}>
              <Client
                key="gallery"
                module="./gallery.tsx"
                props={{ items, perRow: thumbsPerRow, tw, th, gap: THUMB_GAP, accent }}
                width={inner}
                height={galleryH}
              />
            </Box>
          </Box>
        </Box>
      )

      return (
        <Box flexDirection="column">
          {editor}
          {editor !== null && <Box height={1} />}
          {header}
          <Box height={1} />
          {tileRows.map(row => (
            <Box flexDirection="column">
              <Box height={TILE_H} flexDirection="row" gap={GAP_X}>
                {row.map(i => tile(i))}
              </Box>
              <Box height={1} />
            </Box>
          ))}
          {gameCard}
          <Box height={1} />
          {gallery}
          <Box height={1} />
          <Text dimColor size="caption">
            Your prompts also live in {mod.shownPath}, editable by hand.
          </Text>
        </Box>
      )
    }

    // Surfaces without regions of their own: the same prompts as plain buttons.
    return (
      <Box flexDirection="column" gap="sm">
        {editor}
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={accent}>
            {TITLE}
          </Text>
          <Button key="new" label="+ New" hotkey="n" onPress={() => startEdit($, -1)} />
        </Box>
        {list.map((prompt, i) => (
          <Box key={`row-${i}`} flexDirection="row" gap={1}>
            <Button
              key={`send-${i}`}
              label={prompt.title}
              {...(i < 9 ? { hotkey: String(i + 1) } : {})}
              onPress={() => {
                void send($, i)
              }}
            />
            <Button key={`edit-${i}`} plain dimColor label="Edit" onPress={() => startEdit($, i)} />
          </Box>
        ))}
        <Text dimColor>Editable by hand: {mod.shownPath}</Text>
      </Box>
    )
  })
}
