import type { ClientModule, ClientPointerEvent, ClientSurface } from 'claude-code'

// A row of pill buttons over a picture: the solid one is the action, the
// glass ones are quieter. Each pill is as wide as its words plus room, so a
// click is matched by the same widths the row is drawn with.

type Pill = { id: string; label: string; isPrimary: boolean }
type Props = { pills: Pill[]; accent: string; onAccent: string; ink: string }
type State = { over: string | null; down: string | null }

const REST: State = { over: null, down: null }
const GAP = 1

const widthOf = (pill: Pill) => [...pill.label].length + 4

const hit = (p: Props, s: ClientSurface<State>, e: ClientPointerEvent): string | null => {
  const x = e.fine?.x ?? e.x + 0.5
  const y = e.fine?.y ?? e.y + 0.5

  if (y < 0 || y > s.rows) {
    return null
  }
  let left = 0

  for (const pill of p.pills) {
    const w = widthOf(pill)

    if (x >= left && x < left + w) {
      return pill.id
    }
    left += w + GAP
  }

  return null
}

const Pills: ClientModule<Props, State> = (p, s) => {
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
      s.post({ press: id })
    }
    s.setState({ ...was, down: null })
  })

  return (
    <Box width={s.columns} height={s.rows} flexDirection="row" gap={GAP} alignItems="center">
      {p.pills.map(pill => {
        const isOver = st.over === pill.id

        return (
          <Box
            width={widthOf(pill)}
            borderStyle="round"
            borderColor={pill.isPrimary ? p.accent : isOver ? p.ink : `${p.ink}55`}
            backgroundColor={pill.isPrimary ? (isOver ? `${p.accent}dd` : p.accent) : isOver ? `${p.ink}33` : `${p.ink}1a`}
            justifyContent="center"
          >
            <Text weight="bold" color={pill.isPrimary ? p.onAccent : p.ink}>
              {pill.label}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}

export default Pills
