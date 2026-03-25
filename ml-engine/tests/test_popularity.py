"""
test_popularity.py — Tests for member count scoring
"""

import pytest
from recommender.popularity import compute_popularity_scores


# ── Sample Data ──────────────────────────────────────────────────────────────

COMMUNITIES = [
    {"community_id": 1, "community_name": "Next.js Devs", "tags": []},
    {"community_id": 2, "community_name": "Python Enthusiasts", "tags": []},
    {"community_id": 3, "community_name": "Gamers Hub", "tags": []},
]


# ── Tests ────────────────────────────────────────────────────────────────────

class TestComputePopularityScores:

    def test_normal_distribution(self):
        """Communities with different member counts get normalized scores."""
        memberships = [
            {"user_id": 1, "community_id": 1},  # Next.js: 1 member
            {"user_id": 1, "community_id": 2},  # Python: 2 members
            {"user_id": 3, "community_id": 2},
            {"user_id": 2, "community_id": 3},  # Gamers: 1 member
        ]

        scores = compute_popularity_scores(memberships, COMMUNITIES)

        # Python has max (2), so it gets 1.0
        assert scores[2] == pytest.approx(1.0)

        # Others have 1, so they get 0.5
        assert scores[1] == pytest.approx(0.5)
        assert scores[3] == pytest.approx(0.5)

    def test_all_equal_members(self):
        """All communities have same member count."""
        memberships = [
            {"user_id": 1, "community_id": 1},
            {"user_id": 2, "community_id": 2},
            {"user_id": 3, "community_id": 3},
        ]

        scores = compute_popularity_scores(memberships, COMMUNITIES)

        # All have 1 member, max is 1, so everyone gets 1.0
        assert scores[1] == pytest.approx(1.0)
        assert scores[2] == pytest.approx(1.0)
        assert scores[3] == pytest.approx(1.0)

    def test_community_with_zero_members(self):
        """One community has no members."""
        memberships = [
            {"user_id": 1, "community_id": 1},
            {"user_id": 2, "community_id": 1},  # Next.js: 2 members
            # Python: 0 members
            {"user_id": 3, "community_id": 3},  # Gamers: 1 member
        ]

        scores = compute_popularity_scores(memberships, COMMUNITIES)

        assert scores[1] == pytest.approx(1.0)   # 2/2
        assert scores[2] == pytest.approx(0.0)   # 0/2
        assert scores[3] == pytest.approx(0.5)   # 1/2

    def test_no_memberships_at_all(self):
        """Empty database — no one has joined anything."""
        memberships = []

        scores = compute_popularity_scores(memberships, COMMUNITIES)

        # All should be 0.0
        assert scores[1] == pytest.approx(0.0)
        assert scores[2] == pytest.approx(0.0)
        assert scores[3] == pytest.approx(0.0)

    def test_returns_all_communities(self):
        """Scores dict should contain an entry for every community."""
        memberships = [{"user_id": 1, "community_id": 1}]
        scores = compute_popularity_scores(memberships, COMMUNITIES)

        assert len(scores) == len(COMMUNITIES)
        assert all(cid in scores for cid in [1, 2, 3])

    def test_single_community_single_member(self):
        """Edge case: only one community with one member."""
        communities = [{"community_id": 99, "community_name": "Solo Club", "tags": []}]
        memberships = [{"user_id": 1, "community_id": 99}]

        scores = compute_popularity_scores(memberships, communities)

        # 1/1 = 1.0
        assert scores[99] == pytest.approx(1.0)
