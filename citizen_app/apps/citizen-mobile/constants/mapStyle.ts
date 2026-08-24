/**
 * §map-provider — MapLibre raster style pointing at the same free Carto/OSM
 * tiles this app already used as a `UrlTile` overlay. No API key, no
 * billing account, no signup of any kind.
 *
 * Replaces `react-native-maps`, whose Android backend is ALWAYS Google
 * Play Services' Maps SDK natively — even when only drawing a custom
 * UrlTile on top of it, the underlying native map view still needs a
 * billed Google Cloud API key just to initialize (that's what was causing
 * the black-map issue). MapLibre Native has no such dependency: the raster
 * source below IS the entire map, no Google layer underneath it at all.
 */
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

export const CARTO_VOYAGER_TILE_URL = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

// Not `as const` — `StyleSpecification`'s `tiles`/`layers` are typed as
// mutable arrays, which a `readonly` const-asserted literal can't satisfy.
export const MAP_STYLE_JSON: StyleSpecification = {
  version: 8,
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: [CARTO_VOYAGER_TILE_URL],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'carto-voyager-layer', type: 'raster', source: 'carto-voyager', minzoom: 0, maxzoom: 20 }],
};
