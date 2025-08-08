export function getValue(obj: Record<string, any>, key: string) {
	if (key in obj) {
		return obj[key];
	}
	return undefined;
}
