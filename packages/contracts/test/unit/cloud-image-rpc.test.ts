import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { CloudAccountImageStatusRpc } from "../../src/cloud-workspaces.ts";

describe("cloud.image.status payload", () => {
	const schema = CloudAccountImageStatusRpc.payloadSchema;

	it.each([
		"box",
		"e2b",
		"boxd",
	])("preserves %s through RPC encoding and decoding", (providerId) => {
		const payload = { providerId };
		const encoded = Schema.encodeSync(schema)(payload);
		expect(encoded).toEqual(payload);
		expect(Schema.decodeUnknownSync(schema)(encoded)).toEqual(payload);
	});

	it("accepts legacy calls without a provider", () => {
		for (const payload of [undefined, {}]) {
			const encoded = Schema.encodeSync(schema)(payload);
			expect(Schema.decodeUnknownSync(schema)(encoded)).toEqual(payload);
		}
	});
});
