export const ITEM = {
  assembly_station: "ASSEMBLY_STATION",
  belt: "BELT",
  car: "CAR",
  fire: "FIRE",
  packager: "PACKAGER",
  waiter: "WAITER",
  brown: "BROWN",
  green: "GREEN",
  orange: "ORANGE",
  complete_item: "COMPLETE_ITEM",
  package_item: "PACKAGE_ITEM"
} as const;

export type ItemName = (typeof ITEM)[keyof typeof ITEM];

export interface Item {
  sprite: string;
}

export const ITEMS: Record<ItemName, Item> = {
  ASSEMBLY_STATION: {
    sprite: "sprites/assembly_station.png"
  },
  BELT: {
    sprite: "sprites/belt.png"
  },
  CAR: {
    sprite: "sprites/car.png"
  },
  FIRE: {
    sprite: "sprites/fire.png"
  },
  PACKAGER: {
    sprite: "sprites/packager.png"
  },
  WAITER: {
    sprite: "sprites/waiter.png"
  },
  BROWN: {
    sprite: "sprites/items/brown.png"
  },
  GREEN: {
    sprite: "sprites/items/green.png"
  },
  ORANGE: {
    sprite: "sprites/items/orange.png"
  },
  COMPLETE_ITEM: {
    sprite: "sprites/items/complete_item.png"
  },
  PACKAGE_ITEM: {
    sprite: "sprites/items/package_item.png"
  }
};
