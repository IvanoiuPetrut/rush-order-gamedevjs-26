import k from "../kaplayCtx";
import { ITEM, ITEMS } from "../entities";
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
  k.add([
    k.sprite(ITEM.assembly_station),
    k.pos(pos.x, pos.y),
    k.area(),
    "assemblyStation"
  ]);
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

itemSpawner.loop(1000, () => {
  let isOnBelt = true;
  let isMovingByCursor = false;

  const item = k.add([
    k.sprite(ITEM.brown),
    k.pos(getMapPositionByTile(beltRow, 0)),
    "item",
    k.timer(),
    k.area()
  ]);

  item.onUpdate(() => {
    if (isOnBelt) {
      item.move(50, 0);
    }

    console.log("isMovingByCursor", isMovingByCursor);

    if (isMovingByCursor) {
      console.log("moving by cursor");
      item.pos = mousePosition;
    }
  });

  item.onCollide("fire", () => {
    item.destroy();
  });

  item.onClick(() => {
    cursor = "grabbing";
    isOnBelt = false;
    isMovingByCursor = true;
  });

  item.on("mouseRelease", () => {
    console.log("mouse released on item");
    isMovingByCursor = false;
  });

  item.onHover(() => {
    cursor = "grab";
  });

  item.onHoverEnd(() => {
    cursor = "default";
  });
});

k.onUpdate(() => {
  k.setCursor(CURSORS[cursor]);
});
