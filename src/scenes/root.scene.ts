import k from "../kaplayCtx";

k.scene("game", () => {
  import("./game.scene");
});

k.scene("game-over", () => {
  // TODO
});

k.go("game");