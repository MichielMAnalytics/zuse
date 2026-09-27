import { describe, expect, test } from "vitest";
import { availableSandboxProviders } from "../../src/sandbox-provider-availability.ts";

const providers = [
	{ providerId: "box", advertised: true, productionReady: true },
	{ providerId: "e2b", advertised: true, productionReady: true },
	{ providerId: "boxd", advertised: true, productionReady: true },
	{ providerId: "experimental", advertised: true, productionReady: false },
	{ providerId: "hidden", advertised: false, productionReady: true },
];

describe("sandbox placement availability", () => {
	test.each([
		false,
		true,
	])("excludes unbillable boxd when billing is enforced (sandbox=%s)", (sandbox) => {
		expect([...availableSandboxProviders(providers, sandbox, true)]).toEqual(
			sandbox ? ["box", "e2b", "experimental"] : ["box", "e2b"],
		);
	});
	test.each([
		false,
		true,
	])("allows boxd without billing enforcement (sandbox=%s)", (sandbox) => {
		expect([...availableSandboxProviders(providers, sandbox, false)]).toEqual(
			sandbox ? ["box", "e2b", "boxd", "experimental"] : ["box", "e2b", "boxd"],
		);
	});
});
