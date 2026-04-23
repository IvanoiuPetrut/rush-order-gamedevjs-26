import k from "../kaplayCtx";
import { ITEM, ITEMS } from "../entities";
import { GAME_OPTIONS } from "../constants";
//loadSprite(\"bean\", \"sprites/bean.png\")

let cursor: "default" | "grab" | "grabbing" | "pointer" = "default";

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
  k.add([k.sprite(ITEM.assembly_station), k.pos(pos.x, pos.y)]);
}

// ! Packager
const packagerPosition = getMapPositionByTile(6, 8);
k.add([k.sprite(ITEM.packager), k.pos(packagerPosition.x, packagerPosition.y)]);

// ! Car
const carPosition = getMapPositionByTile(10, 15);
k.add([k.sprite(ITEM.car), k.pos(carPosition.x, carPosition.y)]);

// ! Item Spawner

const itemSpawner = k.add([
  k.pos(getMapPositionByTile(beltRow, 0)),
  k.rect(GAME_OPTIONS.TILE_SIZE, GAME_OPTIONS.TILE_SIZE),
  k.color(k.Color.RED),
  "itemSpawner",
  k.timer()
]);

itemSpawner.loop(2, () => {
  const item = k.add([
    k.sprite(ITEM.brown),
    k.pos(getMapPositionByTile(beltRow, 0)),
    "item",
    k.timer(),
    k.area()
  ]);

  item.onUpdate(() => {
    item.move(50, 0);
  });

  item.onCollide("fire", () => {
    item.destroy();
  });

  item.onClick(() => {
    cursor = "grabbing";
  });

  item.onHover(() => {
    cursor = "grab";
  });

  item.onHoverEnd(() => {
    cursor = "default";
  });
});

k.onUpdate(() => {
  k.setCursor(cursor);
});
