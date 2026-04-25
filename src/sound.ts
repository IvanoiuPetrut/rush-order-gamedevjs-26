import k from "./kaplayCtx";

k.loadSound("uiClick", "sounds/ui_click.mp3");
k.loadSound("itemGrab", "sounds/item_grab.mp3");
k.loadSound("itemStation", "sounds/item_station.mp3");
k.loadSound("assemblyComplete", "sounds/assembly_complete.mp3");
k.loadSound("packagingComplete", "sounds/packaging_complete.mp3");
k.loadSound("delivery", "sounds/delivery.mp3");
k.loadSound("itemBurned", "sounds/item_burned.mp3");
k.loadSound("itemGround", "sounds/item_ground.mp3");
k.loadSound("gameOver", "sounds/game_over.mp3");
k.loadSound("signDraw", "sounds/sign_draw.mp3");

class SoundManager {
  private static instance: SoundManager;

  private constructor() { }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private play(key: string, volume = 1) {
    try {
      k.play(key, { volume });
    } catch (_) {
      // Sound file not yet populated — safe to ignore
    }
  }

  uiClick() { this.play("uiClick", 0.6); }
  itemGrab() { this.play("itemGrab", 0.5); }
  itemStation() { this.play("itemStation", 0.7); }
  assemblyComplete() { this.play("assemblyComplete", 0.8); }
  packagingComplete() { this.play("packagingComplete", 0.8); }
  delivery() { this.play("delivery", 1.0); }
  itemBurned() { this.play("itemBurned", 0.8); }
  itemGround() { this.play("itemGround", 0.5); }
  gameOver() { this.play("gameOver", 0.9); }
  signDraw() { this.play("signDraw", 0.4); }
}

export const sound = SoundManager.getInstance();
