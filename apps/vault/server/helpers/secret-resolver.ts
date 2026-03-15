const SECRET_REF_PATTERN = /\$\{secret:([^}]+)\}/g;

/**
 * Finds all `${secret:path.to.key}` references in a value string.
 * Returns an array of secret paths.
 */
export function findReferences(value: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  const pattern = new RegExp(SECRET_REF_PATTERN.source, "g");
  while ((match = pattern.exec(value)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Replaces all `${secret:path.to.key}` patterns in a value string
 * with resolved values from the resolver function.
 *
 * If a reference can't be resolved, the original pattern is kept.
 * Protects against circular references with a max depth.
 */
export async function resolveReferences(
  value: string,
  resolver: (path: string) => Promise<string | null>,
  maxDepth = 5,
): Promise<string> {
  if (maxDepth <= 0) return value;

  const refs = findReferences(value);
  if (refs.length === 0) return value;

  let result = value;

  for (const ref of refs) {
    const resolved = await resolver(ref);
    if (resolved !== null) {
      result = result.replace(`\${secret:${ref}}`, resolved);
    }
    // If null, keep the original ${secret:...} pattern
  }

  // Check if the resolved value contains more references (nested resolution)
  if (findReferences(result).length > 0) {
    return resolveReferences(result, resolver, maxDepth - 1);
  }

  return result;
}
