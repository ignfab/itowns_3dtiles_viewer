/**
 * This file is the entrypoint for webpack
 * See webpack.config.js
 */

import * as itowns from 'itowns';
import * as widgets from 'itowns/widgets';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AmbientLight, PMREMGenerator } from 'three';
import { fillHTMLWithPickingInfo, zoomToLayer } from './3dTilesHelper';

var positionOnGlobe = {
    coord: new itowns.Coordinates('EPSG:4326', 2.349804, 48.853054),
    range: 650,
    tilt: 32,
    heading: 8.30
};

var viewerDiv = document.getElementById('viewerDiv');
var view = new itowns.GlobeView(viewerDiv, positionOnGlobe);

itowns.enableMeshoptDecoder(MeshoptDecoder);

// Interface
// Navigation menu
const navbar = new widgets.Navigation(view);
// Example on how to add a new button to the navbar menu
navbar.addButton(
    'rotate-up',
    '<p style="font-size: 20px">&#8595</p>',
    'rotate camera up',
    () => {
        view.controls.lookAtCoordinate({
            tilt: view.controls.getTilt() - 10,
            time: 500,
        });
    },
    'button-bar-rotation',
);
navbar.addButton(
    'rotate-down',
    '<p style="font-size: 20px">&#8593</p>',
    'rotate camera down',
    () => {
        view.controls.lookAtCoordinate({
            tilt: view.controls.getTilt() + 10,
            time: 500,
        });
    },
    'button-bar-rotation',
);
navbar.addButton(
    'reset-position',
    '&#8634',
    'reset position',
    () => { view.controls.lookAtCoordinate(positionOnGlobe) },
);
// Search bar
function lookAtCoordinate(coordinates) {
    view.controls.lookAtCoordinate({ coord: coordinates, range: 20000, tilt: 45, heading: 0 });
}
// Define options for geocoding service that should be used by the searchbar.
const geocodingOptions = {
    url: new URL(
        'https://data.geopf.fr/geocodage/completion?' +
        'text=&type=StreetAddress,PositionOfInterest',
    ),
    // As specified in the doc (http://www.itowns-project.org/itowns/docs/#api/Widgets/Searchbar),
    // the parser method must parse the geocoding service response into a Map object.
    // For each item of this Map, the key is a string that is displayed in the suggestions bellow
    // the searchbar, and the value is whatever
    // the user wants. The value is the parameter that is passed to the `onSelected` method when a
    // suggestion is clicked. Here, we se the value as the `Coordinates` associated to the location.
    parser: (response) => {
        const map = new Map();
        response.results.forEach(location => {
            map.set(location.fulltext, new itowns.Coordinates('EPSG:4326', location.x, location.y));
        });
        return map;
    },
    onSelected: lookAtCoordinate,
}
// Create the searchbar
const searchbar = new widgets.Searchbar(view, geocodingOptions, {
    // We want to display at maximum 15 location suggestions when typing the searchbar.
    maxSuggestionNumber: 15,
    placeholder: 'Search a location in France',
});


// Add ortho layer
itowns.Fetcher.json('Ortho.json').then((config) => {
    const colorLayer = new itowns.ColorLayer('Ortho', {
        ...config,
        source: new itowns.WMTSSource(config.source),
    });
    view.addLayer(colorLayer);
});

// Add elevation layer
function addElevationLayerFromConfig(config) {
    config.source = new itowns.WMTSSource(config.source);
    var elevationLayer = new itowns.ElevationLayer(config.id, config);
    view.addLayer(elevationLayer);
}
itowns.Fetcher.json('IGN_MNT_HIGHRES.json').then(addElevationLayerFromConfig);

// Create 3Dtiles layer
const source = new itowns.OGC3DTilesSource({ url: "https://domain.com/idf_roofer/data/tileset.json" });
const tilesLayer = new itowns.OGC3DTilesLayer('3DTiles', {
    source,
    pntsSizeMode: itowns.PNTS_SIZE_MODE.ATTENUATED
});

// Set the environment map for all physical materials in the scene.
// Otherwise, mesh with only diffuse colors will appear black.
const environment = new RoomEnvironment();
const pmremGenerator = new PMREMGenerator(view.renderer);
view.scene.environment = pmremGenerator.fromScene(environment).texture;
pmremGenerator.dispose();

// Add ambient light to globally illuminates all objects
const light = new AmbientLight(0x404040, 40);
view.scene.add(light);

const pickingArgs = {
    htmlDiv: document.getElementById('featureInfo'),
    view,
    layer: tilesLayer,
};

// Add 3Dtiles layer to our view
view.addLayer(tilesLayer).then((layer) => {
    window.addEventListener('click',
        (event) => fillHTMLWithPickingInfo(event, pickingArgs), false);
});
