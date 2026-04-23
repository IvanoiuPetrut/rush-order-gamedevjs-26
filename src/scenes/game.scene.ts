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

for (const [item, { sprite }] of Object.entries(ITEMS)) {
  k.loadSprite(item, sprite);
}

export function setup() {
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
        triggeredIsOnGround = true;
      }
    });

    item.onClick(() => {
      if (isLocked) return;
      cursor = "grabbing";
      isOnBelt = false;
      isMovingByCursor = true;
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
  const beltLength = 12;
  const beltRow = 12;
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
  const assemblyStation = [
    getMapPositionByTile(3, 5),
    getMapPositionByTile(3, 8),
    getMapPositionByTile(3, 11),
    getMapPositionByTile(3, 14)
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
      assemblyStationEntity.wait(assemblyTime, () => {
        console.log("assembly complete!");
        assemblyStationEntity.trigger("assemblyComplete");
      });
    });

    assemblyStationEntity.on("assemblyComplete", () => {
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
  const packagerPosition = getMapPositionByTile(6, 8);
  const packagerEntity = k.add([
    k.sprite(ITEM.packager),
    k.pos(packagerPosition.x, packagerPosition.y),
    k.area(),
    k.timer(),
    "packager"
  ]);

  packagerEntity.on("startPackaging", (destroyCompleteItem: () => void) => {
    packagerEntity.wait(2, () => {
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

  // ! Car
  const carPosition = getMapPositionByTile(10, 15);
  const carEntity = k.add([
    k.sprite(ITEM.car),
    k.pos(carPosition.x, carPosition.y),
    k.area(),
    "car"
  ]);

  carEntity.on("receivePackage", (destroyPackage: () => void) => {
    addScore(4);
    destroyPackage();
  });

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
