import leaflet from "leaflet";
import luck from "./luck";

interface Cell {
  readonly i: number;
  readonly j: number;
}

export interface Geocoin {
  mintingLocation: Cell;
  serialNumber: number;
}

export class Geocache {
  coins: Geocoin[];
  cell: Cell;

  constructor(cell: Cell) {
    this.cell = cell;
    const numInitialCoins = Math.floor(
      luck(["intialCoins", cell.i, cell.j].toString()) * 3
    );
    this.coins = [];
    for (let i = 1; i <= numInitialCoins; i++) {
      this.coins.push({ mintingLocation: cell, serialNumber: i });
    }
  }
}

// What's visible to the player
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

  // Creates cells at specific points
  getCellForPoint(point: leaflet.LatLng): Cell {
    const step = 0.0001;
    const i = Math.round(point.lat / step);
    const j = Math.round(point.lng / step);
    const cell = { i, j };
    return this.getCanonicalCell(cell);
  }

  getPointForCell(cell: Cell) {
    const step = 0.0001;
    const point = leaflet.latLng({
      lat: cell.i * step,
      lng: cell.j * step,
    });
    return point;
  }

  getCellBounds(
    cell: Cell,
    latBound: number,
    lngBound: number
  ): leaflet.LatLngBounds {
    const { lat, lng } = this.getPointForCell(cell);
    const TILE_DEGREES = 1e-4;
    const bounds = leaflet.latLngBounds([
      [lat + latBound * TILE_DEGREES, lng + lngBound * TILE_DEGREES],
      [
        lat + (latBound + 1) * TILE_DEGREES,
        lng + (lngBound + 1) * TILE_DEGREES,
      ],
    ]);
    return bounds;
  }

  // getCellsNearPoint(point: leaflet.LatLng): Cell[] {
  //   const resultCells: Cell[] = [];
  //   const originCell = this.getCellForPoint(point);
  //   // ...
  //   return resultCells;
  // }
}
