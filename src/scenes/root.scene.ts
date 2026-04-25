import k from "../kaplayCtx";
import { setup as setupMenu } from "./menu.scene";
import { setup as setupGame } from "./game.scene";
import { setup as setupGameOver } from "./gameOver.scene";

k.scene("menu", () => {
  setupMenu();
});

k.scene("game", () => {
  setupGame();
});

k.scene("game-over", () => {
  setupGameOver();
});

k.go("game");
