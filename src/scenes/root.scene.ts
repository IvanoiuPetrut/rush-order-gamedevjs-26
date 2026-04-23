import k from "../kaplayCtx";
import { setup as setupGame } from "./game.scene";
import { setup as setupGameOver } from "./gameOver.scene";

k.scene("game", () => {
  setupGame();
});

k.scene("game-over", () => {
  setupGameOver();
});

k.go("game");
