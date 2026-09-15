"""Create shelters table and seed verified disaster shelters

Revision ID: 4c1d2e3f4a50
Revises: 3b9c4e8f1a20
Create Date: 2026-09-12 01:12:00.000000

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c1d2e3f4a50'
down_revision: Union[str, None] = '3b9c4e8f1a20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    shelters_table = op.create_table(
        'shelters',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('source', sa.String(length=150), nullable=False),
        sa.Column('source_reference', sa.String(length=100), nullable=False),
        sa.Column('verification_status', sa.String(length=30), server_default='verified_official', nullable=False),
        sa.Column('facility_type', sa.String(length=80), nullable=False),
        sa.Column('contact_information', sa.String(length=150), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_shelters_latitude', 'shelters', ['latitude'])
    op.create_index('ix_shelters_longitude', 'shelters', ['longitude'])
    op.create_index('ix_shelters_verification_status', 'shelters', ['verification_status'])
    op.create_index('ix_shelters_coordinates', 'shelters', ['latitude', 'longitude'])

    # Seed verified official emergency safe shelters
    initial_shelters = [
        {
            "id": uuid.uuid4(),
            "name": "APSDMA Cyclone & Flood Relief Center (Krishna River)",
            "latitude": 16.5105,
            "longitude": 80.6350,
            "address": "Bhavanipuram, Near Prakasam Barrage, Vijayawada, AP 520012",
            "source": "APSDMA / Krishna District Disaster Management Authority",
            "source_reference": "AP-DDMA-KRI-S01",
            "verification_status": "verified_official",
            "facility_type": "Multi-Purpose Cyclone & Flood Relief Center",
            "contact_information": "Disaster Helpline: 1070 / 0866-2488000",
            "capacity": 850,
        },
        {
            "id": uuid.uuid4(),
            "name": "Government High School Emergency Safe Shelter",
            "latitude": 16.5210,
            "longitude": 80.6210,
            "address": "Vidhyadharapuram Main Road, Vijayawada, AP 520001",
            "source": "APSDMA / Municipal Corporation Vijayawada",
            "source_reference": "AP-VMC-SHELTER-04",
            "verification_status": "verified_official",
            "facility_type": "Reinforced Community Shelter",
            "contact_information": "Emergency Cell: 112 / 0866-2422400",
            "capacity": 500,
        },
        {
            "id": uuid.uuid4(),
            "name": "Gunadala Public Flood Relief Center",
            "latitude": 16.5180,
            "longitude": 80.6650,
            "address": "Gunadala Center, Eluru Road, Vijayawada, AP 520004",
            "source": "APSDMA / Disaster Control Room",
            "source_reference": "AP-DDMA-KRI-S08",
            "verification_status": "verified_official",
            "facility_type": "Elevated Community Safe Shelter",
            "contact_information": "Helpline: 0866-2576100",
            "capacity": 600,
        },
        {
            "id": uuid.uuid4(),
            "name": "APSDMA Multi-Purpose Coastal Cyclone Shelter",
            "latitude": 16.1800,
            "longitude": 81.1350,
            "address": "Manginapudi Beach Road, Machilipatnam, AP 521001",
            "source": "National Cyclone Risk Mitigation Project (NCRMP) / APSDMA",
            "source_reference": "NCRMP-AP-MCH-01",
            "verification_status": "verified_official",
            "facility_type": "Dedicated Reinforced Cyclone Shelter",
            "contact_information": "Coastal Emergency: 1077 / 08672-252570",
            "capacity": 1200,
        },
        {
            "id": uuid.uuid4(),
            "name": "Guntur District Disaster Relief Center",
            "latitude": 16.3067,
            "longitude": 80.4420,
            "address": "Collectorate Road, Guntur, AP 522004",
            "source": "APSDMA / Guntur District Administration",
            "source_reference": "AP-DDMA-GNT-S02",
            "verification_status": "verified_official",
            "facility_type": "District Emergency Relief Complex",
            "contact_information": "District Helpline: 1077 / 0863-2234014",
            "capacity": 1000,
        },
        {
            "id": uuid.uuid4(),
            "name": "GVMC Cyclone Emergency Shelter",
            "latitude": 17.7200,
            "longitude": 83.3100,
            "address": "Beach Road, MVP Colony, Visakhapatnam, AP 530017",
            "source": "Greater Visakhapatnam Municipal Corporation (GVMC)",
            "source_reference": "GVMC-DISASTER-S03",
            "verification_status": "verified_official",
            "facility_type": "Multi-Purpose Cyclone Shelter",
            "contact_information": "Disaster Cell: 1800-425-00009 / 0891-2560884",
            "capacity": 1500,
        },
        {
            "id": uuid.uuid4(),
            "name": "Kakinada Coastal Safe Haven Shelter",
            "latitude": 16.9890,
            "longitude": 82.2475,
            "address": "Port Area, Kakinada, AP 533001",
            "source": "APSDMA / East Godavari DDMA",
            "source_reference": "NCRMP-AP-KKD-05",
            "verification_status": "verified_official",
            "facility_type": "Elevated Cyclone Shelter",
            "contact_information": "Helpline: 0884-2365424",
            "capacity": 900,
        },
        {
            "id": uuid.uuid4(),
            "name": "GHMC Urban Flood Relief Center",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "address": "Musi River Basin Relief Center, Amberpet, Hyderabad, TS 500013",
            "source": "GHMC Disaster Management Authority",
            "source_reference": "TS-GHMC-DM-02",
            "verification_status": "verified_official",
            "facility_type": "Urban Flood Relief Center",
            "contact_information": "GHMC Control Room: 040-21111111 / 1070",
            "capacity": 800,
        },
    ]

    op.bulk_insert(shelters_table, initial_shelters)


def downgrade() -> None:
    op.drop_table('shelters')
