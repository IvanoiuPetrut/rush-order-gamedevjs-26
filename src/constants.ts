export const CURSORS = {
  default: "url('/sprites/mouse/mouse.png'), auto",
  grab: "url('/sprites/mouse/hover.png'), auto",
  grabbing: "url('/sprites/mouse/hold.png'), auto",
  pointer: "url('/sprites/mouse/hover_click.png'), auto"
} as const;

export const GAME_OPTIONS = {
  TILE_SIZE: 16,
  MAP_WIDTH: 22,
  MAP_HEIGHT: 17,
  SCALE: 2
} as const;
