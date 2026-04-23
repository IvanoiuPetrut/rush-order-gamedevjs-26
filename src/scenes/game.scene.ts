import k from "../kaplayCtx";
import { ITEM, ITEMS, type ItemName } from "../entities";
import { CURSORS, GAME_OPTIONS } from "../constants";
//loadSprite(\"bean\", \"sprites/bean.png\")

let cursor: keyof typeof CURSORS = "default";
const mousePosition = k.vec2(0, 0);

k.onMouseMove((pos) => {
  mousePosition.x = pos.x;
  mousePosition.y = pos.y;
});

k.onMouseRelease(() => {
  k.trigger("mouseRelease", "item");
});

//for item in ITEMS, load the sprite
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
  const assemblyItems: Partial<Record<ItemName, number>> = {
    [ITEM.brown]: 2,
    [ITEM.green]: 1,
    [ITEM.orange]: 3
  };

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

  Object.entries(assemblyItems).forEach(([name, count], i) => {
    const xOffset = startX + i * step;
    assemblyStationEntity.add([k.sprite(name), k.pos(xOffset, -15)]);
    assemblyStationEntity.add([
      k.text(String(count), { size: 6 }),
      k.pos(xOffset + 2, -5)
    ]);
  });

  assemblyStationEntity.on("inAssemblyStation", (item) => {
    console.log("item in assembly station", item);
    item.trigger("inAssemblyStation");
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

itemSpawner.loop(100, () => {
  let isOnBelt = true;
  let isMovingByCursor = false;
  let isInAssemblyStation = false;

  const item = k.add([
    k.sprite(ITEM.brown),
    k.pos(getMapPositionByTile(beltRow, 0)),
    "item",
    k.timer(),
    k.area({ scale: 1.5, offset: k.vec2(-2, -2) })
  ]);

  item.onUpdate(() => {
    if (isOnBelt) {
      item.move(50, 0);
    }

    if (isMovingByCursor) {
      item.pos.x = mousePosition.x;
      item.pos.y = mousePosition.y;
    }
  });

  item.onCollide("fire", () => {
    item.destroy();
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
