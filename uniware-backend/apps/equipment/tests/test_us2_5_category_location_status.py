import uuid

import pytest

from apps.equipment.factories import CategoryFactory, EquipmentFactory, LocationFactory
from apps.equipment.models import Equipment, EquipmentStatus

pytestmark = pytest.mark.django_db


def test_us2_5_persists_valid_category_location_and_status(auth_client, provider):
    category = CategoryFactory()
    location = LocationFactory()
    client = auth_client(provider)

    response = client.post(
        "/api/equipment",
        {
            "asset_id": "AST-9001",
            "name": "3D Printer",
            "category_id": str(category.id),
            "location_id": str(location.id),
            "status": EquipmentStatus.MAINTENANCE,
        },
        format="json",
    )

    assert response.status_code == 201
    equipment = Equipment.objects.get(asset_id="AST-9001")
    assert equipment.category_id == category.id
    assert equipment.location_id == location.id
    assert equipment.status == EquipmentStatus.MAINTENANCE


def test_us2_5_rejects_unsupported_category(auth_client, provider):
    location = LocationFactory()
    client = auth_client(provider)

    response = client.post(
        "/api/equipment",
        {
            "asset_id": "AST-9002",
            "name": "3D Printer",
            "category_id": str(uuid.uuid4()),
            "location_id": str(location.id),
        },
        format="json",
    )

    assert response.status_code == 400
    assert not Equipment.objects.filter(asset_id="AST-9002").exists()


def test_us2_5_rejects_unsupported_status_value(auth_client, provider):
    category = CategoryFactory()
    location = LocationFactory()
    client = auth_client(provider)

    response = client.post(
        "/api/equipment",
        {
            "asset_id": "AST-9003",
            "name": "3D Printer",
            "category_id": str(category.id),
            "location_id": str(location.id),
            "status": EquipmentStatus.ARCHIVED,
        },
        format="json",
    )

    assert response.status_code == 400
    assert not Equipment.objects.filter(asset_id="AST-9003").exists()


def test_us2_5_categories_and_locations_are_listed(auth_client, borrower):
    CategoryFactory(name="Robotics")
    LocationFactory(name="Engineering Building")
    client = auth_client(borrower)

    categories = client.get("/api/categories")
    locations = client.get("/api/locations")

    assert categories.status_code == 200
    assert locations.status_code == 200
    assert any(c["name"] == "Robotics" for c in categories.data)
    assert any(loc["name"] == "Engineering Building" for loc in locations.data)


def test_us2_5_allows_available_to_maintenance_transition(auth_client, provider):
    equipment = EquipmentFactory(provider=provider, status=EquipmentStatus.AVAILABLE)
    client = auth_client(provider)

    response = client.patch(
        f"/api/equipment/{equipment.id}",
        {"status": EquipmentStatus.MAINTENANCE},
        format="json",
    )

    assert response.status_code == 200
    equipment.refresh_from_db()
    assert equipment.status == EquipmentStatus.MAINTENANCE


def test_us2_5_allows_maintenance_back_to_available(auth_client, provider):
    equipment = EquipmentFactory(provider=provider, status=EquipmentStatus.MAINTENANCE)
    client = auth_client(provider)

    response = client.patch(
        f"/api/equipment/{equipment.id}",
        {"status": EquipmentStatus.AVAILABLE},
        format="json",
    )

    assert response.status_code == 200
    equipment.refresh_from_db()
    assert equipment.status == EquipmentStatus.AVAILABLE


def test_us2_5_rejects_transition_to_terminal_status(auth_client, provider):
    equipment = EquipmentFactory(provider=provider, status=EquipmentStatus.AVAILABLE)
    client = auth_client(provider)

    response = client.patch(
        f"/api/equipment/{equipment.id}",
        {"status": EquipmentStatus.ARCHIVED},
        format="json",
    )

    assert response.status_code == 400
    equipment.refresh_from_db()
    assert equipment.status == EquipmentStatus.AVAILABLE


def test_us2_5_provider_cannot_edit_equipment_committed_to_a_borrower(auth_client, provider):
    """A CHECKED_OUT item is owned by the borrowing flow, not the provider."""
    equipment = EquipmentFactory(provider=provider, status=EquipmentStatus.CHECKED_OUT)
    client = auth_client(provider)

    response = client.patch(
        f"/api/equipment/{equipment.id}",
        {"status": EquipmentStatus.AVAILABLE},
        format="json",
    )

    assert response.status_code == 404
    equipment.refresh_from_db()
    assert equipment.status == EquipmentStatus.CHECKED_OUT
