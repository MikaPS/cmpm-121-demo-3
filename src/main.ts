import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board";
import { Geocache } from "./board";
import { Geocoin } from "./board";

const GAMEPLAY_ZOOM_LEVEL = 19;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Creating a board with cells
const board = new Board(NEIGHBORHOOD_SIZE, GAMEPLAY_ZOOM_LEVEL);
// const coinBoard = new CoinBoard(NEIGHBORHOOD_SIZE, GAMEPLAY_ZOOM_LEVEL);
const playerLocation = board.getCellForPoint(MERRILL_CLASSROOM);

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";
// let collectedCoinsList: string;
let collectedCoinsList: Geocoin[] = [];
let collectedCoinsString: string;

function makePit(i: number, j: number) {
  const bounds = board.getCellBounds(playerLocation, i, j);
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  board.getCellForPoint(bounds.getNorthWest());
  const geocache = new Geocache(board.getCellForPoint(bounds.getNorthWest()));
  let coinString = "";

  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div id = desc>Pit here at "${geocache.cell.i},${geocache.cell.j}" with ${geocache.coins.length} coin(s).</div>
                <button id="poke">poke</button>
                <button id="deposit"> deposit </button>
                <div id="cointainer"> </div>`;
    const cointainer =
      container.querySelector<HTMLButtonElement>("#cointainer")!;
    updateVal();

    function updateVal() {
      const desc = container.querySelector<HTMLButtonElement>("#desc")!;
      desc.innerHTML = `Pit here at "${geocache.cell.i},${geocache.cell.j}" with ${geocache.coins.length} coin(s).`;
      coinString = "";
      geocache.coins.forEach((coin) => {
        coinString +=
          `${coin.mintingLocation.i}:${coin.mintingLocation.j}#${coin.serialNumber}` +
          "<br><br>";
      });
      cointainer.innerHTML = coinString;

      collectedCoinsString = "";
      collectedCoinsList.forEach((coin) => {
        collectedCoinsString +=
          `${coin.mintingLocation.i}:${coin.mintingLocation.j}#${coin.serialNumber}` +
          "<br><br>";
      });
      statusPanel.innerHTML = `Collected coins: ${collectedCoinsString}`;
    }

    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    poke.addEventListener("click", () => {
      if (geocache.coins.length > 0) {
        collectedCoinsList.push(geocache.coins.pop()!);
        updateVal();
      }
    });

    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (collectedCoinsList.length > 0) {
        geocache.coins.push(collectedCoinsList.pop()!);
        updateVal();
      }
    });
    return container;
  });

  pit.addTo(map);
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
      makePit(i, j);
    }
  }
}
