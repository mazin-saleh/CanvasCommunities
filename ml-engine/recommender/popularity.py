"""
popularity.py — Popularity-Based Scoring
==========================================
Scores communities by member count, normalized to 0.0–1.0.
Used as a cold-start fallback when a user has no interests or join history.
"""

from collections import Counter


def compute_popularity_scores(
    memberships: list[dict],
    communities: list[dict]
) -> dict[int, float]:
    """
    Returns a normalized popularity score for each community.

    memberships: list of dicts from db.fetch_memberships()
                 e.g. [{"user_id": 1, "community_id": 2}, ...]
    communities: list of dicts from db.fetch_communities_with_tags()
                 used to ensure every community gets a score, even with 0 members

    Example with seed data:
        Python Enthusiasts — 2 members → 2/2 = 1.0  (most popular)
        Next.js Devs       — 1 member  → 1/2 = 0.5
        Gamers Hub         — 1 member  → 1/2 = 0.5
    """
    # Count how many members each community has
    member_counts = Counter(m["community_id"] for m in memberships)

    # Find the highest count so we can normalize everything against it
    max_count = max(member_counts.values(), default=0)

    scores = {}
    for community in communities:
        cid = community["community_id"]
        count = member_counts.get(cid, 0)  # 0 if community has no members yet

        # Normalize: divide by max so all scores land in 0.0–1.0
        # If max_count is 0 (no memberships at all), everyone scores 0.0
        scores[cid] = count / max_count if max_count > 0 else 0.0

    return scores
