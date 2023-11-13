import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board";
import { Geocache } from "./board";
import { Geocoin } from "./board";
import { Cell } from "./board";

const GAMEPLAY_ZOOM_LEVEL = 19;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;
const TILE_DEGREES = 1;
const layerGroup = leaflet.layerGroup();
let cacheMomento = new Map<Cell, string>();

// Local storage
interface SavedData {
  savedMomentoMap: Map<Cell, string>;
  savedCollectedCoinsList: Geocoin[];
  savedPlayerLocation: Cell;
}
let mySavedData: SavedData = {
  savedMomentoMap: new Map<Cell, string>(),
  savedCollectedCoinsList: [],
  savedPlayerLocation: { i: 369995, j: -1220535 },
};

function saveData() {
  // console.log(collectedCoinsList);
  const dataToSave: SavedData = {
    savedMomentoMap: cacheMomento,
    savedCollectedCoinsList: collectedCoinsList,
    savedPlayerLocation: playerLocation,
  };
  localStorage.setItem("savedData", JSON.stringify(dataToSave));
}

function loadData() {
  const savedData = localStorage.getItem("savedData");
  if (savedData) {
    mySavedData = JSON.parse(savedData);
    // console.log("saved data: ", mySavedData);
  } else {
    // console.log("here");
    // If no saved data is found, initialize with default values
    mySavedData = {
      savedMomentoMap: new Map<Cell, string>(),
      savedCollectedCoinsList: [],
      savedPlayerLocation: {
        i: 369995,
        j: -1220535,
      },
    };
  }
}

interface LatLng {
  lat: number;
  lng: number;
}
let playerLocation = {
  i: 369995,
  j: -1220535,
};

let collectedCoinsList: Geocoin[] = [];

loadData();
playerLocation = mySavedData.savedPlayerLocation;
// cacheMomento = mySavedData.savedMomentoMap;
// console.log(cacheMomento);
collectedCoinsList = mySavedData.savedCollectedCoinsList;

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
makeMultiplePits();
// Shows player's location on map
const playerMarker = leaflet.marker(board.getPointForCell(playerLocation));
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);
let playerLocations: LatLng[] = [];
// Merrill classroom unless clicknig on sensor button
makeMultiplePits();
playerLocations.push(board.getPointForCell(playerLocation));

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";
let collectedCoinsString: string = "";
collectedCoinsList.forEach((coin) => {
  collectedCoinsString +=
    `${coin.mintingLocation.i}:${coin.mintingLocation.j}#${coin.serialNumber}` +
    "<br><br>";
});
statusPanel.innerHTML = `Collected coins: ${collectedCoinsString}`;

function makePit(i: number, j: number) {
  const bounds = board.getCellBounds(playerLocation, i, j);
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  layerGroup.addLayer(pit);
  board.getCellForPoint(bounds.getNorthWest());
  // Momento! If we already have a cache in this location, load it. If not, save the new cache.
  const geocache = new Geocache(board.getCellForPoint(bounds.getNorthWest()));
  const key = board.getCellForPoint(bounds.getNorthWest());
  if (!cacheMomento.has(key)) {
    cacheMomento.set(key, geocache.toMomento());
  } else {
    geocache.fromMomento(cacheMomento.get(key)!);
  }
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
        collect.innerHTML = `collect ${Math.round(coin.mintingLocation.i)}:${
          coin.mintingLocation.j
        }#${coin.serialNumber}`;
        collect.addEventListener("click", () =>
          moveBetweenArrays(coin, geocache.coins, collectedCoinsList)
        );
        buttonsContainer.appendChild(collect);
      });
      cacheMomento.set(
        board.getCellForPoint(bounds.getNorthWest()),
        geocache.toMomento()
      );

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
      saveData();
    }

    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (collectedCoinsList.length > 0) {
        geocache.coins.push(collectedCoinsList.pop()!);
        updateCollect();
        updateVal();
      }
    });
    cacheMomento.set(
      board.getCellForPoint(bounds.getNorthWest()),
      geocache.toMomento()
    );
    return container;
  });
}
// makeMultiplePits();

// Clear old caches, and generate new ones based on the player's location and a
function makeMultiplePits() {
  layerGroup.clearLayers();
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      // Use the location of the cache for the luck so it would be the same no matter what bounds it's in
      const bounds = board.getCellBounds(playerLocation, i, j);
      if (luck([bounds.getNorthWest()].toString()) < PIT_SPAWN_PROBABILITY) {
        makePit(i, j);
        layerGroup.addTo(map);
      }
    }
  }
}
let lines: L.Polyline[] = [];
// Moving buttons
function changePlayerLocation(i: number, j: number) {
  // console.log(playerLocation);
  playerLocation.i += i * TILE_DEGREES;
  playerLocation.j += j * TILE_DEGREES;
  playerMarker.setLatLng(board.getPointForCell(playerLocation));
  map.setView(
    [
      board.getPointForCell(playerLocation).lat,
      board.getPointForCell(playerLocation).lng,
    ],
    GAMEPLAY_ZOOM_LEVEL
  );
  playerLocations.push(board.getPointForCell(playerLocation));
  // console.log(playerLocations);
  let line = leaflet.polyline(playerLocations, { color: "red" }).addTo(map);
  lines.push(line);
  makeMultiplePits();
  saveData();
}

const north = document.querySelector<HTMLDivElement>("#north")!;
north.addEventListener("click", () => {
  changePlayerLocation(1, 0);
});
const south = document.querySelector<HTMLDivElement>("#south")!;
south.addEventListener("click", () => {
  changePlayerLocation(-1, 0);
});
const west = document.querySelector<HTMLDivElement>("#west")!;
west.addEventListener("click", () => {
  changePlayerLocation(0, -1);
});
const east = document.querySelector<HTMLDivElement>("#east")!;
east.addEventListener("click", () => {
  changePlayerLocation(0, 1);
});

let watchId = 0;
// Reset button, reset caches through the momento
const reset = document.querySelector<HTMLDivElement>("#reset")!;
reset.addEventListener("click", () => {
  cacheMomento.clear();
  lines.forEach((line) => {
    line.remove();
  });
  lines = [];
  playerLocations = [];
  playerLocations.push(board.getPointForCell(playerLocation));
  collectedCoinsList = [];
  collectedCoinsString = "";
  statusPanel.innerHTML = `Collected coins: ${collectedCoinsString}`;
  navigator.geolocation.clearWatch(watchId);

  // makeMultiplePits();
});

// Sensor button, gets the player's current location
const sensor = document.querySelector<HTMLDivElement>("#sensor")!;
sensor.addEventListener("click", () => {
  // If the first movement is clicking the sensor, delete the location of the merrill classroom
  if (playerLocation.i == 369995 && playerLocation.j == -1220535) {
    playerLocations.pop();
  }
  // Gets real time player location
  //   map.locate({ setView: true, watch: true, enableHighAccuracy: true });
  //   map.on("locationfound", (e: L.LocationEvent) => {
  //     playerMarker.setLatLng([e.latlng.lat, e.latlng.lng]);
  //     playerLocation = board.getCellForPoint(e.latlng);
  //     makeMultiplePits();
  //     playerLocations.push(board.getPointForCell(playerLocation));
  //   });
  watchId = navigator.geolocation.watchPosition((position) => {
    // console.log("watch pos", position.coords);
    const { latitude, longitude } = position.coords;
    const cell: leaflet.LatLng = leaflet.latLng(latitude, longitude);
    map.setView(cell);
    playerMarker.setLatLng([latitude, longitude]);
    playerLocation = board.getCellForPoint(cell);
    playerLocations.push(board.getPointForCell(playerLocation));
    let line = leaflet.polyline(playerLocations, { color: "red" }).addTo(map);
    lines.push(line);
    makeMultiplePits();
  });
});
