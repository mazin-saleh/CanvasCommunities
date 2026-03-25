"""
training.py — Pipeline Orchestrator
=====================================
Coordinates the full recommendation flow: fetch data → run scorers → combine → save.
Call run_for_user(user_id) and everything happens.
"""

import db
from recommender.content_based import compute_content_scores
from recommender.popularity import compute_popularity_scores
from recommender.ease import compute_collaborative_scores
from recommender.hybrid import compute_hybrid_scores


def run_for_user(user_id: int) -> list[dict]:
    """
    Runs the full recommendation pipeline for one user.

    Steps:
        1. Fetch all data from DB
        2. Get user's interests and joined communities
        3. Run content, popularity, collab scorers
        4. Combine with hybrid
        5. Write results to Recommendation table
        6. Return ranked list

    Returns: [{"community_id": 2, "score": 0.72, "content_score": 0.5, "collab_score": 0.3}, ...]

    Raises: ValueError if user_id doesn't exist
    """
    # 1. Fetch all data
    users = db.fetch_users_with_interests()
    communities = db.fetch_communities_with_tags()
    memberships = db.fetch_memberships()
    interactions = db.fetch_interactions()

    # 2. Find target user
    user_data = next((u for u in users if u["user_id"] == user_id), None)
    if user_data is None:
        raise ValueError(f"User {user_id} not found")

    user_interests = set(user_data["tags"])
    user_joined = {m["community_id"] for m in memberships if m["user_id"] == user_id}

    # 3. Run individual scorers
    content_scores = compute_content_scores(user_interests, communities)
    popularity_scores = compute_popularity_scores(memberships, communities)
    collab_scores = compute_collaborative_scores(user_id, memberships, interactions, communities)

    # 4. Combine with hybrid
    results = compute_hybrid_scores(
        content_scores,
        collab_scores,
        popularity_scores,
        already_joined=user_joined
    )

    # 5. Write to DB
    records = [
        {
            "user_id": user_id,
            "community_id": r["community_id"],
            "score": r["score"],
            "content_score": r["content_score"],
            "collab_score": r["collab_score"],
        }
        for r in results
    ]
    db.upsert_recommendations(records)

    # 6. Return results
    return results


def run_for_all_users() -> dict[int, list[dict]]:
    """
    Runs the pipeline for every user in the database.
    Useful for batch recomputation (nightly job, after seeding, etc.)

    Returns: {user_id: [recommendations], ...}
    """
    users = db.fetch_users_with_interests()
    all_results = {}

    for user in users:
        user_id = user["user_id"]
        try:
            all_results[user_id] = run_for_user(user_id)
        except Exception as e:
            # Log error but continue with other users
            print(f"Error computing recommendations for user {user_id}: {e}")
            all_results[user_id] = []

    return all_results
