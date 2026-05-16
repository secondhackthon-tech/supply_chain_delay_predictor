from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_root_responds():
    r = client.get("/")
    assert r.status_code == 200
    assert "endpoints" in r.json()


def test_health_endpoint_responds():
    r = client.get("/health")
    assert r.status_code == 200
    assert "status" in r.json()


def test_metrics_endpoint_responds():
    r = client.get("/metrics")
    assert r.status_code == 200


def test_summary_endpoint_responds():
    r = client.get("/summary")
    assert r.status_code == 200
    body = r.json()
    for key in ["metrics", "prediction_volume_24h", "band_distribution", "mean_risk"]:
        assert key in body
