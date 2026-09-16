/** Fixed-size async worker pool: runs `worker` over `items` with at most
 * `limit` in flight at once. Lives in `shared/` (not `client/`) because it
 * has two consumers on opposite sides of the client/worker split: the Multi
 * Checker page (bounding concurrent token/chat checks) and the cron tick
 * job (bounding concurrent per-bot batch groups against Cloudflare's
 * 6-simultaneous-connection limit — see src/jobs/tick.ts). */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}
