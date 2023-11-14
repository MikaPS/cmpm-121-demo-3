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
let isPopupOpen = false;
let cacheMomento = new Map<string, string>();

interface LatLng {
  lat: number;
  lng: number;
}

let playerLocation = {
  i: 369995,
  j: -1220535,
};

// Local storage
// Making an interface of all the data we want to save
interface SavedData {
  savedMomentoMap: [string, string][]; // The string momento of the cache
  savedCollectedCoinsList: Geocoin[]; // The list of collected coins
  savedPlayerLocation: Cell; // The current location of the player
}
// Save the data into a var
let mySavedData: SavedData = {
  savedMomentoMap: [],
  savedCollectedCoinsList: [],
  savedPlayerLocation: { i: 369995, j: -1220535 },
};

// Save the current values into the local storage
function saveData() {
  const momentoArray = Array.from(cacheMomento);
  const dataToSave: SavedData = {
    savedMomentoMap: momentoArray,
    savedCollectedCoinsList: collectedCoinsList,
    savedPlayerLocation: playerLocation,
  };
  localStorage.setItem("savedData", JSON.stringify(dataToSave));
}

// Load data from the local storage
function loadData() {
  const savedData = localStorage.getItem("savedData");
  // If we saved data, use it
  if (savedData) {
    mySavedData = JSON.parse(savedData);
    // If there's nothing in local storage, put default values
  } else {
    mySavedData = {
      savedMomentoMap: [],
      savedCollectedCoinsList: [],
      savedPlayerLocation: {
        i: 369995,
        j: -1220535,
      },
    };
  }
}

// Loads data
loadData();
playerLocation = mySavedData.savedPlayerLocation;
let collectedCoinsList = mySavedData.savedCollectedCoinsList;
cacheMomento = new Map(mySavedData.savedMomentoMap);

// Creating a board with cells
const board = new Board(NEIGHBORHOOD_SIZE, GAMEPLAY_ZOOM_LEVEL);
// Creating a map with default settings
const mapContainer = document.querySelector<HTMLElement>("#map")!;
const map = leaflet.map(mapContainer, {
  center: board.getPointForCell(playerLocation),
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});
leaflet
  .tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    }
  )
  .addTo(map);

// Shows player's location on map
const playerMarker = leaflet.marker(board.getPointForCell(playerLocation));
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);
let playerLocations: LatLng[] = [];
makeMultiplePits();
playerLocations.push(board.getPointForCell(playerLocation));

// Write the number of coins that players already collected
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
let collectedCoinsString: string = "";
collectedCoinsList.forEach((coin) => {
  collectedCoinsString +=
    `${coin.mintingLocation.i}:${coin.mintingLocation.j}#${coin.serialNumber}` +
    "<br><br>";
});
statusPanel.innerHTML = `Collected coins: ${collectedCoinsString}`;

function makePit(i: number, j: number) {
  // Draw a rect where the pit is
  const bounds = board.getCellBounds(playerLocation, i, j);
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  layerGroup.addLayer(pit);
  // Momento! If we already have a cache in this location, load it. If not, save the new cache.
  const geocache = new Geocache(board.getCellForPoint(bounds.getNorthWest()));
  const key = board.getCellForPoint(bounds.getNorthWest());
  const keyString = key.i + ":" + key.j;
  if (!cacheMomento.has(keyString)) {
    cacheMomento.set(keyString, geocache.toMomento());
  } else {
    geocache.fromMomento(cacheMomento.get(keyString)!);
  }
  // Pop up for the pits
  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div id = desc>Pit here at "${geocache.cell.i},${geocache.cell.j}" with ${geocache.coins.length} coin(s).</div>
                <button id="deposit"> deposit </button>`;
    const buttonsContainer = document.createElement("div");
    // Update the default values
    updateVal();
    updateCollect();

    // Used to move coins between the collected coins list and geocaches at the pit
    function moveBetweenArrays(
      coin: Geocoin,
      source: Geocoin[],
      dest: Geocoin[]
    ) {
      // Get the index of the coin if it's on the list. Remove it from the list and add it to another
      let index = geocache.coins.indexOf(coin);
      if (index !== -1) {
        source.splice(index, 1);
        dest.push(coin);
        updateVal();
        updateCollect();
      }
    }

    // Used after pressing collect
    function updateCollect() {
      buttonsContainer.innerHTML = "";
      // Adds buttons for all the geocoins at the pit in a user readable
      // --> needs to be called after collecting/deposting coins so we wouldn't have buttons for non existent coins
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
      // Update the momentos + save to local cache
      const key = board.getCellForPoint(bounds.getNorthWest());
      const keyString = key.i + ":" + key.j;
      cacheMomento.set(keyString, geocache.toMomento());
      saveData();

      container.appendChild(buttonsContainer);
    }

    // Update all the text fields (there are x coins and collected coins)
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

    // Deposit button for each pit
    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (collectedCoinsList.length > 0) {
        geocache.coins.push(collectedCoinsList.pop()!);
        updateVal();
        updateCollect();
      }
    });
    const key = board.getCellForPoint(bounds.getNorthWest());
    const keyString = key.i + ":" + key.j;
    cacheMomento.set(keyString, geocache.toMomento());
    saveData();
    return container;
  });
  // Checks if the pit is open/close so player's location wouldn't update while it's open
  pit.on("popupclose", () => {
    isPopupOpen = false;
  });
  pit.on("popupopen", () => {
    isPopupOpen = true;
  });
}

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
  // Have an array for all the locations of the player and make a line through it
  playerLocations.push(board.getPointForCell(playerLocation));
  let line = leaflet.polyline(playerLocations, { color: "red" }).addTo(map);
  lines.push(line);
  makeMultiplePits();
  saveData();
}

// Buttons for each of the directions
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
  clearInterval(interval);
  saveData();
});

let interval = 0;
// Sensor button, gets the player's current location
const sensor = document.querySelector<HTMLDivElement>("#sensor")!;
sensor.addEventListener("click", () => {
  // If the first movement is clicking the sensor, delete the location of the merrill classroom
  if (playerLocation.i == 369995 && playerLocation.j == -1220535) {
    playerLocations.pop();
  }
  getCurrentLocation();
  interval = setInterval(getCurrentLocation, 1000);
});

function getCurrentLocation() {
  if (!isPopupOpen) {
    navigator.geolocation.getCurrentPosition((position) => {
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
  }
}
