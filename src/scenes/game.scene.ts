import k from "../kaplayCtx";
import { ITEMS } from "../entities";
//loadSprite(\"bean\", \"sprites/bean.png\")

//for item in ITEMS, load the sprite
for (const [item, { sprite }] of Object.entries(ITEMS)) {
  k.loadSprite(item, sprite);
}
