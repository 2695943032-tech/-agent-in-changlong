"""Create configurable 50m Agent geofences for the Chimelong raster map."""

from __future__ import annotations

import json
import math
from pathlib import Path


OUTPUT = Path(r"C:\Users\Zyanya\Documents\ai大赛\output\map-tiles\geofences.geojson")
TOP_LEFT_LONGITUDE = 113.30305172543962
TOP_LEFT_LATITUDE = 23.01306960279202
DEGREES_PER_PIXEL = 0.000001
RADIUS_METERS = 50
METERS_PER_DEGREE_LATITUDE = 111_320

# These centres are visually located on the supplied illustrated map.  Keep
# the values configurable: a future survey/GIS source can replace a centre
# without changing the runtime trigger rule.
EXHIBITS = (
    {"id": "panda", "name": "大熊猫展区", "agent": "团团", "centerPixel": [7480, 8400]},
    {"id": "giraffe", "name": "长颈鹿展区", "agent": "长乐", "centerPixel": [5200, 9600]},
    {"id": "elephant", "name": "亚洲象展区", "agent": "澜澜", "centerPixel": [7200, 12500]},
    {"id": "ape", "name": "灵长类展区", "agent": "阿悟", "centerPixel": [5400, 7200]},
    {"id": "white-tiger", "name": "白虎展区", "agent": "凯凯", "centerPixel": [6400, 11500]},
    {"id": "koala", "name": "考拉展区", "agent": "悠米", "centerPixel": [8000, 10000]},
)


def pixel_to_lng_lat(x: float, y: float) -> tuple[float, float]:
    return (
        TOP_LEFT_LONGITUDE + x * DEGREES_PER_PIXEL,
        TOP_LEFT_LATITUDE - y * DEGREES_PER_PIXEL,
    )


def buffer_polygon(x: float, y: float, radius_m: float, points: int = 64) -> list[list[float]]:
    """Approximate a local 50m geodesic circle as a WGS84 GeoJSON polygon."""
    center_lng, center_lat = pixel_to_lng_lat(x, y)
    lat_delta = radius_m / METERS_PER_DEGREE_LATITUDE
    lng_delta = radius_m / (METERS_PER_DEGREE_LATITUDE * math.cos(math.radians(center_lat)))
    ring = [
        [
            center_lng + math.cos(2 * math.pi * point / points) * lng_delta,
            center_lat + math.sin(2 * math.pi * point / points) * lat_delta,
        ]
        for point in range(points)
    ]
    ring.append(ring[0])
    return ring


def main() -> None:
    features = []
    for exhibit in EXHIBITS:
        x, y = exhibit["centerPixel"]
        lng, lat = pixel_to_lng_lat(x, y)
        features.append(
            {
                "type": "Feature",
                "properties": {
                    **exhibit,
                    "trigger": "enter",
                    "radiusMeters": RADIUS_METERS,
                    "radiusPixels": {
                        "x": round(RADIUS_METERS / (DEGREES_PER_PIXEL * METERS_PER_DEGREE_LATITUDE * math.cos(math.radians(lat))), 1),
                        "y": round(RADIUS_METERS / (DEGREES_PER_PIXEL * METERS_PER_DEGREE_LATITUDE), 1),
                    },
                    "coordinateVerification": "draft_from_raster_visual; verify with park GIS before production",
                },
                "geometry": {"type": "Polygon", "coordinates": [buffer_polygon(x, y, RADIUS_METERS)]},
            }
        )

    collection = {
        "type": "FeatureCollection",
        "name": "chimelong-agent-50m-geofences",
        "metadata": {
            "radiusMeters": RADIUS_METERS,
            "sourceCoordinateSystem": "local WGS84-like degrees; source TIFF does not declare a CRS",
            "triggerPolicy": "Trigger exactly once when the visitor crosses from outside to inside. Reset only after leaving beyond the hysteresis distance.",
            "exitHysteresisMeters": 60,
        },
        "features": features,
    }
    OUTPUT.write_text(json.dumps(collection, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(features)} 50m geofences to {OUTPUT}")


if __name__ == "__main__":
    main()
