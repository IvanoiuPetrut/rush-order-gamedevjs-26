import k from "../kaplayCtx";
import { ITEM, ITEMS, type ItemName } from "../entities";
import { CURSORS, GAME_OPTIONS } from "../constants";
import { sound } from "../sound";
import type {
  AreaComp,
  ColorComp,
  GameObj,
  PosComp,
  SpriteComp,
  TextComp,
  TimerComp,
} from "kaplay";

//GameObj<SpriteComp | PosComp | AreaComp | TimerComp>
interface GameObjWithComponents extends GameObj<
  SpriteComp | PosComp | AreaComp | TimerComp
> { }

k.loadShader(
  "silhouette",
  undefined,
  `
  vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    vec4 texColor = texture2D(tex, uv);
    if (texColor.a < 0.1) discard;
    return color;
  }
`,
);

k.loadShader(
  "postFx",
  undefined,
  `
  uniform float u_time;
  uniform float u_ca_boost;   // extra CA on bad events, decays to 0
  uniform float u_flash;      // >0 = bad (orange-red), <0 = good (bright), decays to 0
  uniform float u_score;      // 0.0 (dead) to 1.0 (full), drives ambient glitchiness

  vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    float dist = length(uv - vec2(0.5));

    // Chromatic aberration: base + event spike + ambient from low score
    float ca = dist * dist * (0.004 + u_ca_boost + (1.0 - u_score) * 0.020);
    float r = texture2D(tex, uv + vec2(ca, 0.0)).r;
    float g = def_frag().g;
    float b = texture2D(tex, uv - vec2(ca, 0.0)).b;
    vec4 c = vec4(r, g, b, def_frag().a);

    // Color grading — warm rusty-orange industrial tint
    c.r = min(c.r * 1.08 + 0.015, 1.0);
    c.g = c.g * 0.97;
    c.b = c.b * 0.88;

    // Flash: positive = bad event (red tint), negative = good event (brightness)
    if (u_flash > 0.0) {
      c.r = min(c.r + u_flash * 0.35, 1.0);
      c.g *= 1.0 - u_flash * 0.2;
      c.b *= 1.0 - u_flash * 0.3;
    } else {
      c.rgb = min(c.rgb - u_flash * 0.35, vec3(1.0));
    }

    // Vignette: subtle, gets heavier as score drops
    float vigStr = 0.25 + (1.0 - u_score) * 0.35;
    float vignette = 1.0 - smoothstep(0.5, 1.6, dist * 1.4) * vigStr;
    c.rgb *= vignette;

    // Desaturation at low score
    float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    c.rgb = mix(vec3(gray), c.rgb, 0.4 + u_score * 0.6);

    // Subtle brightness flicker
    float flicker = 1.1 + sin(u_time * 13.7) * 0.008;
    c.rgb *= flicker;

    return c;
  }
`,
);

k.loadSprite("bg", "sprites/bg_alternate.png");
k.loadSprite("fg", "sprites/fg.png");

for (const [item, { sprite }] of Object.entries(ITEMS)) {
  k.loadSprite(item, sprite);
}

export function setup() {
  let caBoost = 0;
  let flash = 0;

  k.usePostEffect("postFx", () => ({
    u_time: k.time(),
    u_ca_boost: caBoost,
    u_flash: flash,
    u_score: score / SCORE_MAX_VALUE,
  }));

  let cursor: keyof typeof CURSORS = "default";
  const mousePosition = k.vec2(0, 0);
  let score = 48;
  let playTime = 0;
  let packagesDelivered = 0;
  let itemsBurned = 0;
  const SCORE_MAX_VALUE = 56;
  const RAMP_DURATION = 120;
  let maxValueForItemsNeededToAssemble = 1;
  let assemblyTime = 3;
  let beltSpeed = 15;
  let itemSpawnInterval = 2.0;
  let timeSinceLastSpawn = 0;

  sound.bgm();

  function addScore(points: number) {
    score = Math.max(0, Math.min(score + points, SCORE_MAX_VALUE));
    scoreBarFill.width = score;
    const ratio = score / SCORE_MAX_VALUE;
    scoreBarFill.color = ratio > 0.6 ? k.rgb(80, 200, 80) : ratio > 0.25 ? k.rgb(220, 180, 40) : k.rgb(220, 60, 60);
    if (score === 0) {
      sound.gameOver();
      k.setData("playTime", playTime);
      k.setData("packagesDelivered", packagesDelivered);
      k.setData("itemsBurned", itemsBurned);
      k.go("game-over");
    }
  }

  function getMapPositionByTile(row: number, col: number) {
    return k.vec2(col * GAME_OPTIONS.TILE_SIZE, row * GAME_OPTIONS.TILE_SIZE);
  }

  function addMovableItem(
    spriteKey: ItemName,
    startPos: { x: number; y: number },
    tags: string[],
    targetTag: string,
    onDropped: (item: GameObjWithComponents, target: GameObj) => void,
    onBelt = false,
  ) {
    let isMovingByCursor = false;
    let isOnBelt = onBelt;
    let isLocked = false;
    let triggeredIsOnGround = false;
    const outlineOffset = 0.4;

    const outlineItem = k.add([
      k.sprite(spriteKey),
      k.pos(startPos.x - outlineOffset, startPos.y - outlineOffset),
      k.color(255, 255, 255),
      k.shader("silhouette"),
      k.z(50),
      k.scale(0),
      "outlineItem",
    ]);

    const item = k.add([
      k.sprite(spriteKey),
      k.pos(startPos.x, startPos.y),
      ...tags,
      "movable",
      k.timer(),
      k.animate(),
      k.z(100),
      k.area({ scale: 1.5, offset: k.vec2(-2, -2) }),
    ] as any) as GameObjWithComponents;

    item.onUpdate(() => {
      outlineItem.pos.x = item.pos.x - outlineOffset;
      outlineItem.pos.y = item.pos.y - outlineOffset;

      if (isOnBelt) item.move(beltSpeed, 0);

      if (isMovingByCursor) {
        item.pos.x = mousePosition.x;
        item.pos.y = mousePosition.y;
      }

      const isOnGround = !isOnBelt && !isMovingByCursor && !isLocked;
      if (isOnGround && !triggeredIsOnGround) {
        outlineItem.scaleTo(1.2);
        sound.itemGround();
        addScore(-1);
        k.shake(0.5);
        caBoost = Math.min(caBoost + 0.02, 0.06);
        flash = 0.3;
        triggeredIsOnGround = true;
        const landX = item.pos.x;
        const landY = item.pos.y;
        (item as any).animate(
          "pos",
          [k.vec2(landX, landY), k.vec2(landX, landY - 2)],
          { duration: 0.6, direction: "ping-pong" },
        );
      }
    });

    item.onClick(() => {
      if (isLocked) return;
      sound.itemGrab();
      cursor = "grabbing";
      isOnBelt = false;
      isMovingByCursor = true;
      (item as any).unanimate("pos");
    });

    item.on("mouseRelease", () => {
      if (isLocked) return;
      isMovingByCursor = false;
      item.getCollisions().forEach((collision) => {
        if (collision.target.is(targetTag)) {
          onDropped(item, collision.target);
          cursor = "default";
        }
      });
    });

    item.onHover(() => {
      if (!isLocked) cursor = "grab";
    });
    item.onHoverEnd(() => {
      if (!isLocked) cursor = "default";
    });

    const lock = () => {
      isLocked = true;
      outlineItem.scaleTo(0);
    };
    const destroyItem = () => {
      item.destroy();
      outlineItem.destroy();
    };

    return { item, lock, destroyItem };
  }
  k.add([k.sprite("bg")]);
  k.add([k.sprite("fg"), k.z(200)]);

  // ! Ground decorations
  for (let i = 0; i < 40; i++) {
    const row = Math.floor(k.rand(GAME_OPTIONS.MAP_HEIGHT - 3)) + 1;
    const col = Math.floor(k.rand(GAME_OPTIONS.MAP_WIDTH - 3));
    if (row === 14 || col >= 19) continue;
    const tile = k.rand(1) > 0.5 ? ITEM.grass : ITEM.flowers;
    k.add([k.sprite(tile), k.pos(getMapPositionByTile(row, col)), k.z(0)]);
  }

  // ! Score bar
  const scoreBarOuter = k.add([
    k.rect(60, 10),
    k.pos(8, 4),
    k.color(40, 40, 40),
    k.fixed(),
    k.z(200),
  ]);

  const scoreBarFill = scoreBarOuter.add([
    k.rect(score, 6),
    k.pos(2, 2),
    k.color(80, 200, 80),
  ]);

  // ! Timer display
  k.add([
    k.rect(42, 10),
    k.pos(k.width() - 8, 4),
    k.anchor("topright"),
    k.color(40, 40, 40),
    k.fixed(),
    k.z(200),
  ]);
  const timerText = k.add([
    k.text("00:00", { size: 7 }),
    k.pos(k.width() - 29, 9),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.fixed(),
    k.z(201),
  ]);

  // ! Belt
  const beltLength = 14;
  const beltRow = 14;
  const beltPositions = Array.from({ length: beltLength }, (_, col) =>
    getMapPositionByTile(beltRow, col),
  );
  for (const pos of beltPositions) {
    k.add([k.sprite(ITEM.belt), k.pos(pos.x, pos.y)]);
  }

  // ! Fire
  const firePosition = getMapPositionByTile(beltRow, beltLength);
  k.add([
    k.sprite(ITEM.fire),
    k.pos(firePosition.x, firePosition.y - 3),
    k.area({ scale: 0.4, offset: k.vec2(8) }),
    "fire",
  ]);

  // ! Assembly station
  const ASSEMBLY_STATION_ROW = 2;
  const assemblyStation = [
    getMapPositionByTile(ASSEMBLY_STATION_ROW, 7),
    getMapPositionByTile(ASSEMBLY_STATION_ROW, 10),
    getMapPositionByTile(ASSEMBLY_STATION_ROW, 13),
    getMapPositionByTile(ASSEMBLY_STATION_ROW, 16),
  ];

  for (const pos of assemblyStation) {
    let assemblyItems: Partial<Record<ItemName, number>> = {
      [ITEM.brown]: Math.floor(k.rand(maxValueForItemsNeededToAssemble)) + 1,
      [ITEM.green]: Math.floor(k.rand(maxValueForItemsNeededToAssemble)) + 1,
      [ITEM.orange]: Math.floor(k.rand(maxValueForItemsNeededToAssemble)) + 1,
    };

    const itemInAssembly = [] as GameObjWithComponents[];

    const assemblyStationEntity = k.add([
      k.sprite(ITEM.assembly_station),
      k.pos(pos.x, pos.y),
      k.area(),
      k.timer(),
      k.animate(),
      "assemblyStation",
    ]);

    const widthOfItem = 12;
    const distanceBetweenItems = 2;
    const step = widthOfItem + distanceBetweenItems;
    const numberOfKeys = Object.keys(assemblyItems).length;
    const totalWidth =
      numberOfKeys * widthOfItem + (numberOfKeys - 1) * distanceBetweenItems;
    const startX = GAME_OPTIONS.TILE_SIZE / 2 - totalWidth / 2;

    const countLabels = new Map<ItemName, GameObj<TextComp | ColorComp>>();
    const itemSprites = new Map<ItemName, GameObj<SpriteComp | ColorComp>>();

    Object.entries(assemblyItems).forEach(([name, count], i) => {
      const xOffset = startX + i * step;
      const sprite = assemblyStationEntity.add([
        k.sprite(name),
        k.pos(xOffset, -20),
        k.color(255, 255, 255),
      ]);
      itemSprites.set(name as ItemName, sprite);
      const label = assemblyStationEntity.add([
        k.text(String(count), { size: 8 }),
        k.pos(xOffset + 4, -8),
        k.color(255, 255, 255),
      ]);
      countLabels.set(name as ItemName, label);
    });

    function setItemVisual(name: ItemName, done: boolean) {
      const col = done ? k.rgb(110, 110, 110) : k.rgb(255, 255, 255);
      const sprite = itemSprites.get(name);
      const label = countLabels.get(name);
      if (sprite) sprite.color = col;
      if (label) label.color = col;
    }

    assemblyStationEntity.on(
      "inAssemblyStation",
      (item: GameObjWithComponents) => {
        console.log("item in assembly station", item);
        const tagToRemove =
          (Object.keys(assemblyItems) as ItemName[]).find((name) =>
            item.is(name),
          ) ?? null;

        if (!tagToRemove) {
          return;
        }

        const currentCount = assemblyItems[tagToRemove] ?? 0;

        if (!tagToRemove || currentCount <= 0) {
          return;
        }

        sound.itemStation();
        assemblyItems[tagToRemove] = currentCount - 1;
        const label = countLabels.get(tagToRemove);
        if (label) label.text = String(assemblyItems[tagToRemove]);
        setItemVisual(tagToRemove as ItemName, assemblyItems[tagToRemove] === 0);
        item.trigger("inAssemblyStation");
        (item as any).animate(
          "scale",
          [k.vec2(1, 1), k.vec2(1.3, 0.7), k.vec2(0.85, 1.2), k.vec2(1, 1)],
          { duration: 0.35, loops: 1 },
        );
        item.wait(0.35, () => {
          (item as any).animate("scale", [k.vec2(1, 1), k.vec2(1.08, 1.08)], {
            duration: 0.6,
            direction: "ping-pong",
          });
        });
        itemInAssembly.push(item);

        const isComplete = Object.values(assemblyItems).every(
          (count) => count === 0,
        );
        if (isComplete) {
          assemblyStationEntity.trigger("assemblyStart");
        }
      },
    );

    assemblyStationEntity.on("assemblyStart", () => {
      console.log("assembly start!");
      k.shake(1);
      (assemblyStationEntity as any).animate(
        "pos",
        [k.vec2(pos.x - 0.5, pos.y), k.vec2(pos.x + 0.5, pos.y)],
        { duration: 0.08, direction: "ping-pong" },
      );
      assemblyStationEntity.wait(assemblyTime, () => {
        console.log("assembly complete!");
        assemblyStationEntity.trigger("assemblyComplete");
      });
    });

    assemblyStationEntity.on("assemblyComplete", () => {
      sound.assemblyComplete();
      k.shake(3);
      flash = -0.4;
      (assemblyStationEntity as any).unanimate("pos");
      assemblyStationEntity.pos = k.vec2(pos.x, pos.y);
      assemblyItems = {
        [ITEM.brown]: 1,
        [ITEM.green]: 1,
        [ITEM.orange]: 1,
      };
      Object.entries(assemblyItems).forEach(([name, count]) => {
        const label = countLabels.get(name as ItemName);
        if (label) label.text = String(count);
        setItemVisual(name as ItemName, false);
      });
      itemInAssembly.forEach((item) => item.destroy());
      itemInAssembly.length = 0;

      const completePos = k.vec2(pos.x, pos.y + 24);
      const { lock, destroyItem } = addMovableItem(
        ITEM.complete_item,
        completePos,
        ["completeItem"],
        "packager",
        (_item, target) => {
          lock();
          target.trigger("startPackaging", destroyItem);
        },
      );
    });
  }

  // ! Packager
  const PACKAGER_ROW = 5;
  const packagerPositions = [
    getMapPositionByTile(PACKAGER_ROW, 2),
    getMapPositionByTile(PACKAGER_ROW, 5),
    getMapPositionByTile(PACKAGER_ROW, 8),
    getMapPositionByTile(PACKAGER_ROW, 11),
  ];

  for (const packagerPosition of packagerPositions) {
    const packagerEntity = k.add([
      k.sprite(ITEM.packager),
      k.pos(packagerPosition.x, packagerPosition.y),
      k.area(),
      k.timer(),
      k.animate(),
      "packager",
    ]);

    packagerEntity.on("startPackaging", (destroyCompleteItem: () => void) => {
      k.shake(1);
      (packagerEntity as any).animate(
        "pos",
        [
          k.vec2(packagerPosition.x - 0.5, packagerPosition.y),
          k.vec2(packagerPosition.x + 0.5, packagerPosition.y),
        ],
        { duration: 0.08, direction: "ping-pong" },
      );
      packagerEntity.wait(2, () => {
        sound.packagingComplete();
        (packagerEntity as any).unanimate("pos");
        packagerEntity.pos = k.vec2(packagerPosition.x, packagerPosition.y);
        destroyCompleteItem();

        const packagePos = k.vec2(packagerPosition.x, packagerPosition.y + 16);
        const { lock, destroyItem } = addMovableItem(
          ITEM.package_item,
          packagePos,
          ["packageItem"],
          "car",
          (_item, target) => {
            lock();
            target.trigger("receivePackage", destroyItem);
          },
        );
      });
    });
  }

  // ! Car

  const CAR_COLUMN = 19;
  const carsPositions = [
    getMapPositionByTile(6, CAR_COLUMN),
    getMapPositionByTile(8, CAR_COLUMN),
    getMapPositionByTile(10, CAR_COLUMN),
    getMapPositionByTile(12, CAR_COLUMN),
  ];

  const offScreenX = GAME_OPTIONS.MAP_WIDTH * GAME_OPTIONS.TILE_SIZE + 32;

  for (const carPosition of carsPositions) {
    const carEntity = k.add([
      k.sprite(ITEM.car),
      k.pos(carPosition.x, carPosition.y),
      k.area(),
      k.timer(),
      k.animate(),
      "car",
    ]);

    carEntity.on("receivePackage", (destroyPackage: () => void) => {
      sound.delivery();
      k.shake(2);
      flash = -0.3;
      packagesDelivered++;
      addScore(4);
      destroyPackage();

      const particleColors = [k.rgb(255, 220, 50), k.rgb(100, 220, 100), k.rgb(255, 160, 50), k.rgb(255, 255, 255)];
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 25 + k.rand(25);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const p = k.add([
          k.rect(2, 2),
          k.pos(carPosition.x + 8, carPosition.y + 4),
          k.color(particleColors[Math.floor(k.rand(particleColors.length))]),
          k.opacity(1),
          k.z(150),
        ]);
        let age = 0;
        p.onUpdate(() => {
          age += k.dt();
          p.pos.x += vx * k.dt();
          p.pos.y += vy * k.dt();
          p.opacity = 1 - age * 2.5;
          if (age >= 0.4) p.destroy();
        });
      }

      const exitDuration = 0.7;
      const returnDuration = 0.5;
      (carEntity as any).animate(
        "pos",
        [
          k.vec2(carPosition.x, carPosition.y),
          k.vec2(offScreenX, carPosition.y),
        ],
        { duration: exitDuration, loops: 1 },
      );
      carEntity.wait(exitDuration + 0.5, () => {
        (carEntity as any).unanimate("pos");
        carEntity.pos = k.vec2(offScreenX, carPosition.y);
        (carEntity as any).animate(
          "pos",
          [
            k.vec2(offScreenX, carPosition.y),
            k.vec2(carPosition.x, carPosition.y),
          ],
          { duration: returnDuration, loops: 1 },
        );
        carEntity.wait(returnDuration, () => {
          (carEntity as any).unanimate("pos");
          carEntity.pos = k.vec2(carPosition.x, carPosition.y);
        });
      });
    });
  }

  // ! Item Spawner
  const itemsToSpawn: ItemName[] = [ITEM.brown, ITEM.green, ITEM.orange];

  function spawnItem() {
    const randomItem = itemsToSpawn[Math.floor(k.rand(itemsToSpawn.length))];
    const startPos = getMapPositionByTile(beltRow, 0);
    startPos.x = startPos.x - k.rand(16);
    startPos.y = startPos.y + k.rand(8);

    const { item, lock, destroyItem } = addMovableItem(
      randomItem,
      startPos,
      ["item", randomItem],
      "assemblyStation",
      (_item, target) => target.trigger("inAssemblyStation", _item),
      true,
    );

    item.onCollide("fire", () => {
      sound.itemBurned();
      itemsBurned++;
      destroyItem();
      addScore(-1);
      k.shake(2);
      caBoost = Math.min(caBoost + 0.06, 0.12);
      flash = 0.7;
    });
    item.on("inAssemblyStation", () => lock());
  }

  k.onMouseMove((pos) => {
    mousePosition.x = pos.x;
    mousePosition.y = pos.y;
  });

  k.onMouseRelease(() => {
    k.trigger("mouseRelease", "movable");
  });

  k.onUpdate(() => {
    k.setCursor(CURSORS[cursor]);
    playTime += k.dt();
    caBoost = Math.max(0, caBoost - k.dt() * 2);
    flash =
      flash > 0
        ? Math.max(0, flash - k.dt() * 3)
        : Math.min(0, flash + k.dt() * 3);

    const t = Math.min(playTime / RAMP_DURATION, 1);
    beltSpeed = 15 + t * 40;
    itemSpawnInterval = 2.0 - t * 1.3;
    assemblyTime = 3 - t * 1.5;
    maxValueForItemsNeededToAssemble = t < 0.4 ? 1 : t < 0.75 ? 2 : 3;

    timeSinceLastSpawn += k.dt();
    if (timeSinceLastSpawn >= itemSpawnInterval) {
      timeSinceLastSpawn = 0;
      spawnItem();
    }

    const mins = Math.floor(playTime / 60);
    const secs = Math.floor(playTime % 60);
    timerText.text = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  });
}
