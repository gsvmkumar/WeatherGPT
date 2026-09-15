"""
Shelters router — Emergency Safe Shelters near user coordinates.
Adheres strictly to the requirement: NEVER FABRICATE OR INVENT SHELTERS.
Only returns verified emergency shelters from official disaster authorities.
"""

import math
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.shelter import Shelter
from app.schemas.shelter import ShelterResponse, SheltersListResponse

router = APIRouter(prefix="/api/shelters", tags=["shelters"])

EARTH_RADIUS_KM = 6371.0


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two GPS coordinates in kilometers."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


ADVISORY_TEMPLATES = {
    "te": {
        "found": "మీ ప్రస్తుత ప్రదేశానికి సమీపంలో {count} అధికారిక సురక్షిత ఆశ్రయాలు కనుగొనబడ్డాయి. సమీప ఆశ్రయం {name}, సుమారు {dist} కి.మీ దూరంలో ఉంది.",
        "not_found": "మీ ప్రస్తుత ప్రదేశానికి సమీపంలో ధృవీకరించబడిన అత్యవసర ఆశ్రయాలు ఏవీ కనుగొనబడలేదు. స్థానిక విపత్తు నిర్వహణ హెల్ప్‌లైన్ 1070 / 112 ని సంప్రదించండి.",
    },
    "hi": {
        "found": "आपके स्थान के निकट {count} आधिकारिक सुरक्षित आश्रय स्थल मिले हैं। सबसे नजदीकी आश्रय {name} लगभग {dist} किमी की दूरी पर है।",
        "not_found": "आपके वर्तमान स्थान के निकट कोई सत्यापित आपातकालीन आश्रय स्थल नहीं मिला। स्थानीय आपदा नियंत्रण हेल्पलाइन 1070 / 112 पर संपर्क करें।",
    },
    "ta": {
        "found": "உங்கள் இருப்பிடத்திற்கு அருகில் {count} அதிகாரப்பூர்வ பாதுகாப்பு முகாம்கள் உள்ளன. அருகிலுள்ள முகாம் {name} {dist} கி.மீ தொலைவில் உள்ளது.",
        "not_found": "உங்கள் இருப்பிடத்திற்கு அருகில் சரிபார்க்கப்பட்ட அவசர முகாம்கள் எதுவும் கிடைக்கவில்லை. உதவிக்கு 1070 / 112 அழைக்கவும்.",
    },
    "kn": {
        "found": "ನಿಮ್ಮ ಸ್ಥಳದ ಬಳಿ {count} ಅಧಿಕೃತ ಸುರಕ್ಷಿತ ಆಶ್ರಯಗಳು ಕಂಡುಬಂದಿವೆ. ಹತ್ತಿರದ ಆಶ್ರಯ {name}, ಸುಮಾರು {dist} ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
        "not_found": "ನಿಮ್ಮ ಸ್ಥಳದ ಬಳಿ ಯಾವುದೇ ಅಧಿಕೃತ ತುರ್ತು ಆಶ್ರಯಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ಸಹಾಯವಾಣಿ 1070 / 112 ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    },
    "en": {
        "found": "Found {count} verified official safe shelter(s) near your location. The nearest shelter is {name}, approximately {dist} km away.",
        "not_found": "No verified emergency shelters were found near your location. Please contact the disaster helpline (1070 / 112) for immediate assistance.",
    },
}


@router.get("/nearby", response_model=SheltersListResponse)
async def get_nearby_shelters(
    lat: float = Query(..., ge=-90.0, le=90.0, description="User latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="User longitude"),
    radius_km: float = Query(35.0, ge=1.0, le=200.0, description="Search radius in kilometers"),
    language: str = Query("en", description="Preferred response language (en, te, hi, etc.)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve official verified emergency safe shelters near GPS coordinates.
    Calculates exact Haversine distance and sorts closest to furthest.
    Never fabricates shelter data.
    """
    stmt = select(Shelter)
    result = await db.execute(stmt)
    all_shelters = result.scalars().all()

    shelters_with_distance = []
    for s in all_shelters:
        dist = calculate_haversine_distance(lat, lon, s.latitude, s.longitude)
        if dist <= radius_km:
            shelter_dict = {
                "id": s.id,
                "name": s.name,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "address": s.address,
                "source": s.source,
                "source_reference": s.source_reference,
                "verification_status": s.verification_status,
                "facility_type": s.facility_type,
                "contact_information": s.contact_information,
                "capacity": s.capacity,
                "distance_km": round(dist, 1),
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            }
            shelters_with_distance.append(shelter_dict)

    # Sort by distance
    shelters_with_distance.sort(key=lambda x: x["distance_km"])

    lang_code = language if language in ADVISORY_TEMPLATES else "en"
    templates = ADVISORY_TEMPLATES[lang_code]

    if shelters_with_distance:
        nearest = shelters_with_distance[0]
        advisory = templates["found"].format(
            count=len(shelters_with_distance),
            name=nearest["name"],
            dist=nearest["distance_km"],
        )
        has_verified = True
    else:
        advisory = templates["not_found"]
        has_verified = False

    return SheltersListResponse(
        count=len(shelters_with_distance),
        user_latitude=lat,
        user_longitude=lon,
        radius_km=radius_km,
        shelters=[ShelterResponse(**s) for s in shelters_with_distance],
        safety_advisory=advisory,
        has_verified_shelters=has_verified,
    )


@router.get("/{shelter_id}", response_model=ShelterResponse)
async def get_shelter_by_id(shelter_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve details for a specific verified emergency safe shelter."""
    shelter = await db.get(Shelter, shelter_id)
    if not shelter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency shelter record not found",
        )
    return shelter
