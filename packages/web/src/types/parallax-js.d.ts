declare module "parallax-js" {
  interface ParallaxOptions {
    relativeInput?: boolean;
    clipRelativeInput?: boolean;
    hoverOnly?: boolean;
    pointerEvents?: boolean;
    precision?: number;
    scalarX?: number;
    scalarY?: number;
    frictionX?: number;
    frictionY?: number;
    originX?: number;
    originY?: number;
    invertX?: boolean;
    invertY?: boolean;
    limitX?: number | false;
    limitY?: number | false;
    selector?: string;
  }

  class Parallax {
    constructor(element: HTMLElement, options?: ParallaxOptions);
    enable(): void;
    disable(): void;
    destroy(): void;
    updateLayers(): void;
  }

  export default Parallax;
}
