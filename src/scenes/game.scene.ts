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

let cursor: keyof typeof CURSORS = "default";
const mousePosition = k.vec2(0, 0);

k.onMouseMove((pos) => {
  mousePosition.x = pos.x;
  mousePosition.y = pos.y;
});

k.onMouseRelease(() => {
  k.trigger("mouseRelease", "item");
});

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

function getMapPositionByTile(row: number, col: number) {
  return k.vec2(col * GAME_OPTIONS.TILE_SIZE, row * GAME_OPTIONS.TILE_SIZE);
}

// ! Belt
const beltLength = 8;
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
  getMapPositionByTile(2, 5),
  getMapPositionByTile(2, 7),
  getMapPositionByTile(2, 9),
  getMapPositionByTile(2, 11)
];

for (const pos of assemblyStation) {
  let assemblyItems: Partial<Record<ItemName, number>> = {
    [ITEM.brown]: 1,
    [ITEM.green]: 1,
    [ITEM.orange]: 1
  };
  const itemInAssembly = [] as GameObjWithComponents[];

  const assemblyStationEntity = k.add([
    k.sprite(ITEM.assembly_station),
    k.pos(pos.x, pos.y),
    k.area(),
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
      //check that the item is one of the required and not 0
      console.log("item in assembly station", item);
      const tagToRemove =
        (Object.keys(assemblyItems) as ItemName[]).find((name) =>
          item.is(name)
        ) ?? null;

      console.log("tag to remove", tagToRemove, assemblyItems);

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

      //if all entries in assemblyItems are 0, we trigger "assemblyComplete" event and reset the assembly station
      const isComplete = Object.values(assemblyItems).every(
        (count) => count === 0
      );
      if (isComplete) {
        assemblyStationEntity.trigger("assemblyComplete");
      }
    }
  );

  assemblyStationEntity.on("assemblyComplete", () => {
    console.log("assembly complete!");
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
  });
}

// ! Packager
const packagerPosition = getMapPositionByTile(6, 8);
k.add([
  k.sprite(ITEM.packager),
  k.pos(packagerPosition.x, packagerPosition.y),
  k.area(),
  "packager"
]);

// ! Car
const carPosition = getMapPositionByTile(10, 15);
k.add([
  k.sprite(ITEM.car),
  k.pos(carPosition.x, carPosition.y),
  k.area(),
  "car"
]);

// ! Item Spawner

const itemSpawner = k.add([
  k.pos(getMapPositionByTile(beltRow, 0)),
  k.rect(GAME_OPTIONS.TILE_SIZE, GAME_OPTIONS.TILE_SIZE),
  k.color(k.Color.RED),
  "itemSpawner",
  k.timer()
]);

itemSpawner.loop(0.5, () => {
  const itemsToSpawn: ItemName[] = [ITEM.brown, ITEM.green, ITEM.orange];
  const randomItem = itemsToSpawn[Math.floor(k.rand(itemsToSpawn.length))];
  let isOnBelt = true;
  let isMovingByCursor = false;
  let isInAssemblyStation = false;

  const outlinePos = getMapPositionByTile(beltRow, 0);
  const outlineOffset = 0.4;

  const outlineItem = k.add([
    k.sprite(randomItem),
    k.pos(outlinePos.x - outlineOffset, outlinePos.y - outlineOffset),
    k.color(255, 255, 255),
    k.shader("silhouette"),
    k.z(50),
    k.scale(0),
    "outlineItem"
  ]);

  const item = k.add([
    k.sprite(randomItem),
    k.pos(getMapPositionByTile(beltRow, 0)),
    "item",
    randomItem,
    k.timer(),
    k.z(100),
    k.area({ scale: 1.5, offset: k.vec2(-2, -2) })
  ]);

  item.onUpdate(() => {
    outlineItem.pos.x = item.pos.x - outlineOffset;
    outlineItem.pos.y = item.pos.y - outlineOffset;

    if (isOnBelt) {
      item.move(50, 0);
    }

    if (isMovingByCursor) {
      item.pos.x = mousePosition.x;
      item.pos.y = mousePosition.y;
    }

    if (!isOnBelt && !isMovingByCursor && !isInAssemblyStation) {
      outlineItem.scaleTo(1.2);
    }
  });

  item.onCollide("fire", () => {
    item.destroy();
    outlineItem.destroy();
  });

  item.onClick(() => {
    if (isInAssemblyStation) {
      return;
    }

    cursor = "grabbing";
    isOnBelt = false;
    isMovingByCursor = true;
  });

  item.on("inAssemblyStation", () => {
    isInAssemblyStation = true;
    outlineItem.scaleTo(0);
  });

  item.on("mouseRelease", () => {
    if (isInAssemblyStation) {
      return;
    }

    isMovingByCursor = false;

    const collisions = item.getCollisions();
    collisions.forEach((collision) => {
      if (collision.target.is("assemblyStation")) {
        collision.target.trigger("inAssemblyStation", item);
        cursor = "default";
      }
    });
  });

  item.onHover(() => {
    if (isInAssemblyStation) {
      return;
    }

    cursor = "grab";
  });

  item.onHoverEnd(() => {
    if (isInAssemblyStation) {
      return;
    }

    cursor = "default";
  });
});

k.onUpdate(() => {
  k.setCursor(CURSORS[cursor]);
});
