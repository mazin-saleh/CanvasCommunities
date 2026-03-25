"""
test_training.py — Tests for the pipeline orchestrator
Uses mocking to avoid needing a real database connection.
"""

import pytest
from unittest.mock import patch, MagicMock
from recommender.training import run_for_user, run_for_all_users


# ── Sample Data ──────────────────────────────────────────────────────────────

MOCK_USERS = [
    {"user_id": 1, "username": "alice", "tags": ["javascript", "ml"]},
    {"user_id": 2, "username": "bob", "tags": ["gaming", "react"]},
    {"user_id": 3, "username": "carol", "tags": ["python", "ml"]},
]

MOCK_COMMUNITIES = [
    {"community_id": 1, "community_name": "Next.js Devs", "tags": ["javascript", "react"]},
    {"community_id": 2, "community_name": "Python Enthusiasts", "tags": ["python", "ml"]},
    {"community_id": 3, "community_name": "Gamers Hub", "tags": ["gaming", "community"]},
]

MOCK_MEMBERSHIPS = [
    {"user_id": 1, "community_id": 1},
    {"user_id": 1, "community_id": 2},
    {"user_id": 2, "community_id": 3},
    {"user_id": 3, "community_id": 2},
]

MOCK_INTERACTIONS = []  # Empty for simplicity


# ── Tests ────────────────────────────────────────────────────────────────────

class TestRunForUser:

    @patch("recommender.training.db")
    def test_returns_recommendations(self, mock_db):
        """Pipeline returns a list of recommendations."""
        mock_db.fetch_users_with_interests.return_value = MOCK_USERS
        mock_db.fetch_communities_with_tags.return_value = MOCK_COMMUNITIES
        mock_db.fetch_memberships.return_value = MOCK_MEMBERSHIPS
        mock_db.fetch_interactions.return_value = MOCK_INTERACTIONS
        mock_db.upsert_recommendations = MagicMock()

        results = run_for_user(user_id=3)  # carol

        assert isinstance(results, list)
        # carol is in community 2, should get recommendations for 1 and 3
        community_ids = [r["community_id"] for r in results]
        assert 2 not in community_ids  # already joined
        assert len(results) > 0

    @patch("recommender.training.db")
    def test_excludes_joined_communities(self, mock_db):
        """Communities user already joined are not in results."""
        mock_db.fetch_users_with_interests.return_value = MOCK_USERS
        mock_db.fetch_communities_with_tags.return_value = MOCK_COMMUNITIES
        mock_db.fetch_memberships.return_value = MOCK_MEMBERSHIPS
        mock_db.fetch_interactions.return_value = MOCK_INTERACTIONS
        mock_db.upsert_recommendations = MagicMock()

        results = run_for_user(user_id=1)  # alice joined 1 and 2

        community_ids = [r["community_id"] for r in results]
        assert 1 not in community_ids
        assert 2 not in community_ids

    @patch("recommender.training.db")
    def test_calls_upsert(self, mock_db):
        """Pipeline writes results to database."""
        mock_db.fetch_users_with_interests.return_value = MOCK_USERS
        mock_db.fetch_communities_with_tags.return_value = MOCK_COMMUNITIES
        mock_db.fetch_memberships.return_value = MOCK_MEMBERSHIPS
        mock_db.fetch_interactions.return_value = MOCK_INTERACTIONS
        mock_db.upsert_recommendations = MagicMock()

        run_for_user(user_id=3)

        mock_db.upsert_recommendations.assert_called_once()

    @patch("recommender.training.db")
    def test_raises_for_unknown_user(self, mock_db):
        """Raises ValueError if user doesn't exist."""
        mock_db.fetch_users_with_interests.return_value = MOCK_USERS
        mock_db.fetch_communities_with_tags.return_value = MOCK_COMMUNITIES
        mock_db.fetch_memberships.return_value = MOCK_MEMBERSHIPS
        mock_db.fetch_interactions.return_value = MOCK_INTERACTIONS

        with pytest.raises(ValueError, match="User 999 not found"):
            run_for_user(user_id=999)

    @patch("recommender.training.db")
    def test_results_have_required_fields(self, mock_db):
        """Each result has community_id, score, content_score, collab_score."""
        mock_db.fetch_users_with_interests.return_value = MOCK_USERS
        mock_db.fetch_communities_with_tags.return_value = MOCK_COMMUNITIES
        mock_db.fetch_memberships.return_value = MOCK_MEMBERSHIPS
        mock_db.fetch_interactions.return_value = MOCK_INTERACTIONS
        mock_db.upsert_recommendations = MagicMock()

        results = run_for_user(user_id=3)

        for r in results:
            assert "community_id" in r
            assert "score" in r
            assert "content_score" in r
            assert "collab_score" in r


class TestRunForAllUsers:

    @patch("recommender.training.db")
    def test_returns_dict_for_all_users(self, mock_db):
        """Returns a dict with recommendations for each user."""
        mock_db.fetch_users_with_interests.return_value = MOCK_USERS
        mock_db.fetch_communities_with_tags.return_value = MOCK_COMMUNITIES
        mock_db.fetch_memberships.return_value = MOCK_MEMBERSHIPS
        mock_db.fetch_interactions.return_value = MOCK_INTERACTIONS
        mock_db.upsert_recommendations = MagicMock()

        results = run_for_all_users()

        assert isinstance(results, dict)
        assert 1 in results  # alice
        assert 2 in results  # bob
        assert 3 in results  # carol

    @patch("recommender.training.db")
    def test_continues_on_error(self, mock_db):
        """If one user fails, others still get processed."""
        # Return only user 1, so user 2 and 3 will fail lookup
        mock_db.fetch_users_with_interests.return_value = [MOCK_USERS[0]]
        mock_db.fetch_communities_with_tags.return_value = MOCK_COMMUNITIES
        mock_db.fetch_memberships.return_value = MOCK_MEMBERSHIPS
        mock_db.fetch_interactions.return_value = MOCK_INTERACTIONS
        mock_db.upsert_recommendations = MagicMock()

        results = run_for_all_users()

        # Should have entry for user 1 only
        assert 1 in results
        assert len(results) == 1
