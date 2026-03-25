import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/dashboard/pretty
 *
 * Visual admin dashboard showing the full state of the system.
 * Open: http://localhost:3000/api/admin/dashboard/pretty
 */
export async function GET() {
  const [users, communities] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        interests: { select: { name: true } },
        memberships: {
          select: {
            community: { select: { name: true } },
            joinedAt: true,
          },
          orderBy: { joinedAt: "desc" },
        },
        recommendations: {
          where: { score: { gt: 0 } },
          select: {
            community: { select: { name: true, tags: { select: { name: true } } } },
            score: true,
            contentScore: true,
            collabScore: true,
          },
          orderBy: { score: "desc" },
          take: 5,
        },
      },
      orderBy: { id: "desc" },
    }),
    prisma.community.findMany({
      select: {
        id: true,
        name: true,
        tags: { select: { name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Filter out smoke test users
  const realUsers = users.filter((u) => !u.username.startsWith("smoke_"));
  const seedUsers = realUsers.filter((u) => u.id <= 12);
  const signedUpUsers = realUsers.filter((u) => u.id > 12);

  function userCard(u: typeof users[0]) {
    const interests = u.interests.map((t) => t.name);
    const joined = u.memberships.map((m) => m.community.name);

    const recsHtml = u.recommendations.length === 0
      ? `<p class="muted">No recommendations yet</p>`
      : u.recommendations
          .map((r) => {
            const communityTags = r.community.tags.map((t) => t.name);
            const matching = communityTags.filter((t) => interests.includes(t));
            const matchBadge = matching.length > 0
              ? `<span class="match">matched: ${matching.join(", ")}</span>`
              : `<span class="popularity">popularity-based</span>`;

            // Score bar width
            const pct = Math.round(r.score * 100);

            return `<div class="rec-row">
              <div class="rec-bar" style="width:${Math.max(pct, 8)}%"></div>
              <div class="rec-info">
                <strong>${r.community.name}</strong> <span class="score">${pct}% match</span>
                ${matchBadge}
              </div>
            </div>`;
          })
          .join("");

    const searchText = [u.username, ...interests, ...joined].join(' ');

    return `<div class="user-card" data-search="${searchText.replace(/"/g, '')}">
      <div class="user-header">
        <div>
          <span class="user-id">#${u.id}</span>
          <span class="user-name">${u.username}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-label">Interests</div>
        <div class="tags">
          ${interests.length > 0
            ? interests.map((t) => `<span class="tag">${t}</span>`).join("")
            : `<span class="muted">None selected</span>`}
        </div>
      </div>

      <div class="section">
        <div class="section-label">Joined Clubs</div>
        <div class="tags">
          ${joined.length > 0
            ? joined.map((c) => `<span class="tag joined">${c}</span>`).join("")
            : `<span class="muted">Hasn't joined any clubs yet</span>`}
        </div>
      </div>

      <div class="section">
        <div class="section-label">Top 5 Recommended Clubs</div>
        <div class="recs">${recsHtml}</div>
      </div>
    </div>`;
  }

  // Community table grouped by member count
  const commRows = communities
    .sort((a, b) => b._count.members - a._count.members)
    .map(
      (c) => `<tr>
        <td>${c.id}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.tags.map((t) => `<span class="tag sm">${t.name}</span>`).join(" ")}</td>
        <td class="center">${c._count.members}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head>
<title>Admin Dashboard</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 1100px; margin: 0 auto; padding: 20px 24px; background: #f4f5f7; color: #1a1a1a; }
  h1 { font-size: 22px; color: #1a1a1a; border-bottom: 3px solid #e96d2b; padding-bottom: 8px; margin-bottom: 4px; }
  h1 span { color: #e96d2b; }
  .subtitle { color: #888; font-size: 13px; margin-bottom: 24px; }
  .subtitle a { color: #e96d2b; }
  h2 { font-size: 16px; color: #444; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #ddd; }

  /* Summary */
  .summary { display: flex; gap: 12px; margin: 20px 0; }
  .stat { background: white; padding: 14px 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; flex: 1; }
  .stat .num { font-size: 26px; font-weight: 700; color: #e96d2b; }
  .stat .label { font-size: 11px; color: #999; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* User cards */
  .user-card { background: white; border-radius: 10px; padding: 16px 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .user-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .user-id { color: #bbb; font-size: 12px; margin-right: 6px; }
  .user-name { font-size: 16px; font-weight: 600; }
  .section { margin-bottom: 10px; }
  .section-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }

  /* Tags */
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { display: inline-block; background: #eef1f5; color: #555; padding: 3px 10px; border-radius: 14px; font-size: 11px; }
  .tag.joined { background: #d4edda; color: #155724; }
  .tag.sm { font-size: 10px; padding: 2px 7px; }
  .muted { color: #bbb; font-size: 12px; font-style: italic; }

  /* Recommendation bars */
  .recs { display: flex; flex-direction: column; gap: 6px; }
  .rec-row { position: relative; background: #f8f9fa; border-radius: 6px; overflow: hidden; min-height: 32px; }
  .rec-bar { position: absolute; top: 0; left: 0; bottom: 0; background: linear-gradient(90deg, #e96d2b22, #e96d2b33); border-radius: 6px; }
  .rec-info { position: relative; padding: 6px 10px; font-size: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .rec-info strong { font-size: 12px; }
  .score { color: #e96d2b; font-weight: 600; font-size: 11px; }
  .match { background: #d4edda; color: #155724; padding: 1px 6px; border-radius: 8px; font-size: 10px; }
  .popularity { background: #fff3cd; color: #856404; padding: 1px 6px; border-radius: 8px; font-size: 10px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin: 8px 0 24px; }
  th { background: #2d3748; color: white; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 6px 12px; border-top: 1px solid #f0f0f0; font-size: 12px; }
  td.center { text-align: center; }
  tr:hover td { background: #fafbfc; }

  /* Collapsible */
  details { margin-bottom: 8px; }
  summary { cursor: pointer; font-size: 14px; font-weight: 600; color: #555; padding: 4px 0; }

  /* Search */
  .search-box {
    width: 100%;
    padding: 8px 14px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    margin: 8px 0 12px;
    outline: none;
    transition: border-color 0.2s;
  }
  .search-box:focus { border-color: #e96d2b; }
  .hidden { display: none !important; }
</style>
<script>
function filterCards(inputId, containerId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);
  if (!input || !container) return;

  input.addEventListener('input', function() {
    const q = this.value.toLowerCase().trim();
    const cards = container.querySelectorAll('[data-search]');
    cards.forEach(card => {
      const text = card.getAttribute('data-search').toLowerCase();
      card.classList.toggle('hidden', q !== '' && !text.includes(q));
    });
  });
}

function filterTable(inputId, tableId) {
  const input = document.getElementById(inputId);
  const table = document.getElementById(tableId);
  if (!input || !table) return;

  input.addEventListener('input', function() {
    const q = this.value.toLowerCase().trim();
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.classList.toggle('hidden', q !== '' && !text.includes(q));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  filterCards('search-signup', 'signup-cards');
  filterCards('search-seed', 'seed-cards');
  filterTable('search-communities', 'communities-table');
});
</script>
</head><body>

<h1>Canvas<span>Communities</span> Dashboard</h1>
<p class="subtitle">Live database snapshot &middot; <a href="/api/admin/dashboard">JSON API</a></p>

<div class="summary">
  <div class="stat"><div class="num">${signedUpUsers.length}</div><div class="label">Signed Up Users</div></div>
  <div class="stat"><div class="num">${communities.length}</div><div class="label">Communities</div></div>
  <div class="stat"><div class="num">${users.reduce((n, u) => n + u.memberships.length, 0)}</div><div class="label">Total Joins</div></div>
  <div class="stat"><div class="num">${users.reduce((n, u) => n + u.interests.length, 0)}</div><div class="label">Total Interests</div></div>
</div>

<details open>
  <summary>Signed Up Users (${signedUpUsers.length})</summary>
  <input type="search" id="search-signup" class="search-box" placeholder="Search by username, interest, or club...">
  <div id="signup-cards">
    ${signedUpUsers.length === 0 ? '<p class="muted">No users have signed up yet</p>' : signedUpUsers.map(userCard).join("")}
  </div>
</details>

<details>
  <summary>Seed Users (${seedUsers.length})</summary>
  <input type="search" id="search-seed" class="search-box" placeholder="Search by username, interest, or club...">
  <div id="seed-cards">
    ${seedUsers.map(userCard).join("")}
  </div>
</details>

<h2>All Communities (${communities.length})</h2>
<input type="search" id="search-communities" class="search-box" placeholder="Search by name or tag...">
<table id="communities-table">
  <thead><tr><th>ID</th><th>Name</th><th>Tags</th><th>Members</th></tr></thead>
  <tbody>${commRows}</tbody>
</table>

</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
