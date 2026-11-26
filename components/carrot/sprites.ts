const assetPath = "/images/carrot/";
export const sprites = {
  idle: ["idle_01.png", "idle_02.png"],
  hopping: ["Hopping_01.png", "Hopping_02.png", "Hopping_03.png", "Hopping_04.png", "Hopping_5.png", "Hopping_6.png"],
  laptop: ["on_laptop_01.png", "on_laptop_02.png"],
} as const;

export function spritePath(frame: string) {
  return assetPath + frame;
}
