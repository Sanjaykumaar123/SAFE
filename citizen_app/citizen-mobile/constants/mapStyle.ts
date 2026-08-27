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

export const CARTO_VOYAGER_TILE_URL = 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_STYLE_JSON: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles-v2': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-tiles-layer-v2', type: 'raster', source: 'osm-tiles-v2', minzoom: 0, maxzoom: 22 }],
};
