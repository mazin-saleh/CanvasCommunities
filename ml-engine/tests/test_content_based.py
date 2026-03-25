"""
test_content_based.py — Tests for Jaccard similarity scoring
"""

import pytest
from recommender.content_based import compute_content_scores


# ── Sample Data ──────────────────────────────────────────────────────────────

COMMUNITIES = [
    {"community_id": 1, "community_name": "Next.js Devs", "tags": ["javascript", "react"]},
    {"community_id": 2, "community_name": "Python Enthusiasts", "tags": ["python", "ml"]},
    {"community_id": 3, "community_name": "Gamers Hub", "tags": ["gaming", "community"]},
]


# ── Tests ────────────────────────────────────────────────────────────────────

class TestComputeContentScores:

    def test_partial_overlap(self):
        """User interests partially overlap with community tags."""
        user_interests = {"javascript", "ml"}
        scores = compute_content_scores(user_interests, COMMUNITIES)

        # Next.js: {javascript} shared, {javascript, ml, react} union → 1/3
        assert scores[1] == pytest.approx(1/3, rel=0.01)

        # Python: {ml} shared, {javascript, ml, python} union → 1/3
        assert scores[2] == pytest.approx(1/3, rel=0.01)

        # Gamers: {} shared, {javascript, ml, gaming, community} union → 0/4
        assert scores[3] == pytest.approx(0.0)

    def test_full_overlap(self):
        """User interests exactly match a community's tags."""
        user_interests = {"javascript", "react"}
        scores = compute_content_scores(user_interests, COMMUNITIES)

        # Next.js: perfect match → 2/2 = 1.0
        assert scores[1] == pytest.approx(1.0)

    def test_no_overlap(self):
        """User interests don't overlap with any community."""
        user_interests = {"cooking", "travel"}
        scores = compute_content_scores(user_interests, COMMUNITIES)

        # No shared tags with any community
        assert scores[1] == pytest.approx(0.0)
        assert scores[2] == pytest.approx(0.0)
        assert scores[3] == pytest.approx(0.0)

    def test_empty_user_interests(self):
        """User has no interests (cold start)."""
        user_interests = set()
        scores = compute_content_scores(user_interests, COMMUNITIES)

        # Empty set intersected with anything = 0, empty union with non-empty = community tags
        # But if user_interests is empty, union is just community_tags
        # So score = 0 / len(community_tags) = 0.0
        assert scores[1] == pytest.approx(0.0)
        assert scores[2] == pytest.approx(0.0)
        assert scores[3] == pytest.approx(0.0)

    def test_empty_community_tags(self):
        """Community has no tags."""
        communities = [{"community_id": 99, "community_name": "Empty Club", "tags": []}]
        user_interests = {"python"}
        scores = compute_content_scores(user_interests, communities)

        # Union = {"python"}, intersection = {} → 0/1 = 0.0
        assert scores[99] == pytest.approx(0.0)

    def test_both_empty(self):
        """Both user interests and community tags are empty."""
        communities = [{"community_id": 99, "community_name": "Empty Club", "tags": []}]
        user_interests = set()
        scores = compute_content_scores(user_interests, communities)

        # Union is empty → should return 0.0 (guard against division by zero)
        assert scores[99] == pytest.approx(0.0)

    def test_returns_all_communities(self):
        """Scores dict should contain an entry for every community."""
        user_interests = {"python"}
        scores = compute_content_scores(user_interests, COMMUNITIES)

        assert len(scores) == len(COMMUNITIES)
        assert all(cid in scores for cid in [1, 2, 3])
