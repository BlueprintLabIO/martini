---
title: Reactive APIs
description: Reactive helpers for binding Phaser state to UI without manual subscriptions
section: api
---

# Reactive APIs (Phaser)

martini-kit includes small reactive helpers to keep UI in sync with game state when using Phaser:

- `adapter.watchMyPlayer()` – derive data about the current player only when it changes.
- `adapter.watchState(selector)` – subscribe to derived state slices without manual cleanup.
- `createPlayerHUD()` – HUD helper that auto-rerenders when state or player metadata changes.

These APIs are lightweight wrappers around the adapter's change stream and are designed to avoid unnecessary updates. Use them to drive HUD elements, scoreboards, or overlays without wiring your own subscription lifecycles.

See also:
- [InputManager](./input-manager) for mapping inputs to actions
- [Phaser Helpers](./helpers) for higher-level utilities like HUD and grid helpers
