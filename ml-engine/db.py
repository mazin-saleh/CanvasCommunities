"""
db.py — All database reads and writes for the ML engine.
Uses SQLAlchemy to talk to Postgres and automap to reflect Prisma's tables.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert as pg_insert

# Pull DATABASE_URL from the .env file
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Engine = the live connection to Postgres
engine = create_engine(DATABASE_URL)

# Reads the live DB schema so SQLAlchemy knows every table and column
metadata = MetaData()
metadata.reflect(bind=engine)

# Turns the reflected tables into Python classes automatically.
# After prepare(), we can do Base.classes.User, Base.classes.Community, etc.
Base = automap_base(metadata=metadata)
Base.prepare()

# ── ORM classes — one per Prisma model ──────────────────────────────────────
User           = Base.classes.User
Community      = Base.classes.Community
Tag            = Base.classes.Tag
Membership     = Base.classes.Membership
Interaction    = Base.classes.Interaction
Recommendation = Base.classes.Recommendation

# ── Prisma implicit join tables ──────────────────────────────────────────────
# Prisma creates these for many-to-many relations. Columns are named "A" and "B"
# in alphabetical order of the two model names.
#   _CommunityTags: A = Community.id, B = Tag.id
#   _UserInterests: A = Tag.id,       B = User.id
community_tags = metadata.tables["_CommunityTags"]
user_interests = metadata.tables["_UserInterests"]

# Session factory — call Session() to open a DB conversation
Session = sessionmaker(bind=engine)


# ── READ FUNCTIONS ────────────────────────────────────────────────────────────


def fetch_users_with_interests() -> list[dict]:
    """
    Returns every user and their interest tags as a list.
    Example: [{"user_id": 1, "username": "alice", "tags": ["javascript", "ml"]}, ...]
    """
    with Session() as session:
        # LEFT JOIN so users with zero interests still appear (tags will be empty list)
        result = session.execute(text("""
            SELECT u.id AS user_id, u.username, t.name AS tag_name
            FROM "User" u
            LEFT JOIN "_UserInterests" ui ON ui."B" = u.id
            LEFT JOIN "Tag" t ON t.id = ui."A"
            ORDER BY u.id
        """))
        rows = result.fetchall()

    # Each user appears once per tag — collapse into one dict with a tags list
    users: dict[int, dict] = {}
    for row in rows:
        uid = row.user_id
        if uid not in users:
            users[uid] = {"user_id": uid, "username": row.username, "tags": []}
        if row.tag_name:  # None when the user has no interests
            users[uid]["tags"].append(row.tag_name)

    return list(users.values())


def fetch_communities_with_tags() -> list[dict]:
    """
    Returns every community and its tags as a list.
    Example: [{"community_id": 1, "community_name": "Next.js Devs", "tags": ["javascript", "react"]}, ...]
    """
    with Session() as session:
        result = session.execute(text("""
            SELECT c.id AS community_id, c.name AS community_name, t.name AS tag_name
            FROM "Community" c
            LEFT JOIN "_CommunityTags" ct ON ct."A" = c.id
            LEFT JOIN "Tag" t ON t.id = ct."B"
            ORDER BY c.id
        """))
        rows = result.fetchall()

    # Same collapse pattern as above
    communities: dict[int, dict] = {}
    for row in rows:
        cid = row.community_id
        if cid not in communities:
            communities[cid] = {
                "community_id": cid,
                "community_name": row.community_name,
                "tags": []
            }
        if row.tag_name:
            communities[cid]["tags"].append(row.tag_name)

    return list(communities.values())


def fetch_memberships() -> list[dict]:
    """
    Returns every membership record — which user joined which community.
    Example: [{"user_id": 1, "community_id": 2}, ...]
    Used by collaborative filtering to see who joined what.
    """
    with Session() as session:
        result = session.execute(text("""
            SELECT "userId" AS user_id, "communityId" AS community_id
            FROM "Membership"
        """))
        rows = result.fetchall()

    return [{"user_id": r.user_id, "community_id": r.community_id} for r in rows]


def fetch_interactions() -> list[dict]:
    """
    Returns every logged user interaction (view, click, rsvp, join) with its weight.
    Example: [{"user_id": 1, "community_id": 3, "type": "view", "weight": 0.5}, ...]

    Weights signal how strongly an action shows interest:
        view → 0.5 | click → 1.0 | rsvp → 2.0 | join → 3.0

    This table is empty until the frontend logs interactions — handled gracefully downstream.
    """
    with Session() as session:
        result = session.execute(text("""
            SELECT "userId" AS user_id, "communityId" AS community_id, type, weight
            FROM "Interaction"
        """))
        rows = result.fetchall()

    return [
        {"user_id": r.user_id, "community_id": r.community_id,
         "type": r.type, "weight": r.weight}
        for r in rows
    ]


def fetch_recommendations_for_user(user_id: int) -> list[dict]:
    """
    Reads pre-computed recommendation scores for one user, sorted best-first.
    Example: [{"community_id": 2, "community_name": "Python Enthusiasts",
               "score": 0.72, "content_score": 0.50, "collab_score": 0.65}, ...]

    This is the fast read path — scores are computed once, stored here,
    and served quickly without re-running the ML pipeline on every request.
    """
    with Session() as session:
        result = session.execute(text("""
            SELECT r."communityId"  AS community_id,
                   c.name           AS community_name,
                   r.score,
                   r."contentScore" AS content_score,
                   r."collabScore"  AS collab_score
            FROM "Recommendation" r
            JOIN "Community" c ON c.id = r."communityId"
            WHERE r."userId" = :user_id
            ORDER BY r.score DESC
        """), {"user_id": user_id})
        rows = result.fetchall()

    return [
        {
            "community_id":   r.community_id,
            "community_name": r.community_name,
            "score":          r.score,
            "content_score":  r.content_score,
            "collab_score":   r.collab_score,
        }
        for r in rows
    ]


# ── WRITE FUNCTION ────────────────────────────────────────────────────────────


def upsert_recommendations(records: list[dict]) -> None:
    """
    Writes computed scores to the Recommendation table.
    "Upsert" = insert if the row is new, update if it already exists.
    This means re-running the pipeline refreshes scores without creating duplicates.

    Each record must have: user_id, community_id, score, content_score, collab_score
    """
    if not records:
        return  # Nothing to write

    with Session() as session:
        for record in records:
            # Convert numpy floats to Python floats (psycopg2 doesn't handle np.float64)
            score = float(record["score"])
            content_score = float(record["content_score"])
            collab_score = float(record["collab_score"])

            # pg_insert adds ON CONFLICT support — standard SQL INSERT doesn't have this
            stmt = pg_insert(Recommendation.__table__).values(
                userId       = record["user_id"],
                communityId  = record["community_id"],
                score        = score,
                contentScore = content_score,
                collabScore  = collab_score,
            ).on_conflict_do_update(
                # Matches the @@unique([userId, communityId]) constraint in schema.prisma
                index_elements=["userId", "communityId"],
                # Overwrite all three score fields when there's a conflict
                set_={
                    "score":        score,
                    "contentScore": content_score,
                    "collabScore":  collab_score,
                }
            )
            session.execute(stmt)

        # Commit writes everything at once — if anything fails, nothing is saved
        session.commit()
