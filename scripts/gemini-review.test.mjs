import test from "node:test";
import assert from "node:assert/strict";
import { eligible, sensitivePath, buildReviewInput, formatComment } from "./gemini-review.mjs";

test("aceita apenas PR aberta, não draft, do mesmo repositório para main", () => {
  const pr = { state: "open", draft: false, base: { ref: "main" }, head: { repo: { full_name: "owner/repo" } } };
  assert.equal(eligible(pr, "owner/repo"), true);
  assert.equal(eligible(pr, "other/repo"), false);
  assert.equal(eligible({ ...pr, draft: true }, "owner/repo"), false);
  assert.equal(eligible({ ...pr, state: "closed" }, "owner/repo"), false);
  assert.equal(eligible({ ...pr, base: { ref: "dev" } }, "owner/repo"), false);
});
test("exclui arquivos sensíveis, renomeados, lockfiles e patches ausentes", () => {
  assert.equal(sensitivePath("src/.env.local"), true);
  assert.equal(sensitivePath("keys/server.pem"), true);
  assert.equal(sensitivePath("src/components/Trip.tsx"), false);
  const scope = buildReviewInput([
    { filename: "src/a.ts", patch: "+const a = 1;" },
    { filename: ".env", patch: "+password=x" },
    { filename: "other.txt", previous_filename: ".env", patch: "+key" },
    { filename: "package-lock.json", patch: "+change" },
    { filename: "image.png" },
    { filename: "src/huge.ts", patch: "x".repeat(100_001) },
    { filename: "src/token.ts", patch: "+const token = 'example-not-a-real-token-123456789';" }
  ], 9);
  assert.equal(scope.included.length, 1);
  assert.equal(scope.omitted.length, 6);
  assert.equal(scope.unlisted, 2);
});
test("neutraliza menções e fechamento do bloco de texto", () => {
  const comment = formatComment({ sha: "abc123", model: "gemini-test", scope: { included: [], omitted: [], unlisted: 0 }, review: "@owner ~~~ <img>" });
  assert.ok(comment.startsWith("<!-- space-truck-gemini-review:v1 -->"));
  assert.ok(!comment.includes("@owner"));
  assert.ok(!comment.includes("<img>"));
  assert.equal((comment.match(/~~~/g) || []).length, 2);
});
