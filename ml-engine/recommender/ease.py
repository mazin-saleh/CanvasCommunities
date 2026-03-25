"""
ease.py — Collaborative Filtering (Item-Item Similarity)
=========================================================
Scores communities by similarity to ones the user already joined.
Uses cosine similarity on community membership vectors.
"""

import numpy as np
from scipy.spatial.distance import cosine


def compute_collaborative_scores(
    user_id: int,
    memberships: list[dict],
    interactions: list[dict],
    communities: list[dict]
) -> dict[int, float]:
    """
    Returns a score (0.0–1.0) for each community based on similarity to user's joined communities.

    user_id:      the user we're computing scores for
    memberships:  list from db.fetch_memberships()
    interactions: list from db.fetch_interactions() — adds weight to the signal
    communities:  list from db.fetch_communities_with_tags()

    Returns dict mapping community_id → collaborative score
    """
    # Get all unique user IDs and community IDs
    all_user_ids = sorted(set(m["user_id"] for m in memberships))
    all_community_ids = [c["community_id"] for c in communities]

    # If no memberships exist, return 0.0 for all communities (cold start)
    if not all_user_ids or not all_community_ids:
        return {cid: 0.0 for cid in all_community_ids}

    # Map IDs to matrix indices
    user_idx = {uid: i for i, uid in enumerate(all_user_ids)}
    comm_idx = {cid: i for i, cid in enumerate(all_community_ids)}

    # Build user × community matrix (rows = users, cols = communities)
    matrix = np.zeros((len(all_user_ids), len(all_community_ids)))

    # Fill in 1.0 for each membership
    for m in memberships:
        if m["user_id"] in user_idx and m["community_id"] in comm_idx:
            matrix[user_idx[m["user_id"]], comm_idx[m["community_id"]]] = 1.0

    # Add interaction weights on top (view=0.5, click=1.0, etc.)
    for i in interactions:
        if i["user_id"] in user_idx and i["community_id"] in comm_idx:
            matrix[user_idx[i["user_id"]], comm_idx[i["community_id"]]] += i["weight"]

    # Find which communities this user has joined
    if user_id not in user_idx:
        return {cid: 0.0 for cid in all_community_ids}  # User not in matrix = cold start

    user_row = matrix[user_idx[user_id]]
    joined_indices = np.where(user_row > 0)[0]  # column indices where user has signal

    # If user hasn't joined anything, return 0.0 for all
    if len(joined_indices) == 0:
        return {cid: 0.0 for cid in all_community_ids}

    # Compute item-item similarity: compare community columns
    # For each community, score = average similarity to user's joined communities
    scores = {}
    for cid in all_community_ids:
        col_idx = comm_idx[cid]
        community_col = matrix[:, col_idx]

        # Skip if user already joined this community (we'll filter in hybrid.py anyway)
        if col_idx in joined_indices:
            scores[cid] = 0.0
            continue

        # Average cosine similarity to all joined communities
        similarities = []
        for joined_idx in joined_indices:
            joined_col = matrix[:, joined_idx]

            # Cosine distance → similarity (1 - distance), handle zero vectors
            if np.any(community_col) and np.any(joined_col):
                sim = 1 - cosine(community_col, joined_col)
                similarities.append(sim)

        scores[cid] = np.mean(similarities) if similarities else 0.0

    # Normalize to 0.0–1.0 range
    max_score = max(scores.values(), default=0)
    if max_score > 0:
        scores = {cid: s / max_score for cid, s in scores.items()}

    return scores
