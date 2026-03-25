"""
conftest.py — Shared test fixtures and configuration
"""

import pytest


# ── Reusable Test Data ───────────────────────────────────────────────────────

@pytest.fixture
def sample_communities():
    """Standard test communities matching seed data."""
    return [
        {"community_id": 1, "community_name": "Next.js Devs", "tags": ["javascript", "react"]},
        {"community_id": 2, "community_name": "Python Enthusiasts", "tags": ["python", "ml"]},
        {"community_id": 3, "community_name": "Gamers Hub", "tags": ["gaming", "community"]},
    ]


@pytest.fixture
def sample_memberships():
    """Standard test memberships matching seed data."""
    return [
        {"user_id": 1, "community_id": 1},  # alice → Next.js
        {"user_id": 1, "community_id": 2},  # alice → Python
        {"user_id": 2, "community_id": 3},  # bob → Gamers
        {"user_id": 3, "community_id": 2},  # carol → Python
    ]


@pytest.fixture
def sample_users():
    """Standard test users matching seed data."""
    return [
        {"user_id": 1, "username": "alice", "tags": ["javascript", "ml"]},
        {"user_id": 2, "username": "bob", "tags": ["gaming", "react"]},
        {"user_id": 3, "username": "carol", "tags": ["python", "ml"]},
    ]
