import type { ClientModule, ClientPointerEvent, ClientSurface } from 'claude-code'

// The theme gallery's clear layer: it lies over the picture thumbnails,
// draws the ring on the active and hovered one and their names, and tells
// which theme a click picked. Thumbnails sit in the same cells and lines.

type Item = { id: string; label: string; isActive: boolean }
type Props = { items: Item[]; perRow: number; tw: number; th: number; gap: number; accent: string }
type State = { over: string | null; down: string | null }

const REST: State = { over: null, down: null }
/** Lines under each thumbnail: its name, then a half-line gap. */
const BELOW = 1.5

const hit = (p: Props, s: ClientSurface<State>, e: ClientPointerEvent): string | null => {
  const x = e.fine?.x ?? e.x + 0.5
  const y = e.fine?.y ?? e.y + 0.5
  const col = Math.floor(x / (p.tw + p.gap))
  const row = Math.floor(y / (p.th + BELOW))
  const inX = x - col * (p.tw + p.gap) < p.tw
  const inY = y - row * (p.th + BELOW) < p.th + 1

  if (x < 0 || y < 0 || col >= p.perRow || !inX || !inY) {
    return null
  }

  return p.items[row * p.perRow + col]?.id ?? null
}

const Gallery: ClientModule<Props, State> = (p, s) => {
  const { Box, Text } = s.elements
  const st = s.state ?? REST

  s.onPointer(e => {
    const was = s.state ?? REST

    if (e.type === 'leave') {
      s.setState(REST)

      return
    }
    const id = hit(p, s, e)

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
      s.post({ press: `look:${id}` })
    }
    s.setState({ ...was, down: null })
  })

  const rows: Item[][] = []

  for (let k = 0; k < p.items.length; k += p.perRow) {
    rows.push(p.items.slice(k, k + p.perRow))
  }

  return (
    <Box width={s.columns} height={s.rows} flexDirection="column">
      {rows.map(row => (
        <Box flexDirection="column">
          <Box height={p.th} flexDirection="row" gap={p.gap}>
            {row.map(item => (
              <Box
                width={p.tw}
                height={p.th}
                borderStyle="round"
                borderColor={item.isActive ? p.accent : st.over === item.id ? `${p.accent}aa` : '#00000000'}
                alignItems="flex-end"
              >
                {item.isActive && (
                  <Box backgroundColor={p.accent} paddingX={1}>
                    <Text size="caption" weight="bold" color="#ffffff">
                      ✓
                    </Text>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
          <Box height={1} flexDirection="row" gap={p.gap}>
            {row.map(item => (
              <Box width={p.tw} justifyContent="center">
                <Text
                  size="caption"
                  weight={item.isActive ? 'bold' : 'semibold'}
                  wrap="truncate-end"
                  {...(item.isActive || st.over === item.id ? {} : { dimColor: true })}
                >
                  {item.label}
                </Text>
              </Box>
            ))}
          </Box>
          <Box height={BELOW - 1} />
        </Box>
      ))}
    </Box>
  )
}

export default Gallery
