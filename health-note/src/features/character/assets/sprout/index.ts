import SproutStage1Front from './SproutStage1Front';

// Register only finished views. Missing stages/directions must not silently reuse the front view.
export const SPROUT_ASSETS = {
  1: {
    front: { Artwork: SproutStage1Front, viewBox: '0 0 160 160' },
  },
} as const;

export type TSproutStage = keyof typeof SPROUT_ASSETS;
export type TSproutDirection = keyof (typeof SPROUT_ASSETS)[TSproutStage];
