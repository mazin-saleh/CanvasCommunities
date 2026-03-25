"""
content_based.py — scores communities by tag overlap with a user's interests.
Algorithm: Jaccard similarity = shared tags / all unique tags combined.
"""


def compute_content_scores(
    user_interests: set[str],
    communities: list[dict]
) -> dict[int, float]:
    """
    Returns a score (0.0–1.0) for each community based on tag overlap.

    user_interests: {"javascript", "ml"}
    communities:    list of dicts from db.fetch_communities_with_tags()

    Example:
        user = {javascript, ml}, community = {python, ml}
        shared = {ml} → 1 tag
        combined = {javascript, ml, python} → 3 tags
        score = 1/3 = 0.33
    """
    scores = {}

    for community in communities:
        # Convert list to set so we can use & (intersection) and | (union)
        community_tags = set(community["tags"])

        intersection = user_interests & community_tags  # tags in both
        union = user_interests | community_tags  # all unique tags across both

        # Guard against dividing by zero when both sets are empty
        scores[community["community_id"]] = len(intersection) / len(union) if union else 0.0

    return scores
