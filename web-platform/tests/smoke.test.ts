/**
 * Integration smoke tests for the full CanvasCommunities stack.
 *
 * What it does: Creates a temporary user, exercises every API endpoint,
 * verifies the ML recommendation pipeline works end-to-end, then cleans up.
 *
 * How to run: npm run test:smoke  (requires both Next.js and ML engine running)
 */

const API = process.env.API_URL || "http://localhost:3000";
const ML = process.env.ML_URL || "http://localhost:8000";

// Unique username per run so tests never collide
const TEST_USERNAME = `smoke_${Date.now()}`;
const TEST_PASSWORD = "testpass123";

let testUserId: number;

// -- Helpers --

async function api<T = any>(
  path: string,
  opts: RequestInit = {}
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function ml<T = any>(
  path: string,
  opts: RequestInit = {}
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${ML}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

// -- Tests --

async function testHealthChecks() {
  // ML engine health
  const mlHealth = await ml("/health");
  assert(mlHealth.status === 200, "ML engine /health should return 200");
  assert(mlHealth.data.status === "ok", "ML engine should report status ok");

  // Next.js tags endpoint as a health proxy
  const tags = await api("/api/tags");
  assert(tags.status === 200, "Next.js /api/tags should return 200");
  assert(Array.isArray(tags.data), "Tags should be an array");
  assert(tags.data.length > 0, "Should have at least one tag");
}

async function testCreateUser() {
  // Create test user
  const res = await api("/api/user/create", {
    method: "POST",
    body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD }),
  });
  assert(res.status === 200, `Create user should return 200, got ${res.status}`);
  assert(typeof res.data.id === "number", "User should have numeric id");
  assert(res.data.username === TEST_USERNAME, "Username should match");
  testUserId = res.data.id;

  // Verify interests are empty
  const interests = await api(`/api/user/interests?userId=${testUserId}`);
  assert(interests.status === 200, "Get interests should return 200");
  assert(Array.isArray(interests.data), "Interests should be an array");
  assert(interests.data.length === 0, "New user should have no interests");
}

async function testDuplicateUsername() {
  const res = await api("/api/user/create", {
    method: "POST",
    body: JSON.stringify({ username: TEST_USERNAME, password: "other" }),
  });
  assert(res.status === 409, `Duplicate username should return 409, got ${res.status}`);
  assert(res.data.error === "Username already taken", "Should say username taken");
}

async function testMissingParams() {
  const res = await api("/api/user/create", {
    method: "POST",
    body: JSON.stringify({ username: "" }),
  });
  assert(res.status === 400, `Missing params should return 400, got ${res.status}`);
}

async function testAddInterests() {
  // Add "Law" interest
  const res1 = await api("/api/user/add-interest", {
    method: "PATCH",
    body: JSON.stringify({ userId: testUserId, tagName: "Law" }),
  });
  assert(res1.status === 200, "Add interest Law should return 200");
  // Verify no password in response
  assert(!res1.data.password, "Response should not contain password");

  // Add "Outdoors" interest
  const res2 = await api("/api/user/add-interest", {
    method: "PATCH",
    body: JSON.stringify({ userId: testUserId, tagName: "Outdoors" }),
  });
  assert(res2.status === 200, "Add interest Outdoors should return 200");

  // Verify both interests are saved
  const interests = await api(`/api/user/interests?userId=${testUserId}`);
  const names = interests.data.map((t: any) => t.name).sort();
  assert(names.includes("Law"), "Should have Law interest");
  assert(names.includes("Outdoors"), "Should have Outdoors interest");
}

async function testRemoveInterest() {
  // Add then remove a temporary interest
  await api("/api/user/add-interest", {
    method: "PATCH",
    body: JSON.stringify({ userId: testUserId, tagName: "Gaming" }),
  });

  const res = await api("/api/user/remove-interest", {
    method: "PATCH",
    body: JSON.stringify({ userId: testUserId, tagName: "Gaming" }),
  });
  assert(res.status === 200, "Remove interest should return 200");
  assert(!res.data.password, "Response should not contain password");

  // Verify Gaming is gone
  const interests = await api(`/api/user/interests?userId=${testUserId}`);
  const names = interests.data.map((t: any) => t.name);
  assert(!names.includes("Gaming"), "Gaming should be removed");
}

async function testRecommendations() {
  // Trigger ML computation
  const mlRes = await ml(`/recommend/${testUserId}`, { method: "POST" });
  assert(mlRes.status === 200, `ML POST should return 200, got ${mlRes.status}`);
  assert(mlRes.data.computed === true, "ML should report computed=true");

  // Fetch recs via frontend API
  const recs = await api(`/api/community/recommend?userId=${testUserId}`);
  assert(recs.status === 200, "GET recommend should return 200");
  assert(Array.isArray(recs.data), "Recommendations should be an array");
  assert(recs.data.length > 0, "Should have at least one recommendation");
  assert(recs.data.length <= 10, `Should be capped at 10, got ${recs.data.length}`);

  // Top results should include law-related or outdoor clubs
  const topNames: string[] = recs.data.slice(0, 5).map((c: any) => c.name);
  const hasLawClub = topNames.some(
    (n) => n.includes("Law") || n.includes("Mock Trial") || n.includes("Constitutional")
  );
  const hasOutdoorClub = topNames.some(
    (n) => n.includes("Hiker") || n.includes("Outdoor") || n.includes("Camping")
  );
  assert(
    hasLawClub || hasOutdoorClub,
    `Top 5 recs should include a law or outdoor club, got: ${topNames.join(", ")}`
  );

  // Each rec should have tags and score
  for (const rec of recs.data) {
    assert(typeof rec.name === "string", "Rec should have name");
    assert(typeof rec.score === "number", "Rec should have numeric score");
    assert(rec.score > 0, "Rec score should be > 0 (zero-score filtered)");
    assert(Array.isArray(rec.tags), "Rec should have tags array");
  }
}

async function testJoinCommunity() {
  // Get a recommended community to join
  const recs = await api(`/api/community/recommend?userId=${testUserId}`);
  const communityId = recs.data[0].id;

  // Join it
  const res = await api("/api/user/join-community", {
    method: "PATCH",
    body: JSON.stringify({ userId: testUserId, communityId }),
  });
  assert(res.status === 200, "Join community should return 200");
  assert(res.data.userId === testUserId, "Membership should reference test user");
  assert(res.data.communityId === communityId, "Membership should reference community");

  // Verify membership shows up
  const communities = await api("/api/user/communities", {
    method: "POST",
    body: JSON.stringify({ userId: testUserId }),
  });
  assert(communities.status === 200, "Get communities should return 200");
  const ids = communities.data.map((m: any) => m.communityId);
  assert(ids.includes(communityId), "Should be member of joined community");

  // Duplicate join should not crash
  const dup = await api("/api/user/join-community", {
    method: "PATCH",
    body: JSON.stringify({ userId: testUserId, communityId }),
  });
  assert(dup.status === 200, "Duplicate join should return 200 (idempotent)");
}

async function testInvalidUser() {
  // Recommendations for non-existent user
  const recs = await api("/api/community/recommend?userId=999999");
  assert(recs.status === 200, "Invalid user recs should return 200");
  assert(Array.isArray(recs.data), "Should return an array");
  assert(recs.data.length === 0, "Should be empty for non-existent user");

  // ML engine for non-existent user
  const mlRes = await ml("/recommend/999999", { method: "POST" });
  assert(mlRes.status === 404, "ML should return 404 for invalid user");
}

async function testMLGetRecommend() {
  // GET (pre-computed) vs POST (compute fresh) should both work
  const getRes = await ml(`/recommend/${testUserId}`);
  assert(getRes.status === 200, "ML GET recommend should return 200");
  assert(getRes.data.computed === true, "Should have pre-computed recs");
  assert(getRes.data.recommendations.length > 0, "Should have recommendations");
}

// -- Cleanup --

async function cleanup() {
  // Delete the test user and all related data
  // Direct DB cleanup via a small API or just leave it (IDs are unique per run)
  console.log(`  Cleanup: test user ${TEST_USERNAME} (id=${testUserId}) left in DB`);
  console.log("  (Unique per run, won't affect future tests)");
}

// -- Runner --

type Test = { name: string; fn: () => Promise<void> };

const tests: Test[] = [
  { name: "Health checks (ML + Next.js)", fn: testHealthChecks },
  { name: "Create user", fn: testCreateUser },
  { name: "Duplicate username rejected", fn: testDuplicateUsername },
  { name: "Missing params rejected", fn: testMissingParams },
  { name: "Add interests", fn: testAddInterests },
  { name: "Remove interest", fn: testRemoveInterest },
  { name: "ML recommendations match interests", fn: testRecommendations },
  { name: "Join community + duplicate join", fn: testJoinCommunity },
  { name: "Invalid user edge cases", fn: testInvalidUser },
  { name: "ML GET pre-computed recs", fn: testMLGetRecommend },
];

async function run() {
  console.log(`\n  Smoke Tests — ${new Date().toLocaleTimeString()}`);
  console.log(`  User: ${TEST_USERNAME}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`  ✓ ${test.name}`);
      passed++;
    } catch (err: any) {
      console.log(`  ✗ ${test.name}`);
      console.log(`    ${err.message}`);
      failed++;
    }
  }

  await cleanup();

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
