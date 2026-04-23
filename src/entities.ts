const ITEM_NAMES = {
  assembly_station: "ASSEMBLY_STATION",
  belt: "BELT",
  car: "CAR",
  fire: "FIRE",
  packager: "PACKAGER",
  waiter: "WAITER"
} as const;

export type ItemName = (typeof ITEM_NAMES)[keyof typeof ITEM_NAMES];

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
  }
};
