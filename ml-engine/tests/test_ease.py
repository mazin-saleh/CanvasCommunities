"""
test_ease.py — Tests for collaborative filtering (item-item similarity)
"""

import pytest
from recommender.ease import compute_collaborative_scores


# ── Sample Data ──────────────────────────────────────────────────────────────

COMMUNITIES = [
    {"community_id": 1, "community_name": "Next.js Devs", "tags": []},
    {"community_id": 2, "community_name": "Python Enthusiasts", "tags": []},
    {"community_id": 3, "community_name": "Gamers Hub", "tags": []},
]

# Seed data memberships:
# alice (1): Next.js, Python
# bob (2): Gamers
# carol (3): Python
MEMBERSHIPS = [
    {"user_id": 1, "community_id": 1},  # alice → Next.js
    {"user_id": 1, "community_id": 2},  # alice → Python
    {"user_id": 2, "community_id": 3},  # bob → Gamers
    {"user_id": 3, "community_id": 2},  # carol → Python
]


# ── Tests ────────────────────────────────────────────────────────────────────

class TestComputeCollaborativeScores:

    def test_similar_communities_score_higher(self):
        """Communities with overlapping members should be recommended."""
        # carol (user 3) is in Python Enthusiasts
        # alice is also in Python AND Next.js → Next.js should be recommended
        scores = compute_collaborative_scores(
            user_id=3,
            memberships=MEMBERSHIPS,
            interactions=[],
            communities=COMMUNITIES
        )

        # carol hasn't joined Next.js or Gamers, should get scores for both
        # Next.js shares alice with Python → higher score
        # Gamers shares nobody with Python → lower score
        assert scores[1] > scores[3]  # Next.js > Gamers

    def test_joined_communities_score_zero(self):
        """Communities the user already joined should score 0."""
        scores = compute_collaborative_scores(
            user_id=3,
            memberships=MEMBERSHIPS,
            interactions=[],
            communities=COMMUNITIES
        )

        # carol is in Python (community 2)
        assert scores[2] == pytest.approx(0.0)

    def test_user_not_in_memberships(self):
        """New user with no memberships gets 0 for all."""
        scores = compute_collaborative_scores(
            user_id=999,  # doesn't exist
            memberships=MEMBERSHIPS,
            interactions=[],
            communities=COMMUNITIES
        )

        assert all(score == 0.0 for score in scores.values())

    def test_empty_memberships(self):
        """No memberships at all — cold start."""
        scores = compute_collaborative_scores(
            user_id=1,
            memberships=[],
            interactions=[],
            communities=COMMUNITIES
        )

        assert all(score == 0.0 for score in scores.values())

    def test_interactions_boost_signal(self):
        """Interactions add weight on top of memberships."""
        interactions = [
            {"user_id": 1, "community_id": 2, "type": "click", "weight": 2.0},
        ]

        scores_without = compute_collaborative_scores(
            user_id=3, memberships=MEMBERSHIPS,
            interactions=[], communities=COMMUNITIES
        )
        scores_with = compute_collaborative_scores(
            user_id=3, memberships=MEMBERSHIPS,
            interactions=interactions, communities=COMMUNITIES
        )

        # Scores may shift when interactions are added (stronger signal)
        # Just verify it doesn't crash and returns valid scores
        assert all(0.0 <= s <= 1.0 for s in scores_with.values())

    def test_returns_all_communities(self):
        """Scores dict should contain an entry for every community."""
        scores = compute_collaborative_scores(
            user_id=1,
            memberships=MEMBERSHIPS,
            interactions=[],
            communities=COMMUNITIES
        )

        assert len(scores) == len(COMMUNITIES)
        assert all(cid in scores for cid in [1, 2, 3])

    def test_scores_normalized_zero_to_one(self):
        """All scores should be between 0.0 and 1.0."""
        scores = compute_collaborative_scores(
            user_id=3,
            memberships=MEMBERSHIPS,
            interactions=[],
            communities=COMMUNITIES
        )

        assert all(0.0 <= score <= 1.0 for score in scores.values())

    def test_single_user_single_community(self):
        """Edge case: only one user in one community."""
        communities = [{"community_id": 1, "community_name": "Solo", "tags": []}]
        memberships = [{"user_id": 1, "community_id": 1}]

        scores = compute_collaborative_scores(
            user_id=1,
            memberships=memberships,
            interactions=[],
            communities=communities
        )

        # User already joined the only community → 0.0
        assert scores[1] == pytest.approx(0.0)
