import k from "../kaplayCtx";
import { ITEM, ITEMS, type ItemName } from "../entities";
import { CURSORS, GAME_OPTIONS } from "../constants";
import type {
  AreaComp,
  GameObj,
  PosComp,
  SpriteComp,
  TextComp,
  TimerComp
} from "kaplay";

//GameObj<SpriteComp | PosComp | AreaComp | TimerComp>
interface GameObjWithComponents extends GameObj<
  SpriteComp | PosComp | AreaComp | TimerComp
> {}

k.loadShader(
  "silhouette",
  undefined,
  `
  vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    vec4 texColor = texture2D(tex, uv);
    if (texColor.a < 0.1) discard;
    return color;
  }
`
);

k.loadShader(
  "postFx",
  undefined,
  `
  uniform float u_time;

  vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    float dist = length(uv - vec2(0.5));

    // Chromatic aberration — R/B channels split outward from center
    float ca = dist * dist * 0.008;
    float r = texture2D(tex, uv + vec2(ca, 0.0)).r;
    float g = def_frag().g;
    float b = texture2D(tex, uv - vec2(ca, 0.0)).b;
    vec4 c = vec4(r, g, b, def_frag().a);

    // Color grading — warm rusty-orange industrial tint
    c.r = min(c.r * 1.08 + 0.015, 1.0);
    c.g = c.g * 0.97;
    c.b = c.b * 0.88;

    // Vignette — darkened edges
    float vignette = 1.0 - smoothstep(0.5, 1.6, dist * 1.4);
    c.rgb *= vignette;

    // Subtle brightness flicker
    float flicker = 1.1 + sin(u_time * 13.7) * 0.008;
    c.rgb *= flicker;

    return c;
  }
`
);

for (const [item, { sprite }] of Object.entries(ITEMS)) {
  k.loadSprite(item, sprite);
}

export function setup() {
  k.usePostEffect("postFx", () => ({ u_time: k.time() }));

  let cursor: keyof typeof CURSORS = "default";
  const mousePosition = k.vec2(0, 0);
  let score = 48;
  let playTime = 0;
  const SCORE_MAX_VALUE = 56;
  let maxValueForItemsNeededToAssemble = 2;
  let beltSpeed = 20;
  let itemSpawnInterval = 1.5;

  function addScore(points: number) {
    score = Math.max(0, Math.min(score + points, SCORE_MAX_VALUE));
    scoreBarFill.width = score;
    if (score === 0) {
      k.setData("playTime", playTime);
      // k.go("game-over");
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
    onBelt = false
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
      "outlineItem"
    ]);

    const item = k.add([
      k.sprite(spriteKey),
      k.pos(startPos.x, startPos.y),
      ...tags,
      "movable",
      k.timer(),
      k.animate(),
      k.z(100),
      k.area({ scale: 1.5, offset: k.vec2(-2, -2) })
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
        addScore(-1);
        k.shake(0.5);
        triggeredIsOnGround = true;
        const landX = item.pos.x;
        const landY = item.pos.y;
        (item as any).animate(
          "pos",
          [k.vec2(landX, landY), k.vec2(landX, landY - 2)],
          { duration: 0.6, direction: "ping-pong" }
        );
      }
    });

    item.onClick(() => {
      if (isLocked) return;
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

  // ! Score bar
  const scoreBarOuter = k.add([
    k.rect(60, 10),
    k.pos(8, 4),
    k.color(40, 40, 40),
    k.fixed(),
    k.z(200)
  ]);

  const scoreBarFill = scoreBarOuter.add([
    k.rect(score, 6),
    k.pos(2, 2),
    k.color(80, 200, 80)
  ]);

  // ! Belt
  const beltLength = 14;
  const beltRow = 14;
  const beltPositions = Array.from({ length: beltLength }, (_, col) =>
    getMapPositionByTile(beltRow, col)
  );
  for (const pos of beltPositions) {
    k.add([k.sprite(ITEM.belt), k.pos(pos.x, pos.y)]);
  }

  // ! Fire
  const firePosition = getMapPositionByTile(beltRow, beltLength);
  k.add([
    k.sprite(ITEM.fire),
    k.pos(firePosition.x, firePosition.y),
    k.area(),
    "fire"
  ]);

  // ! Assembly station
  const ASSEMBLY_STATION_ROW = 2;
  const assemblyStation = [
    getMapPositionByTile(ASSEMBLY_STATION_ROW, 7),
    getMapPositionByTile(ASSEMBLY_STATION_ROW, 10),
    getMapPositionByTile(ASSEMBLY_STATION_ROW, 13),
    getMapPositionByTile(ASSEMBLY_STATION_ROW, 16)
  ];

  for (const pos of assemblyStation) {
    let assemblyItems: Partial<Record<ItemName, number>> = {
      [ITEM.brown]: Math.floor(k.rand(maxValueForItemsNeededToAssemble)) + 1,
      [ITEM.green]: Math.floor(k.rand(maxValueForItemsNeededToAssemble)) + 1,
      [ITEM.orange]: Math.floor(k.rand(maxValueForItemsNeededToAssemble)) + 1
    };

    const itemInAssembly = [] as GameObjWithComponents[];
    let assemblyTime = 3;

    const assemblyStationEntity = k.add([
      k.sprite(ITEM.assembly_station),
      k.pos(pos.x, pos.y),
      k.area(),
      k.timer(),
      k.animate(),
      "assemblyStation"
    ]);

    const widthOfItem = 8;
    const distanceBetweenItems = 2;
    const step = widthOfItem + distanceBetweenItems;
    const numberOfKeys = Object.keys(assemblyItems).length;
    const totalWidth =
      numberOfKeys * widthOfItem + (numberOfKeys - 1) * distanceBetweenItems;
    const startX = GAME_OPTIONS.TILE_SIZE / 2 - totalWidth / 2;

    const countLabels = new Map<ItemName, GameObj<TextComp>>();

    Object.entries(assemblyItems).forEach(([name, count], i) => {
      const xOffset = startX + i * step;
      assemblyStationEntity.add([k.sprite(name), k.pos(xOffset, -15)]);
      const label = assemblyStationEntity.add([
        k.text(String(count), { size: 6 }),
        k.pos(xOffset + 2, -5)
      ]);
      countLabels.set(name as ItemName, label);
    });

    assemblyStationEntity.on(
      "inAssemblyStation",
      (item: GameObjWithComponents) => {
        console.log("item in assembly station", item);
        const tagToRemove =
          (Object.keys(assemblyItems) as ItemName[]).find((name) =>
            item.is(name)
          ) ?? null;

        if (!tagToRemove) {
          return;
        }

        const currentCount = assemblyItems[tagToRemove] ?? 0;

        if (!tagToRemove || currentCount <= 0) {
          return;
        }

        assemblyItems[tagToRemove] = currentCount - 1;
        const label = countLabels.get(tagToRemove);
        if (label) label.text = String(assemblyItems[tagToRemove]);
        item.trigger("inAssemblyStation");
        (item as any).animate(
          "scale",
          [k.vec2(1, 1), k.vec2(1.3, 0.7), k.vec2(0.85, 1.2), k.vec2(1, 1)],
          { duration: 0.35, loops: 1 }
        );
        item.wait(0.35, () => {
          (item as any).animate("scale", [k.vec2(1, 1), k.vec2(1.08, 1.08)], {
            duration: 0.6,
            direction: "ping-pong"
          });
        });
        itemInAssembly.push(item);

        const isComplete = Object.values(assemblyItems).every(
          (count) => count === 0
        );
        if (isComplete) {
          assemblyStationEntity.trigger("assemblyStart");
        }
      }
    );

    assemblyStationEntity.on("assemblyStart", () => {
      console.log("assembly start!");
      k.shake(1);
      (assemblyStationEntity as any).animate(
        "pos",
        [k.vec2(pos.x - 0.5, pos.y), k.vec2(pos.x + 0.5, pos.y)],
        { duration: 0.08, direction: "ping-pong" }
      );
      assemblyStationEntity.wait(assemblyTime, () => {
        console.log("assembly complete!");
        assemblyStationEntity.trigger("assemblyComplete");
      });
    });

    assemblyStationEntity.on("assemblyComplete", () => {
      k.shake(3);
      (assemblyStationEntity as any).unanimate("pos");
      assemblyStationEntity.pos = k.vec2(pos.x, pos.y);
      assemblyItems = {
        [ITEM.brown]: 1,
        [ITEM.green]: 1,
        [ITEM.orange]: 1
      };
      Object.entries(assemblyItems).forEach(([name, count]) => {
        const label = countLabels.get(name as ItemName);
        if (label) label.text = String(count);
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
        }
      );
    });
  }

  // ! Packager
  const PACKAGER_ROW = 5;
  const packagerPositions = [
    getMapPositionByTile(PACKAGER_ROW, 2),
    getMapPositionByTile(PACKAGER_ROW, 5),
    getMapPositionByTile(PACKAGER_ROW, 8),
    getMapPositionByTile(PACKAGER_ROW, 11)
  ];

  for (const packagerPosition of packagerPositions) {
    const packagerEntity = k.add([
      k.sprite(ITEM.packager),
      k.pos(packagerPosition.x, packagerPosition.y),
      k.area(),
      k.timer(),
      k.animate(),
      "packager"
    ]);

    packagerEntity.on("startPackaging", (destroyCompleteItem: () => void) => {
      k.shake(1);
      (packagerEntity as any).animate(
        "pos",
        [
          k.vec2(packagerPosition.x - 0.5, packagerPosition.y),
          k.vec2(packagerPosition.x + 0.5, packagerPosition.y)
        ],
        { duration: 0.08, direction: "ping-pong" }
      );
      packagerEntity.wait(2, () => {
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
          }
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
    getMapPositionByTile(12, CAR_COLUMN)
  ];

  for (const carPosition of carsPositions) {
    const carEntity = k.add([
      k.sprite(ITEM.car),
      k.pos(carPosition.x, carPosition.y),
      k.area(),
      "car"
    ]);

    carEntity.on("receivePackage", (destroyPackage: () => void) => {
      k.shake(2);
      addScore(4);
      destroyPackage();
    });
  }

  // ! Item Spawner
  const itemSpawner = k.add([
    k.pos(getMapPositionByTile(beltRow, -1)),
    k.rect(GAME_OPTIONS.TILE_SIZE, GAME_OPTIONS.TILE_SIZE),
    k.color(k.Color.RED),
    "itemSpawner",
    k.timer()
  ]);

  const itemsToSpawn: ItemName[] = [ITEM.brown, ITEM.green, ITEM.orange];

  itemSpawner.loop(itemSpawnInterval, () => {
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
      true
    );

    item.onCollide("fire", () => {
      destroyItem();
      addScore(-1);
      k.shake(2);
    });
    item.on("inAssemblyStation", () => lock());
  });

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
  });
}
