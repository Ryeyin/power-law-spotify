/**
 * In-memory fallback when Firestore is unavailable (matches soft-fail pattern used elsewhere).
 */
const buckets = new Map<string, Map<string, any>>();

function bucket(name: string): Map<string, any> {
  if (!buckets.has(name)) buckets.set(name, new Map());
  return buckets.get(name)!;
}

export function memorySet(collection: string, id: string, data: any) {
  bucket(collection).set(id, data);
}

export function memoryGet<T>(collection: string, id: string): T | null {
  return (bucket(collection).get(id) as T) || null;
}

export function memoryQueryByUserId<T extends { userId: string }>(
  collection: string,
  userId: string
): T[] {
  const results: T[] = [];
  bucket(collection).forEach((value) => {
    if (value?.userId === userId) results.push(value as T);
  });
  return results;
}

export function memoryDelete(collection: string, id: string) {
  bucket(collection).delete(id);
}
