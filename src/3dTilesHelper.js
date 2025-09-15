import * as itowns from 'itowns';
import { createHTMLListFromObject } from './gui';
import { MathUtils, Vector3, Triangle } from 'three';
import { setFeatureId } from './shaders';

let lastHighlightedObject = null;

// Copied straight from itowns. Shall be exposed in OGC3DTilesLayer...
export async function getFeatures(intersection) {
    const { point, object, face, faceIndex } = intersection;
    const { meshFeatures } = object.userData;

    const barycoord = new Vector3();
    if (face) {
        const position = object.geometry.getAttribute('position');
        const triangle = new Triangle().setFromAttributeAndIndices(
            position,
            face.a,
            face.b,
            face.c,
        );
        triangle.a.applyMatrix4(object.matrixWorld);
        triangle.b.applyMatrix4(object.matrixWorld);
        triangle.c.applyMatrix4(object.matrixWorld);
        triangle.getBarycoord(point, barycoord);
    } else {
        barycoord.set(0, 0, 0);
    }

    return meshFeatures.getFeaturesAsync(faceIndex, barycoord);
}

export function hightlight(event, pickingArg) {
    const { view, layer } = pickingArg;
    const intersections = view.pickObjectsAt(event, 5, layer);
    const intersection = intersections[0];
    if (intersection) {
        const { object } = intersection;

        getFeatures(intersection).then((featId) => {
            if (lastHighlightedObject) {
                setFeatureId(lastHighlightedObject.material, -1);
            }
            setFeatureId(object.material, featId);
            lastHighlightedObject = object;
            view.notifyChange(layer);
        });
    } else {
        if (lastHighlightedObject) {
            setFeatureId(lastHighlightedObject.material, -1);
            view.notifyChange(layer);
        }
    }
}

export function fillHTMLWithPickingInfo(event, pickingArg) {
    const { htmlDiv, view, layer } = pickingArg;

    // Remove content already in html div
    while (htmlDiv.firstChild) {
        htmlDiv.removeChild(htmlDiv.firstChild);
    }

    // Get intersected objects
    const intersects = view.pickObjectsAt(event, 5, layer);

    // Get information from intersected objects (from the batch table and
    // eventually the 3D Tiles extensions
    const closestC3DTileFeature =
        layer.getC3DTileFeatureFromIntersectsArray(intersects);

    if (closestC3DTileFeature) {
        // eslint-disable-next-line
        htmlDiv.appendChild(createHTMLListFromObject(closestC3DTileFeature));
    }

    layer.getMetadataFromIntersections(intersects).then((metadata) => {
        // eslint-disable-next-line
        metadata?.forEach(m => htmlDiv.appendChild(createHTMLListFromObject(m)));
    });
}

function zoomToSphere(view, tile, sphere) {
    const transform = tile.cached.transform;

    const center = new Vector3().fromArray(sphere).applyMatrix4(transform);
    const radius = sphere[3] * transform.getMaxScaleOnAxis();

    // Get the distance to sphere where the diameter cover the whole screen
    // This is similar to SSE computation where sse = screen height.
    const fov = view.camera3D.fov * MathUtils.DEG2RAD;
    const distance = radius * Math.tan(fov * 2);

    return {
        coord: new itowns.Coordinates('EPSG:4978').setFromVector3(center),
        range: distance + radius,
    };
}

function zoomToBox(view, tile, box) {
    const radius = Math.max(
        new Vector3().fromArray(box, 3).length(),
        new Vector3().fromArray(box, 6).length(),
        new Vector3().fromArray(box, 9).length(),
    );

    // Approximate zoomToBox with sphere
    const sphere = [box[0], box[1], box[2], radius];
    return zoomToSphere(view, tile, sphere);
}

function zoomToRegion(view, region) {
    const extent = new itowns.Extent('EPSG:4326',
        region[0] * MathUtils.RAD2DEG, // west
        region[2] * MathUtils.RAD2DEG, // east
        region[1] * MathUtils.RAD2DEG, // south
        region[3] * MathUtils.RAD2DEG, // north
    );

    return itowns.CameraUtils.getCameraTransformOptionsFromExtent(
        view,
        view.camera3D,
        extent,
    );
}

function zoomToTile(view, tile) {
    const { region, box, sphere } = tile.boundingVolume;

    let cameraTransform;
    if (region) {
        cameraTransform = zoomToRegion(view, region);
    } else if (box) {
        cameraTransform = zoomToBox(view, tile, box);
    } else {
        cameraTransform = zoomToSphere(view, tile, sphere);
    }

    view.controls.lookAtCoordinate({
        coord: cameraTransform.coord,
        range: 1.25 * cameraTransform.range, // zoom out a little bit
        tilt: 60,
    });
}

export function zoomToLayer(view, layer) {
    const root = layer.tilesRenderer.root;
    zoomToTile(view, root);
}
