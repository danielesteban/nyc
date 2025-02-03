import { parentPort } from 'worker_threads';
import * as turf from '@turf/turf';

// I found this code at:
// https://louisz.medium.com/how-to-find-the-maximum-rectangle-within-a-convex-gis-polygon-in-javascript-16364e8f7f4
// Seems to work fine for most cases. It can prolly be optimized, tho.
// But since it only needs to run offline once I haven't bothered.

function maxRect(coords) {
  let polygon = turf.polygon([coords]);

  const unitsOption = {units: 'kilometers'};
  let polyline, length, bbox, percentage1, percentage2, fraction, point1, point2, bearing;
  let point1a, point1b, point2a, point2b, line1, line2;
  let largest, diagonalLength;

  polyline = turf.polygonToLine(polygon);
  length = turf.length(polyline, unitsOption);
  bbox = turf.bbox(polygon);
  diagonalLength = turf.length(turf.lineString([[bbox[0], bbox[1]], [bbox[2], bbox[3]]]));

  const SEARCH_PARTS = 20;
  for (let i = 0; i < SEARCH_PARTS; i++) {
    percentage1 = i / SEARCH_PARTS;
    point1 = turf.along(polyline, percentage1 * length, unitsOption);

    for (let j = 1; j < SEARCH_PARTS; j++) {
      fraction = j / SEARCH_PARTS;
      percentage2 = percentage1 + fraction;

      if (percentage2 > 1) { percentage2 -= 1; }

      let distance = percentage2 * length;
      point2 = turf.along(polyline, distance, unitsOption);
      
      //process as side
      //get bearing between points
      bearing = turf.bearing(point1, point2);

      //create perpendicual lines at start and end
      point1a = turf.destination(point1, diagonalLength, bearing + 90, unitsOption);
      point1b = turf.destination(point1, diagonalLength, bearing - 90, unitsOption);
      line1 = turf.lineString([turf.getCoord(point1a), turf.getCoord(point1b)]);

      point2a = turf.destination(point2, diagonalLength, bearing + 90, unitsOption);
      point2b = turf.destination(point2, diagonalLength, bearing - 90, unitsOption);
      line2 = turf.lineString([turf.getCoord(point2a), turf.getCoord(point2b)]);       

      //intersect by polygon (assume single parts)
      let intersect1 = turf.lineIntersect(line1, polygon);
      let intersect2 = turf.lineIntersect(line2, polygon);

      let intersectObjArray = [];
      turf.coordAll(intersect1)
      .filter(coord => {
        return turf.distance(point1, turf.point(coord), unitsOption) > 0.001;
      })
      .forEach(coord => {
        intersectObjArray.push({
          coord: coord,
          origin: turf.getCoord(point1),
          opp: turf.getCoord(point2),
          oppLine: line2,
          p: point1,
          op: point2,
        });
      });

      turf.coordAll(intersect2)
      .filter(coord => {
        return turf.distance(point2, turf.point(coord), unitsOption) > 0.001; 
      })
      .forEach(coord => {
        intersectObjArray.push({
          coord: coord,
          origin: turf.getCoord(point2),
          opp: turf.getCoord(point1),
          oppLine: line1,
          p: point2,
          op: point1,
        });
      });

      if (intersectObjArray.length === 0)
        continue;

      intersectObjArray.forEach((obj, k) => {
        const { origin, coord, opp, oppLine, p, op } = obj;
        let dest = turf.destination(
          turf.point(coord), 
          turf.distance(p, op, unitsOption),
          turf.bearing(p, op),
          unitsOption
        );

        //form rectangle and add to dest
        let coords = [
          origin, opp,
          turf.getCoord(dest), 
          coord, origin,
        ];

        let rectangle = turf.polygon([[...coords]]);

        //all 4 coordinates must be within the polygon
        //what has been sliced by polygon should be empty
        if (
          !turf.booleanContains(polygon, rectangle) 
          || turf.flatten(turf.difference(turf.featureCollection([rectangle, polygon])) || turf.featureCollection([])).features.length > 0
        ) {
          return;
        }
        
        if (largest === undefined || turf.area(rectangle) > turf.area(largest)) {
          largest = rectangle;
        }
      });
    }
  }

  return largest;
}

parentPort.on('message', (coords) => {
  let rect;
  try {
    rect = maxRect(coords);
  } catch (e) {}
  parentPort.postMessage(rect && rect.geometry.coordinates[0].map((p) => turf.toMercator(p)));
});
