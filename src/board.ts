import leaflet from "leaflet";
import luck from "./luck";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export interface Geocoin {
  mintingLocation: Cell;
  serialNumber: number;
}

export class Geocache implements Momento<string> {
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

  toMomento() {
    let s = `${this.cell.i}:${this.cell.j}|`;
    this.coins.forEach((coin) => {
      console.log(
        "coin: ",
        `${coin.mintingLocation.i}:${coin.mintingLocation.j}:${coin.serialNumber}|`
      );

      s += `${coin.mintingLocation.i}:${coin.mintingLocation.j}:${coin.serialNumber}|`;
    });
    return s;
  }

  fromMomento(momento: string) {
    console.log("original momento: ", momento);
    this.coins = [];
    let cell = momento.split("|", 1);
    let coords = cell[0].split(":", 1);
    let i = parseInt(coords[0]);
    let j = parseInt(coords[1]);
    this.cell = { i, j };

    let coins = momento.split("|");
    coins.forEach((c) => {
      console.log("c is: ", c);
      let val = c.split(":");
      // let val1 = c.split("");
      let i = parseInt(val[0]);
      let j = parseInt(val[1]);
      // let se
      // if (val[2] != undefined) {
      //   let ser = parseInt(val[2]);
      // }
      // console.log("serial number: ", val);
      this.coins.push({
        mintingLocation: { i, j },
        serialNumber: parseInt(val[2]),
      });
    });
  }
}

// What's visible to the player
export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  readonly knownCells: Map<string, Cell>;

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
    // console.log(bounds);
    return bounds;
  }

  // getCellsNearPoint(point: leaflet.LatLng): Cell[] {
  //   const resultCells: Cell[] = [];
  //   const originCell = this.getCellForPoint(point);
  //   // ...
  //   return resultCells;
  // }
}
