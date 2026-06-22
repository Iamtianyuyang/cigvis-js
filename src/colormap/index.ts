/**
 * Colormap module for CIGVis
 */

export {
  ColormapImpl,
  createColormap,
  applyColormap,
  blendImages,
  setAlpha,
  rampAlpha,
  listColormaps,
  arrsToImage,
  fastSetCmap,
  distinctColors,
  lineCmap,
  customDiscCmap,
  getColorsFromCmap,
  discreteCmap,
  ramp,
  setUpAs,
  setDownAs,
  setAlphaExceptMin,
  setAlphaExceptMax,
  setAlphaExceptValues,
  setAlphaExceptTop,
  setAlphaExceptBottom,
  setAlphaExceptRanges,
  cmapToPlotly,
  cmapToRGBA,
  cmapToFloat32Array,
} from './colormap';
export { BUILTIN_COLORMAPS } from './builtin-cmaps';
