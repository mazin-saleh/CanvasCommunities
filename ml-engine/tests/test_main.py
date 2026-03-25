"""
test_main.py — Tests for FastAPI endpoints
Uses FastAPI TestClient with mocked dependencies.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# ── Health Check ─────────────────────────────────────────────────────────────

class TestHealthEndpoint:

    def test_health_returns_ok(self):
        """Health endpoint returns status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# ── POST /recommend/{user_id} ────────────────────────────────────────────────

class TestComputeRecommendations:

    @patch("main.run_for_user")
    def test_returns_recommendations(self, mock_run):
        """POST triggers computation and returns results."""
        mock_run.return_value = [
            {"community_id": 1, "score": 0.8, "content_score": 0.5, "collab_score": 0.3}
        ]

        response = client.post("/recommend/1")

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == 1
        assert data["computed"] is True
        assert len(data["recommendations"]) == 1

    @patch("main.run_for_user")
    def test_404_for_unknown_user(self, mock_run):
        """Returns 404 if user doesn't exist."""
        mock_run.side_effect = ValueError("User 999 not found")

        response = client.post("/recommend/999")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    @patch("main.run_for_user")
    def test_500_on_error(self, mock_run):
        """Returns 500 on unexpected errors."""
        mock_run.side_effect = Exception("Database connection failed")

        response = client.post("/recommend/1")

        assert response.status_code == 500


# ── GET /recommend/{user_id} ─────────────────────────────────────────────────

class TestGetRecommendations:

    @patch("main.db.fetch_recommendations_for_user")
    def test_returns_stored_recommendations(self, mock_fetch):
        """GET returns pre-computed recommendations from DB."""
        mock_fetch.return_value = [
            {"community_id": 2, "community_name": "Python", "score": 0.7,
             "content_score": 0.4, "collab_score": 0.5}
        ]

        response = client.get("/recommend/1")

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == 1
        assert data["computed"] is True
        assert len(data["recommendations"]) == 1

    @patch("main.db.fetch_recommendations_for_user")
    def test_returns_empty_when_not_computed(self, mock_fetch):
        """Returns computed=False when no recommendations exist."""
        mock_fetch.return_value = []

        response = client.get("/recommend/1")

        assert response.status_code == 200
        data = response.json()
        assert data["computed"] is False
        assert data["recommendations"] == []


# ── POST /recommend/all ──────────────────────────────────────────────────────

class TestComputeAllRecommendations:

    @patch("main.run_for_all_users")
    def test_batch_computation(self, mock_run_all):
        """POST /recommend/all runs for all users."""
        mock_run_all.return_value = {
            1: [{"community_id": 3, "score": 0.5, "content_score": 0.3, "collab_score": 0.2}],
            2: [{"community_id": 1, "score": 0.8, "content_score": 0.6, "collab_score": 0.4}],
            3: [],
        }

        response = client.post("/recommend/all")

        assert response.status_code == 200
        data = response.json()
        assert data["computed"] is True
        assert data["user_count"] == 3
        # JSON serializes int keys as strings
        assert "1" in data["results"]
        assert "2" in data["results"]
        assert "3" in data["results"]

    @patch("main.run_for_all_users")
    def test_returns_summary_not_full_results(self, mock_run_all):
        """Batch endpoint returns summary (count + top_score), not full lists."""
        mock_run_all.return_value = {
            1: [{"community_id": 3, "score": 0.9, "content_score": 0.5, "collab_score": 0.4}],
        }

        response = client.post("/recommend/all")
        data = response.json()

        # JSON serializes int keys as strings
        assert data["results"]["1"]["count"] == 1
        assert data["results"]["1"]["top_score"] == 0.9
