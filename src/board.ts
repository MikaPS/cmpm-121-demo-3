import leaflet from "leaflet";

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();

    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, { i, j });
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const step = 0.0001;
    const i = Math.round(point.lat / step);
    const j = Math.round(point.lng / step);
    const cell = { i, j };
    return this.getCanonicalCell(cell);
  }

  //   getCellBounds(cell: Cell): leaflet.LatLngBounds {
  //     const { i, j } = cell;
  //     const TILE_DEGREES = 1e-4;

  //     // const bounds = leaflet.latLngBounds([
  //     //   [
  //     //     MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
  //     //     MERRILL_CLASSROOM.lng + j * TILE_DEGREES,
  //     //   ],
  //     //   [
  //     //     MERRILL_CLASSROOM.lat + (i + 1) * TILE_DEGREES,
  //     //     MERRILL_CLASSROOM.lng + (j + 1) * TILE_DEGREES,
  //     //   ],
  //     // ]);
  //     return bounds;
  //   }

  //   getCellsNearPoint(point: leaflet.LatLng): Cell[] {
  //     const resultCells: Cell[] = [];
  //     // const originCell = this.getCellForPoint(point);
  //     // ...
  //     return resultCells;
  //   }
}
