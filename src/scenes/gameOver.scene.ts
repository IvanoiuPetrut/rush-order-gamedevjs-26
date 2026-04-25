import k from "../kaplayCtx";

k.loadSprite("gameOver", "sprites/menu/game_over.png");

export function setup() {
  const playTime: number = k.getData("playTime") ?? 0;
  const packagesDelivered: number = k.getData("packagesDelivered") ?? 0;
  const itemsBurned: number = k.getData("itemsBurned") ?? 0;

  const minutes = Math.floor(playTime / 60);
  const seconds = Math.floor(playTime % 60);
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  function performanceTitle() {
    if (packagesDelivered === 0) return "Spectacular failure.";
    if (packagesDelivered < 3) return "At least you tried.";
    if (packagesDelivered < 8) return "Mediocre at best.";
    return "Almost competent.";
  }

  k.add([k.sprite("gameOver"), k.pos(0, 0), k.fixed(), k.z(0)]);

  const LEFT_X = 80;
  const WHITE = k.rgb(255, 255, 255);

  k.add([
    k.text(performanceTitle(), { size: 16, font: "chalk" }),
    k.pos(LEFT_X, 200),
    k.color(k.Color.WHITE),
    k.fixed(),
    k.z(1),
  ]);

  const stats = [
    `Employment time: ${formatted}`,
    `Packages shipped: ${packagesDelivered}`,
    `Items incinerated: ${itemsBurned}`,
    `Employee of the month: 0 times`,
    `Would rehire: Absolutely not`,
    `Boss satisfaction: -inf%`,
  ];

  const statStartY = 80;
  const statSpacing = 16;

  stats.forEach((line, i) => {
    k.add([
      k.text(line, { size: 12, font: "chalk" }),
      k.pos(LEFT_X, statStartY + i * statSpacing),
      k.color(WHITE),
      k.fixed(),
      k.z(1),
    ]);
  });

  const tryAgainBtn = k.add([
    k.rect(80, 18),
    k.pos(k.width() / 2, 242),
    k.anchor("center"),
    k.color(80, 200, 80),
    k.area(),
    k.fixed(),
    k.z(2),
  ]);

  tryAgainBtn.add([
    k.text("Apply Again", { size: 8, font: "chalk" }),
    k.anchor("center"),
    k.pos(0, 0),
  ]);

  tryAgainBtn.onClick(() => {
    k.go("menu");
  });

  tryAgainBtn.onHover(() => {
    tryAgainBtn.color = k.rgb(60, 180, 60);
  });

  tryAgainBtn.onHoverEnd(() => {
    tryAgainBtn.color = k.rgb(80, 200, 80);
  });
}
