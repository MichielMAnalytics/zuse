import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startKiroSession } from "@zuse/agents/drivers/kiro";
import { AttachmentService } from "@zuse/agents/kernel/attachment-service";
import { __testing, mcpGatewayDiagnostics } from "@zuse/agents/mcp-gateway";
import type { AgentSessionId, FolderId } from "@zuse/contracts";
import { Effect, Layer, Stream } from "effect";
import { afterAll, expect, it } from "vitest";

const attachments = Layer.succeed(AttachmentService, {
	upload: () => Effect.die("unused"),
	saveText: () => Effect.die("unused"),
	read: () => Effect.succeed(null),
	readForSession: () => Effect.succeed(null),
	readPath: () => Effect.succeed(null),
});

afterAll(() => __testing.closeServer());

it("revokes the MCP context when an ACP process crashes before handle disposal", async () => {
	const root = await mkdtemp(join(tmpdir(), "zuse-mcp-crash-"));
	const executable = join(root, "kiro-cli");
	const fixture = new URL(
		"../../../../tests/testkit/fixtures/fake-acp-provider.mjs",
		import.meta.url,
	).href;
	await writeFile(
		executable,
		`#!/usr/bin/env node\nprocess.env.ZUSE_FAKE_ACP_SCENARIO = "crash";\nprocess.env.ZUSE_FAKE_ACP_STATE_DIR = ${JSON.stringify(join(root, "state"))};\nawait import(${JSON.stringify(fixture)});\n`,
	);
	await chmod(executable, 0o755);
	try {
		await Effect.runPromise(
			Effect.gen(function* () {
				const baseline = mcpGatewayDiagnostics().activeSessionCount;
				const handle = yield* startKiroSession(
					{
						folderId: "cleanup-folder" as FolderId,
						providerId: "kiro",
						mode: "sdk",
						model: "claude-sonnet-4.5",
						permissionMode: "default",
					},
					root,
					executable,
					"cleanup-session" as AgentSessionId,
					async () => ({ _tag: "AllowOnce" }),
					() => "approval-required",
					async () => ({ id: "unused", ok: false, error: "unused" }),
					"node",
				);
				yield* Effect.gen(function* () {
					expect(mcpGatewayDiagnostics().activeSessionCount).toBe(baseline + 1);
					yield* handle.send("Crash now").pipe(Effect.catch(() => Effect.void));
					const events = yield* Stream.runCollect(handle.events);
					expect(
						Array.from(events).some((event) => event._tag === "Error"),
					).toBe(true);
					expect(mcpGatewayDiagnostics().activeSessionCount).toBe(baseline);
				}).pipe(Effect.ensuring(handle.close()));
			}).pipe(Effect.provide(attachments), Effect.timeout("10 seconds")),
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
