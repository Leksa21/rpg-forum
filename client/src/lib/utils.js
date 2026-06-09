// Normalize a MongoDB ObjectId reference (populated object or raw string) to string | null
export function toId(v) {
  if (!v) return null;
  if (typeof v === 'object' && v._id) return v._id.toString();
  return v.toString();
}
