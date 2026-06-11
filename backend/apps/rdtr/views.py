"""
RDTR API views — Phase 3 (mock spatial, no live OneMap).

Endpoints:
  GET /api/v1/rdtr/zones/                  — list all mock zones (GeoJSON collection)
  GET /api/v1/rdtr/zones/<code>/           — single zone detail + KBLI compatibility
  GET /api/v1/rdtr/lookup/?lat=&lng=       — point-in-zone lookup (mock bbox check)
  GET /api/v1/rdtr/kbli-check/?kbli=&zone= — KBLI compatibility for a zone
"""
from rest_framework import serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import KBLICompatibility, RDTRZone


# ── Serializers ───────────────────────────────────────────────────────────────

class RDTRZoneListSerializer(serializers.ModelSerializer):
    class Meta:
        model = RDTRZone
        fields = [
            "id", "zone_code", "name", "zone_type", "bbox",
            "allowed_sektors", "description", "source",
        ]


class KBLICompatSerializer(serializers.ModelSerializer):
    class Meta:
        model = KBLICompatibility
        fields = ["kbli_code", "kbli_name", "is_compatible", "requires_special_permit", "notes"]


class RDTRZoneDetailSerializer(serializers.ModelSerializer):
    kbli_compat = KBLICompatSerializer(many=True)

    class Meta:
        model = RDTRZone
        fields = [
            "id", "zone_code", "name", "zone_type", "bbox", "geojson",
            "allowed_sektors", "allowed_kbli_codes", "description", "source",
            "kbli_compat",
        ]


# ── Views ─────────────────────────────────────────────────────────────────────

class ZoneListView(APIView):
    """Return all zones as a GeoJSON FeatureCollection for MapLibre."""
    permission_classes = [AllowAny]

    def get(self, request):
        zones = RDTRZone.objects.prefetch_related("kbli_compat")
        features = []
        for zone in zones:
            geom = zone.geojson if zone.geojson else _bbox_to_polygon(zone.bbox)
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "zone_code": zone.zone_code,
                        "name": zone.name,
                        "zone_type": zone.zone_type,
                        "allowed_sektors": zone.allowed_sektors,
                        "description": zone.description,
                    },
                    "geometry": geom,
                }
            )
        return Response({"type": "FeatureCollection", "features": features})


class ZoneDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, zone_code):
        try:
            zone = RDTRZone.objects.prefetch_related("kbli_compat").get(zone_code=zone_code)
        except RDTRZone.DoesNotExist:
            return Response({"detail": "Zona tidak ditemukan."}, status=404)
        return Response(RDTRZoneDetailSerializer(zone).data)


class PointLookupView(APIView):
    """
    Mock point-in-zone: checks which zone bbox contains (lat, lng).
    Real implementation: PostGIS ST_Contains or OneMap spatial API.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            lat = float(request.query_params.get("lat", ""))
            lng = float(request.query_params.get("lng", ""))
        except (TypeError, ValueError):
            return Response({"detail": "Parameter lat dan lng wajib diisi."}, status=400)

        matched = []
        for zone in RDTRZone.objects.all():
            if zone.bbox and len(zone.bbox) == 4:
                min_lng, min_lat, max_lng, max_lat = zone.bbox
                if min_lat <= lat <= max_lat and min_lng <= lng <= max_lng:
                    matched.append(RDTRZoneListSerializer(zone).data)

        return Response(
            {
                "lat": lat,
                "lng": lng,
                "zones": matched,
                "source": "mock",
                "note": "Data spasial mock — bukan data OneMap resmi.",
            }
        )


class KBLICheckView(APIView):
    """Check if a KBLI code is compatible with a zone."""
    permission_classes = [AllowAny]

    def get(self, request):
        kbli = request.query_params.get("kbli", "").strip()
        zone_code = request.query_params.get("zone", "").strip()

        if not kbli or not zone_code:
            return Response({"detail": "Parameter kbli dan zone wajib diisi."}, status=400)

        try:
            zone = RDTRZone.objects.get(zone_code=zone_code)
        except RDTRZone.DoesNotExist:
            return Response({"detail": "Zona tidak ditemukan."}, status=404)

        # Check pre-computed compatibility
        try:
            compat = KBLICompatibility.objects.get(kbli_code=kbli, zone=zone)
            return Response(
                {
                    "kbli": kbli,
                    "zone_code": zone_code,
                    "zone_name": zone.name,
                    "is_compatible": compat.is_compatible,
                    "requires_special_permit": compat.requires_special_permit,
                    "notes": compat.notes,
                    "source": "computed",
                }
            )
        except KBLICompatibility.DoesNotExist:
            pass

        # Fallback: check allowed_sektors and allowed_kbli_codes on zone
        from apps.reference.models import KbliCode
        kbli_ref = KbliCode.objects.select_related("bidang").filter(code=kbli).first()

        if not kbli_ref:
            return Response({"detail": f"KBLI {kbli} tidak ditemukan di referensi."}, status=404)

        # If zone explicitly lists allowed KBLI codes, check membership
        if zone.allowed_kbli_codes:
            is_compat = kbli in zone.allowed_kbli_codes
        elif zone.allowed_sektors:
            # Check if the KBLI's bidang code is in the allowed sektors list
            is_compat = kbli_ref.bidang.code in zone.allowed_sektors
        else:
            is_compat = True  # No restrictions defined

        return Response(
            {
                "kbli": kbli,
                "kbli_name": kbli_ref.title,
                "zone_code": zone_code,
                "zone_name": zone.name,
                "is_compatible": is_compat,
                "requires_special_permit": False,
                "notes": "Berdasarkan sektor yang diizinkan pada zona ini.",
                "source": "inferred",
            }
        )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _bbox_to_polygon(bbox: list) -> dict:
    """Convert [min_lng, min_lat, max_lng, max_lat] to GeoJSON Polygon."""
    if not bbox or len(bbox) != 4:
        return {"type": "Polygon", "coordinates": [[]]}
    min_lng, min_lat, max_lng, max_lat = bbox
    return {
        "type": "Polygon",
        "coordinates": [[
            [min_lng, min_lat],
            [max_lng, min_lat],
            [max_lng, max_lat],
            [min_lng, max_lat],
            [min_lng, min_lat],
        ]],
    }
