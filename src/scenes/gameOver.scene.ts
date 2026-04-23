import k from "../kaplayCtx";

export function setup() {
  const playTime: number = k.getData("playTime") ?? 0;
  const minutes = Math.floor(playTime / 60);
  const seconds = Math.floor(playTime % 60);
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const cx = k.width() / 2;
  const cy = k.height() / 2;

  k.add([
    k.text("GAME OVER", { size: 24 }),
    k.pos(cx, cy - 50),
    k.anchor("center"),
    k.fixed()
  ]);

  k.add([
    k.text(`You lasted: ${formatted}`, { size: 10 }),
    k.pos(cx, cy - 20),
    k.anchor("center"),
    k.fixed()
  ]);

  const tryAgainBtn = k.add([
    k.rect(70, 18),
    k.pos(cx, cy + 16),
    k.anchor("center"),
    k.color(80, 200, 80),
    k.area(),
    k.fixed(),
    k.z(10)
  ]);

  tryAgainBtn.add([
    k.text("Try Again", { size: 8 }),
    k.anchor("center"),
    k.pos(0, 0)
  ]);

  tryAgainBtn.onClick(() => {
    k.go("game");
  });

  tryAgainBtn.onHover(() => {
    tryAgainBtn.color = k.rgb(60, 180, 60);
  });

  tryAgainBtn.onHoverEnd(() => {
    tryAgainBtn.color = k.rgb(80, 200, 80);
  });
}
