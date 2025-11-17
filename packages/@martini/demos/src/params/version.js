/**
 * Param matcher for version parameter
 * Matches:
 * - Version strings: v0.1, v1.0, etc.
 * - Aliases: latest (current stable), next (pre-release)
 *
 * This prevents content paths like "getting-started" from being treated as versions
 */
export function match(param) {
	return /^(v\d+\.\d+|latest|next)$/.test(param);
}
