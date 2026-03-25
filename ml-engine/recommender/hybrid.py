"""
hybrid.py — Combines content, collaborative, and popularity scores into final recommendations.
Adapts weights automatically for cold-start situations.
"""

# Default weights — must sum to 1.0
DEFAULT_WEIGHTS = {
    "content": 0.5,
    "collab": 0.3,
    "popularity": 0.2,
}


def compute_hybrid_scores(
    content_scores: dict[int, float],
    collab_scores: dict[int, float],
    popularity_scores: dict[int, float],
    already_joined: set[int],
    weights: dict = None,
) -> list[dict]:
    """
    Combines three scoring signals into a final ranked recommendation list.

    content_scores:    {community_id: score} from content_based.py
    collab_scores:     {community_id: score} from ease.py
    popularity_scores: {community_id: score} from popularity.py
    already_joined:    set of community_ids user has joined — excluded from results
    weights:           optional override, e.g. {"content": 0.6, "collab": 0.2, "popularity": 0.2}

    Returns: [{"community_id": 2, "score": 0.72, "content_score": 0.5, "collab_score": 0.65}, ...]
             sorted by score descending
    """
    w = weights or DEFAULT_WEIGHTS.copy()

    # Adapt weights for cold-start scenarios
    w = _adapt_weights_for_cold_start(content_scores, collab_scores, w)

    results = []
    for cid in content_scores.keys():
        # Skip communities the user already joined
        if cid in already_joined:
            continue

        content = content_scores.get(cid, 0.0)
        collab = collab_scores.get(cid, 0.0)
        popularity = popularity_scores.get(cid, 0.0)

        # Weighted combination
        final_score = (
            w["content"] * content +
            w["collab"] * collab +
            w["popularity"] * popularity
        )

        results.append({
            "community_id": cid,
            "score": final_score,
            "content_score": content,
            "collab_score": collab,
        })

    # Sort by final score descending (best first)
    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def _adapt_weights_for_cold_start(
    content_scores: dict[int, float],
    collab_scores: dict[int, float],
    weights: dict,
) -> dict:
    """
    Adjusts weights when we have missing signals.

    - All collab scores are 0 → user has no joins, shift weight to content + popularity
    - All content scores are 0 → user has no interests, fall back entirely to popularity
    """
    w = weights.copy()

    all_collab_zero = all(s == 0.0 for s in collab_scores.values())
    all_content_zero = all(s == 0.0 for s in content_scores.values())

    if all_content_zero and all_collab_zero:
        # No data at all — pure popularity fallback
        w["content"] = 0.0
        w["collab"] = 0.0
        w["popularity"] = 1.0
    elif all_collab_zero:
        # No join history — heavily favor content so stated interests drive results
        w["content"] = 0.85
        w["collab"] = 0.0
        w["popularity"] = 0.15
    elif all_content_zero:
        # No interests — split content weight between collab and popularity
        w["content"] = 0.0
        w["collab"] = 0.5
        w["popularity"] = 0.5

    return w
