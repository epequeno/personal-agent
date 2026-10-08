// Detached snapshot runner. Usage: node --experimental-strip-types snapshot-cli.ts
import { configFromEnv, pruneSnapshots, snapshotVaults } from "./core.ts";

const cfg = configFromEnv();
const written = snapshotVaults(cfg);
const removed = pruneSnapshots(cfg);
console.log(`snapshots written: ${written.join(", ") || "none"}; pruned: ${removed.length}`);
