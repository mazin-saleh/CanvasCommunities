"""
main.py — FastAPI Endpoints
============================
Exposes the ML recommendation pipeline as HTTP endpoints.
The Next.js web platform calls these to trigger and fetch recommendations.
"""

from fastapi import FastAPI, HTTPException

import db
from recommender.training import run_for_user, run_for_all_users

app = FastAPI()


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Basic health check — returns ok if the service is running."""
    return {"status": "ok"}


# ── Recommendation Endpoints ─────────────────────────────────────────────────

# NOTE: /recommend/all must come BEFORE /recommend/{user_id}
# Otherwise FastAPI tries to parse "all" as an integer and fails

@app.post("/recommend/all")
def compute_all_recommendations():
    """
    Batch endpoint — runs the ML pipeline for every user in the database.
    Useful for initial population after seeding or nightly refresh jobs.

    Takes longer but avoids separate POST calls per user.
    """
    try:
        results = run_for_all_users()
        return {
            "computed": True,
            "user_count": len(results),
            "results": {
                user_id: {
                    "count": len(recs),
                    "top_score": recs[0]["score"] if recs else None,
                }
                for user_id, recs in results.items()
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing batch recommendations: {e}")


@app.post("/recommend/{user_id}")
def compute_recommendations(user_id: int):
    """
    Triggers full ML pipeline for one user.
    Computes scores, writes to DB, returns results.

    Use this when you want fresh recommendations (e.g., after user updates interests).
    """
    try:
        results = run_for_user(user_id)
        return {
            "user_id": user_id,
            "computed": True,
            "recommendations": results,
        }
    except ValueError as e:
        # User not found
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Unexpected error
        raise HTTPException(status_code=500, detail=f"Error computing recommendations: {e}")


@app.get("/recommend/{user_id}")
def get_recommendations(user_id: int):
    """
    Reads pre-computed recommendations from the database.
    Fast path — no recomputation, just returns what's stored.

    Use this for normal page loads (recommendations were already computed earlier).
    Returns computed=False if no recommendations exist yet for this user.
    """
    try:
        results = db.fetch_recommendations_for_user(user_id)
        return {
            "user_id": user_id,
            "computed": len(results) > 0,
            "recommendations": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recommendations: {e}")
