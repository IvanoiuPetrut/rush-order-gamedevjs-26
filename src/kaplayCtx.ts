import kaplay from "kaplay";
import { GAME_OPTIONS } from "./constants.ts";

const k = kaplay({
  width: GAME_OPTIONS.MAP_WIDTH * GAME_OPTIONS.TILE_SIZE,
  height: GAME_OPTIONS.MAP_HEIGHT * GAME_OPTIONS.TILE_SIZE,
  global: false,
  background: "#4F7942",
  touchToMouse: true,
  canvas: document.getElementById("game-canvas") as HTMLCanvasElement,
  debug: true, // set it to false when deploying the game
  scale: GAME_OPTIONS.SCALE,
  pixelDensity: window.devicePixelRatio,
});

k.loadRoot("./"); // A good idea for Itch.io publishing later

export default k;