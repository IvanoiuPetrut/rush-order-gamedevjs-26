import k from "../kaplayCtx";
import { sound } from "../sound";

export function setup() {
  k.loadSprite("firstMenu", "sprites/menu/first_menu.png");
  k.loadSprite("howToPlay", "sprites/menu/how_to_play.png");
  k.loadSprite("signMenu", "sprites/menu/sign.png");

  const DRAW_AREA = { x: 170, y: 190, w: 110, h: 40 };

  const overlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(0, 0, 0),
    k.opacity(1),
    k.fixed(),
    k.z(100),
  ]);

  function fadeIn(cb: () => void) {
    k.tween(1, 0, 0.4, (v) => { overlay.opacity = v; }, k.easings.linear).onEnd(cb);
  }

  function fadeOut(cb: () => void) {
    k.tween(0, 1, 0.4, (v) => { overlay.opacity = v; }, k.easings.linear).onEnd(cb);
  }

  function makeButton(label: string, x: number, y: number) {
    const btn = k.add([
      k.rect(90, 18),
      k.pos(x, y),
      k.anchor("center"),
      k.color(80, 200, 80),
      k.area(),
      k.fixed(),
      k.z(10),
    ]);
    btn.add([k.text(label, { size: 8 }), k.anchor("center"), k.pos(0, 0)]);
    btn.onHover(() => { btn.color = k.rgb(60, 180, 60); });
    btn.onHoverEnd(() => { btn.color = k.rgb(80, 200, 80); });
    return btn;
  }

  function showFirstMenu() {
    const bg = k.add([k.sprite("firstMenu"), k.pos(0, 0), k.fixed(), k.z(0)]);
    fadeIn(() => {
      k.wait(2, () => {
        fadeOut(() => {
          bg.destroy();
          showHowToPlay();
        });
      });
    });
  }

  function showHowToPlay() {
    const bg = k.add([k.sprite("howToPlay"), k.pos(0, 0), k.fixed(), k.z(0)]);
    const btn = makeButton("Continue", k.width() / 2, k.height() - 16);

    btn.onClick(() => {
      sound.uiClick();
      btn.destroy();
      fadeOut(() => {
        bg.destroy();
        showSign();
      });
    });

    fadeIn(() => { });
  }

  function showSign() {
    k.add([k.sprite("signMenu"), k.pos(0, 0), k.fixed(), k.z(0)]);
    let hasSigned = false;

    const inkPoints: { x: number; y: number }[] = [];
    k.add([
      k.pos(0, 0),
      k.fixed(),
      k.z(10),
      {
        draw() {
          for (const p of inkPoints) {
            k.drawCircle({ pos: k.vec2(p.x, p.y), radius: 1.5, color: k.rgb(30, 30, 30) });
          }
        },
      },
    ]);

    const startBtn = k.add([
      k.rect(90, 18),
      k.pos(k.width() / 2, k.height() - 16),
      k.anchor("center"),
      k.color(120, 120, 120),
      k.area(),
      k.fixed(),
      k.z(10),
    ]);
    startBtn.add([k.text("Start Working!", { size: 8 }), k.anchor("center"), k.pos(0, 0)]);

    startBtn.onHover(() => {
      if (hasSigned) startBtn.color = k.rgb(60, 180, 60);
    });
    startBtn.onHoverEnd(() => {
      startBtn.color = hasSigned ? k.rgb(80, 200, 80) : k.rgb(120, 120, 120);
    });

    function isInDrawArea(pos: { x: number; y: number }) {
      return (
        pos.x >= DRAW_AREA.x &&
        pos.x <= DRAW_AREA.x + DRAW_AREA.w &&
        pos.y >= DRAW_AREA.y &&
        pos.y <= DRAW_AREA.y + DRAW_AREA.h
      );
    }

    function tryAddPoint() {
      const mp = k.mousePos();
      if (!isInDrawArea(mp)) return;
      inkPoints.push({ x: mp.x, y: mp.y });
      if (!hasSigned) {
        hasSigned = true;
        sound.signDraw();
        startBtn.color = k.rgb(80, 200, 80);
      }
    }

    k.onMousePress(tryAddPoint);
    k.onMouseMove(() => { if (k.isMouseDown()) tryAddPoint(); });

    startBtn.onClick(() => {
      if (!hasSigned) return;
      sound.uiClick();
      fadeOut(() => k.go("game"));
    });

    fadeIn(() => { });
  }

  showFirstMenu();
}
