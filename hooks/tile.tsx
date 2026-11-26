import type { ClientModule, ClientPointerEvent, ClientSurface } from 'claude-code'

// One prompt chip (or the "New prompt" chip), drawn and clicked in its own
// region over its glass picture. A click sends the prompt; a click on the
// mark at the end of its second line edits it. The region is sized in text
// lines, so every position here is in the same cells the pointer reports.

type Props = {
  kind: 'prompt' | 'new'
  index: number
  title: string
  preview: string
  isLit: boolean
  isSent: boolean
  accent: string
  /** Text that reads on a solid accent fill. */
  onAccent: string
  /** Ink for a lit chip, drawn over its gradient; absent, the theme's text. */
  ink: string | null
}
type State = { isOver: boolean; isDown: boolean; zone: string | null }

const REST: State = { isOver: false, isDown: false, zone: null }
/** The edit mark's corner: the last columns of the chip's second line. */
const EDIT_COLUMNS = 7
const EDIT_ROWS = 1.5

const zoneOf = (p: Props, s: ClientSurface<State>, e: ClientPointerEvent): string | null => {
  const x = e.fine?.x ?? e.x + 0.5
  const y = e.fine?.y ?? e.y + 0.5

  if (x < 0 || y < 0 || x > s.columns || y > s.rows) {
    return null
  }

  if (p.kind === 'new') {
    return 'new'
  }

  return x >= s.columns - EDIT_COLUMNS && y >= s.rows - EDIT_ROWS ? `edit:${p.index}` : `send:${p.index}`
}

const Tile: ClientModule<Props, State> = (p, s) => {
  const { Box, Text } = s.elements
  const st = s.state ?? REST

  s.onPointer(e => {
    const was = s.state ?? REST

    if (e.type === 'leave') {
      s.setState(REST)

      return
    }
    const zone = zoneOf(p, s, e)

    if (e.type === 'enter' || e.type === 'move') {
      if (!was.isOver || zone !== was.zone) {
        s.setState({ ...was, isOver: zone !== null, zone })
      }

      return
    }

    if (e.type === 'down') {
      if (e.button === 'left') {
        s.setState({ ...was, isDown: true, zone })
      }

      return
    }

    if (was.isDown && zone !== null && zone === was.zone) {
      s.post({ press: zone })
    }
    s.setState({ ...was, isDown: false })
  })

  if (p.kind === 'new') {
    return (
      <Box
        width={s.columns}
        height={s.rows}
        borderStyle="dashed"
        borderColor={st.isOver ? p.accent : `${p.accent}70`}
        backgroundColor={st.isOver ? `${p.accent}1f` : `${p.accent}0a`}
        paddingX="md"
        paddingY={0}
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap={1}
      >
        <Text weight="bold" color={p.accent}>
          +
        </Text>
        <Text size="footnote" weight="semibold" {...(st.isOver ? { color: p.accent } : { dimColor: true })}>
          New prompt
        </Text>
      </Box>
    )
  }
  const isEdit = st.zone === `edit:${p.index}`
  const isSend = st.isOver && !isEdit
  const ink = p.ink ?? undefined
  // A lit chip keeps a faint fill of its own, so its words read even before its picture draws.
  const fill = p.isLit ? `${p.accent}40` : isSend ? `${p.accent}1c` : undefined
  const ring = isSend ? (p.isLit ? (ink ?? p.accent) : p.accent) : '#00000000'
  const tone = p.isLit ? (ink ?? p.accent) : p.accent

  return (
    <Box
      width={s.columns}
      height={s.rows}
      borderStyle="round"
      borderColor={ring}
      {...(fill === undefined ? {} : { backgroundColor: fill })}
      flexDirection="column"
      justifyContent="center"
      paddingX="md"
      paddingY={0}
    >
      <Box height={1} flexDirection="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Box flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
          <Text weight="bold" wrap="truncate-end" {...(ink === undefined ? {} : { color: ink })}>
            {p.title}
          </Text>
        </Box>
        <Box flexShrink={0}>
          <Text weight="bold" color={tone}>
            {isSend ? '↗ send' : '↗'}
          </Text>
        </Box>
      </Box>
      <Box height={1} flexDirection="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Box flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
          <Text size="caption" wrap="truncate-end" {...(ink === undefined ? { dimColor: true } : { color: ink })}>
            {p.preview}
          </Text>
        </Box>
        <Box flexShrink={0}>
        {p.isSent ? (
          <Text size="caption" weight="bold" color={tone}>
            Sent ✓
          </Text>
        ) : (
          <Text
            size="caption"
            weight="bold"
            {...(isEdit ? { color: tone } : ink === undefined ? { dimColor: true } : { color: ink })}
          >
            {isEdit ? 'Edit' : '•••'}
          </Text>
        )}
        </Box>
      </Box>
    </Box>
  )
}

export default Tile
