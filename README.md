<img src=".claude-plugin/icon.png" alt="Prompt Deck icon" width="96">

# Prompt Deck

A bento-style widget beside the chat in the Claude desktop app: your saved prompts as tiles you tap to send, a game card for while Claude works, and thirteen moving themes that restyle the whole app.

- **Tap a tile to send.** Each saved prompt is a compact chip with its title and the start of its text. Tapping it sends the prompt to the session you are looking at, as if you typed it and pressed Enter. While Claude is busy, it waits and sends when the turn ends. The tile shows **Sent ✓** for a moment.
- **Add, edit, delete:** **New prompt** in the header tile or the dashed tile; **•••** on a tile to edit or delete it.
- **Plain file you can edit by hand:** `~/.claude/prompt-deck/prompts.md`. The widget picks up changes within a few seconds.
- **Game card:** tic-tac-toe against Claude (it plays well but slips now and then) on one face and a 4×4 mini sudoku on the other, with squares as big as the pane allows. The round **⇄** button in its header switches games with a wave of light across the new board; every move glints, and Claude's reply lands a beat after yours.
- **Moving themes:** Claude, Marigold, Peach Haze, Glacier, Sage, Pixel Quest (drifting clouds, bobbing coins), Mainframe (glyph rain), Lo-fi Dusk (falling petals), Deep Space (drifting stars, a shooting star), Aurora (swaying northern lights), Lava Lamp (molten blobs), Ocean Tide (rolling waves) and Neon City (sky traffic, flickering windows). Each sets the app's colors, message bubbles and a moving background the panels frost over, and the widget's header plays the same scene. Motion is slow and stops when your system asks for reduced motion. Your pick carries over to new sessions. The theme pill in the header steps to the next theme.
- `/prompts` reopens the pane if you close it.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install prompt-deck --marketplace Nishant2116/prompt-deck
```

Answer `y` to add the marketplace, then press Enter for the user scope.

From a shell:

```bash
claude plugin install prompt-deck --marketplace Nishant2116/prompt-deck
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `Nishant2116/prompt-deck`, then **Add plugin**.

The pane opens in each new session. In a session that was already open, run `/reload-plugins`.

## The prompts file

```markdown
# Saved prompts

## Continue

Continue with the next step.

## Run the tests

Run the tests and fix any failures.
```

Each `## Title` line starts a prompt. Everything under it, up to the next `## ` line, is the text that gets sent, and it can span several lines. Text above the first heading is kept as notes. A `## ` line inside a code fence stays part of the prompt. Delete the file and the pane writes the five starter prompts again.

## Where it works

The widget and themes draw in the Claude desktop app's Code tab. A terminal session's fullscreen layout and the phone apps show the same prompts as plain buttons, without the games or themes.

## License

MIT
