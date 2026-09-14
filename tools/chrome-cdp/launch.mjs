#!/usr/bin/env node
// Launches a dedicated headless Chrome instance pinned to a fixed CDP port,
// using chrome-launcher (https://github.com/GoogleChrome/chrome-launcher) —
// the same launcher Lighthouse uses in production. Intended to run under a
// supervisor (systemd / the agent's `hub` process manager), which handles
// restart policy; this script only owns launch + readiness + parking.
//
// Docs: https://github.com/GoogleChrome/chrome-launcher#api
import { launch } from "chrome-launcher";

const port = Number(process.env.CDP_PORT || 9222);
const userDataDir = process.env.CDP_USER_DATA_DIR || "/tmp/agent-chrome";

const chrome = await launch({
  port,
  userDataDir,
  chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"],
  // Let the supervisor (systemd/hub) own signal handling; don't let
  // chrome-launcher's own SIGINT handler race with it.
  handleSIGINT: false,
});

console.log(`Chrome CDP ready on 127.0.0.1:${chrome.port} (pid ${chrome.pid}, userDataDir=${userDataDir})`);

// Park so the supervisor can track this process; chrome itself survives
// independently (chrome-launcher spawns it detached), but keeping the
// wrapper alive lets systemd/hub observe/restart the pairing cleanly.
process.on("SIGTERM", () => {
  chrome.kill();
  process.exit(0);
});
await new Promise(() => {});
