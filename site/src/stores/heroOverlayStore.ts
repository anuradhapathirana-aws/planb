import { create } from 'zustand';

/**
 * Whether a full-bleed hero is currently behind the public header.
 *
 * `HeroSlider` sets it from an `IntersectionObserver` on its own section, and
 * `PublicHeader` reads it to draw the floating, see-through bar instead of the
 * solid navy one. **The hero owns the flag, not the route**: the header does not
 * check for the home page, so a page without a full-bleed hero — or a home page
 * whose hero has nothing to show — always gets the solid bar, and a future page
 * can opt in by rendering a hero.
 */
interface HeroOverlayState {
  isUnderHeader: boolean;
  setUnderHeader: (value: boolean) => void;
}

export const useHeroOverlayStore = create<HeroOverlayState>((set) => ({
  isUnderHeader: false,
  setUnderHeader: (isUnderHeader) => set({ isUnderHeader }),
}));
