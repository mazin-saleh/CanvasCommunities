"""
test_hybrid.py — Tests for hybrid score combination
"""

import pytest
from recommender.hybrid import compute_hybrid_scores, _adapt_weights_for_cold_start


# ── Sample Data ──────────────────────────────────────────────────────────────

CONTENT_SCORES = {1: 0.5, 2: 0.8, 3: 0.2}
COLLAB_SCORES = {1: 0.3, 2: 0.4, 3: 0.9}
POPULARITY_SCORES = {1: 1.0, 2: 0.5, 3: 0.5}


# ── Tests ────────────────────────────────────────────────────────────────────

class TestComputeHybridScores:

    def test_basic_combination(self):
        """Scores are combined with default weights."""
        results = compute_hybrid_scores(
            CONTENT_SCORES, COLLAB_SCORES, POPULARITY_SCORES,
            already_joined=set()
        )

        # All 3 communities should be in results
        assert len(results) == 3

        # Results should be sorted by score descending
        scores = [r["score"] for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_excludes_joined_communities(self):
        """Communities the user joined are excluded."""
        results = compute_hybrid_scores(
            CONTENT_SCORES, COLLAB_SCORES, POPULARITY_SCORES,
            already_joined={1, 2}  # user joined communities 1 and 2
        )

        # Only community 3 should remain
        assert len(results) == 1
        assert results[0]["community_id"] == 3

    def test_returns_all_score_components(self):
        """Each result includes content_score and collab_score for transparency."""
        results = compute_hybrid_scores(
            CONTENT_SCORES, COLLAB_SCORES, POPULARITY_SCORES,
            already_joined=set()
        )

        for r in results:
            assert "community_id" in r
            assert "score" in r
            assert "content_score" in r
            assert "collab_score" in r

    def test_custom_weights(self):
        """Custom weights override defaults."""
        custom = {"content": 1.0, "collab": 0.0, "popularity": 0.0}

        results = compute_hybrid_scores(
            CONTENT_SCORES, COLLAB_SCORES, POPULARITY_SCORES,
            already_joined=set(),
            weights=custom
        )

        # With only content weight, scores should equal content_scores
        for r in results:
            assert r["score"] == pytest.approx(r["content_score"])

    def test_sorted_descending(self):
        """Results are sorted by final score, best first."""
        results = compute_hybrid_scores(
            CONTENT_SCORES, COLLAB_SCORES, POPULARITY_SCORES,
            already_joined=set()
        )

        for i in range(len(results) - 1):
            assert results[i]["score"] >= results[i + 1]["score"]


class TestAdaptWeightsForColdStart:

    def test_all_scores_present(self):
        """When all scores are present, weights stay unchanged."""
        content = {1: 0.5, 2: 0.3}
        collab = {1: 0.4, 2: 0.6}
        weights = {"content": 0.5, "collab": 0.3, "popularity": 0.2}

        adapted = _adapt_weights_for_cold_start(content, collab, weights)

        assert adapted == weights

    def test_all_collab_zero(self):
        """When collab is all zeros, shift weight to content + popularity."""
        content = {1: 0.5, 2: 0.3}
        collab = {1: 0.0, 2: 0.0}  # no join history
        weights = {"content": 0.5, "collab": 0.3, "popularity": 0.2}

        adapted = _adapt_weights_for_cold_start(content, collab, weights)

        assert adapted["content"] == 0.7
        assert adapted["collab"] == 0.0
        assert adapted["popularity"] == 0.3

    def test_all_content_zero(self):
        """When content is all zeros, shift weight to collab + popularity."""
        content = {1: 0.0, 2: 0.0}  # no interests
        collab = {1: 0.4, 2: 0.6}
        weights = {"content": 0.5, "collab": 0.3, "popularity": 0.2}

        adapted = _adapt_weights_for_cold_start(content, collab, weights)

        assert adapted["content"] == 0.0
        assert adapted["collab"] == 0.5
        assert adapted["popularity"] == 0.5

    def test_all_scores_zero(self):
        """When everything is zero, fall back entirely to popularity."""
        content = {1: 0.0, 2: 0.0}
        collab = {1: 0.0, 2: 0.0}
        weights = {"content": 0.5, "collab": 0.3, "popularity": 0.2}

        adapted = _adapt_weights_for_cold_start(content, collab, weights)

        assert adapted["content"] == 0.0
        assert adapted["collab"] == 0.0
        assert adapted["popularity"] == 1.0

    def test_does_not_mutate_original(self):
        """Original weights dict should not be modified."""
        content = {1: 0.0, 2: 0.0}
        collab = {1: 0.0, 2: 0.0}
        original = {"content": 0.5, "collab": 0.3, "popularity": 0.2}

        _adapt_weights_for_cold_start(content, collab, original)

        # Original should be unchanged
        assert original["content"] == 0.5
        assert original["collab"] == 0.3
        assert original["popularity"] == 0.2
