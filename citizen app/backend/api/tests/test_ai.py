"""The mock AI service must be deterministic (section 19) and cover all four
simulated states, and `/ai/analyze` must wrap it correctly."""
import io

from httpx import AsyncClient

from app.services.ai.mock import MockAIAnalysisService


async def test_mock_service_is_deterministic_for_the_same_image():
    service = MockAIAnalysisService()
    image_bytes = b"identical-image-bytes-12345"
    first = await service.analyze(image_bytes=image_bytes, filename="road.jpg")
    second = await service.analyze(image_bytes=image_bytes, filename="road.jpg")
    assert first == second


async def test_mock_service_pothole_scenario():
    service = MockAIAnalysisService()
    result = await service.analyze(image_bytes=b"x", filename="demo-pothole.jpg")
    assert result.detected is True
    assert result.hazard_type == "POTHOLE"
    assert result.confidence >= 0.9
    assert result.bounding_box is not None


async def test_mock_service_no_hazard_scenario():
    service = MockAIAnalysisService()
    result = await service.analyze(image_bytes=b"x", filename="demo-clear.jpg")
    assert result.detected is False
    assert result.message == "No confident road hazard detected."


async def test_mock_service_low_confidence_scenario():
    service = MockAIAnalysisService()
    result = await service.analyze(image_bytes=b"x", filename="demo-lowconf.jpg")
    assert result.detected is True
    assert result.confidence < 0.7


async def test_mock_service_failure_scenario():
    service = MockAIAnalysisService()
    result = await service.analyze(image_bytes=b"x", filename="demo-fail.jpg")
    assert result.detected is False
    assert result.confidence == 0.0


async def test_analyze_endpoint_requires_auth(client: AsyncClient):
    files = {"image": ("demo-pothole.jpg", io.BytesIO(b"fake-bytes"), "image/jpeg")}
    response = await client.post("/ai/analyze", files=files)
    assert response.status_code == 401


async def test_analyze_endpoint_returns_the_contract_shape(client: AsyncClient, auth_headers):
    files = {"image": ("demo-pothole.jpg", io.BytesIO(b"fake-bytes"), "image/jpeg")}
    response = await client.post("/ai/analyze", headers=auth_headers, files=files)
    assert response.status_code == 200
    body = response.json()
    for field in ("detected", "confidence", "processing_time_ms", "model_version"):
        assert field in body


async def test_analyze_endpoint_rejects_non_image_files(client: AsyncClient, auth_headers):
    files = {"image": ("report.txt", io.BytesIO(b"not an image"), "text/plain")}
    response = await client.post("/ai/analyze", headers=auth_headers, files=files)
    assert response.status_code == 415
