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

const playerLocation = {
  i: 369995,
  j: -1220535,
};
const mapContainer = document.querySelector<HTMLElement>("#map")!;
// Creating a board with cells
const board = new Board(NEIGHBORHOOD_SIZE, GAMEPLAY_ZOOM_LEVEL);

const map = leaflet.map(mapContainer, {
  center: board.getPointForCell(playerLocation),
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(board.getPointForCell(playerLocation));
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";
let collectedCoinsList: Geocoin[] = [];
let collectedCoinsString: string;

function makePit(i: number, j: number) {
  const bounds = board.getCellBounds(playerLocation, i, j);
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  board.getCellForPoint(bounds.getNorthWest());
  const geocache = new Geocache(board.getCellForPoint(bounds.getNorthWest()));

  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div id = desc>Pit here at "${geocache.cell.i},${geocache.cell.j}" with ${geocache.coins.length} coin(s).</div>
                <button id="deposit"> deposit </button>`;
    const buttonsContainer = document.createElement("div");

    updateVal();
    updateCollect();

    function moveBetweenArrays(
      coin: Geocoin,
      source: Geocoin[],
      dest: Geocoin[]
    ) {
      let index = geocache.coins.indexOf(coin);
      if (index !== -1) {
        source.splice(index, 1);
        dest.push(coin);
        updateVal();
        updateCollect();
      }
    }

    function updateCollect() {
      buttonsContainer.innerHTML = "";

      geocache.coins.forEach((coin) => {
        const collect = document.createElement("button");
        collect.innerHTML = `collect ${Math.round(
          coin.mintingLocation.i
        )}:${Math.round(coin.mintingLocation.j)}#${coin.serialNumber}`;
        collect.addEventListener("click", () =>
          moveBetweenArrays(coin, geocache.coins, collectedCoinsList)
        );
        buttonsContainer.appendChild(collect);
      });

      container.appendChild(buttonsContainer);
    }

    function updateVal() {
      const desc = container.querySelector<HTMLButtonElement>("#desc")!;
      desc.innerHTML = `Pit here at "${geocache.cell.i},${geocache.cell.j}" with ${geocache.coins.length} coin(s).`;
      collectedCoinsString = "";
      collectedCoinsList.forEach((coin) => {
        collectedCoinsString +=
          `${coin.mintingLocation.i}:${coin.mintingLocation.j}#${coin.serialNumber}` +
          "<br><br>";
      });
      statusPanel.innerHTML = `Collected coins: ${collectedCoinsString}`;
    }

    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (collectedCoinsList.length > 0) {
        geocache.coins.push(collectedCoinsList.pop()!);
        updateCollect();
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
