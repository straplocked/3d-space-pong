# Controls

## Keyboard

| Context | Player | Up | Down | Other |
| --- | --- | --- | --- | --- |
| **1P vs AI** | Human (left paddle) | `W` | `S` | `Esc` to pause |
| **2P local** | Player 1 (left) | `W` | `S` | `Esc` to pause |
| **2P local** | Player 2 (right) | `↑` | `↓` | — |

In 1P mode the AI controls the right paddle — you don't.

## Touch

- **1P vs AI:** drag anywhere on the game arena to move your paddle. Your finger's vertical position on the screen maps directly to the paddle's vertical position in the arena.
- **2P local:** the screen is split down the middle — dragging on the **left half** moves player 1's paddle, dragging on the **right half** moves player 2's. Two thumbs, two paddles, at once.

Either way:
- Fast drag = instant paddle move (there's no smoothing — 1:1 position control).
- Lift your finger → paddle stays where you left it.
- Touches on buttons (pause, audio toggle, fullscreen toggle, any menu button) do **not** move the paddle. You can tap buttons safely without the paddle jumping.

## Fullscreen

A **FULLSCREEN** button on the main menu toggles the browser's Fullscreen API on `<html>`, and on mobile also tries to lock the screen orientation to landscape. It's hidden automatically when the browser doesn't support fullscreen, or when the game is already running installed as a fullscreen app (see [Getting started](./getting-started.md#installing-as-an-app)).

## Pause and quit

- **Keyboard:** press `Esc`.
- **Mobile / mouse:** tap the pause button in the top corner of the HUD.
- The pause overlay has two buttons: **Resume** (continue the match) and **Quit to Menu** (discard the match — no loss recorded).

## The dev console

Press the **backtick key** (` — the key above Tab on US keyboards) to toggle the graphics tuning panel while in a game or on the `/tuning` screen. The panel persists your settings across sessions. See [../technical/web/devpanel-overview.md](../technical/web/devpanel-overview.md) for details.

## Score-to-win

First side to **7 points** wins a match. There is no "win by 2" — seventh point wins outright.
