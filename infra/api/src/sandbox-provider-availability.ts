// Boxd has no usage settlement source yet. Keep this policy shared by runtime
// placement and deployment validation until its billing integration exists.
export const supportsSandboxBilling = (
	providerId: string,
	billingEnforced: boolean,
): boolean => !billingEnforced || providerId !== "boxd";

export const availableSandboxProviders = (
	providers: ReadonlyArray<{
		readonly providerId: string;
		readonly advertised: boolean;
		readonly productionReady: boolean;
	}>,
	sandbox: boolean,
	billingEnforced: boolean,
): Set<string> =>
	new Set(
		providers
			.filter(
				(provider) =>
					provider.advertised &&
					(sandbox || provider.productionReady) &&
					supportsSandboxBilling(provider.providerId, billingEnforced),
			)
			.map((provider) => provider.providerId),
	);
