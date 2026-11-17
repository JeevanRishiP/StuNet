#!/usr/bin/env node

const autocannon = require("autocannon");
const { execSync } = require("child_process");

function getPostgresConnections() {
  try {
    const out = execSync(
      `docker exec -e PGPASSWORD=localdevonly stunet_postgres psql -U stunet_owner -d stunet -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'stunet';"`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return parseInt(out.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function getPgBouncerPoolState() {
  try {
    const out = execSync(
      `docker exec -e PGPASSWORD=localdevonly stunet_postgres psql -h pgbouncer -p 6432 -U stunet_owner -d pgbouncer -t -A -F"," -c "SHOW POOLS;"`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const lines = out.trim().split("\n");
    const appLine = lines.find((l) => l.startsWith("stunet,app_service_role"));
    if (appLine) {
      const parts = appLine.split(",");
      return {
        cl_active: parseInt(parts[2], 10) || 0,
        cl_waiting: parseInt(parts[3], 10) || 0,
        sv_active: parseInt(parts[6], 10) || 0,
        sv_idle: parseInt(parts[9], 10) || 0,
        sv_used: parseInt(parts[10], 10) || 0,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

async function getSessionCookie() {
  const csrfRes = await fetch("http://localhost:3010/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const loginRes = await fetch("http://localhost:3010/api/auth/callback/guest-auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies,
    },
    body: new URLSearchParams({ csrfToken }).toString(),
    redirect: "manual",
  });

  return loginRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

function runAutocannonStage(endpoint, concurrency, durationSec, sessionCookie) {
  return new Promise((resolve, reject) => {
    let clientCounter = 0;
    const url = `http://localhost:3010${endpoint}`;

    let maxPgConns = getPostgresConnections();
    let maxClActive = 0;
    let maxClWaiting = 0;
    let maxSvActive = 0;

    const sampler = setInterval(() => {
      const conns = getPostgresConnections();
      if (conns > maxPgConns) maxPgConns = conns;

      const pool = getPgBouncerPoolState();
      if (pool) {
        if (pool.cl_active > maxClActive) maxClActive = pool.cl_active;
        if (pool.cl_waiting > maxClWaiting) maxClWaiting = pool.cl_waiting;
        if (pool.sv_active > maxSvActive) maxSvActive = pool.sv_active;
      }
    }, 200);

    const instance = autocannon(
      {
        url,
        connections: concurrency,
        duration: durationSec,
        setupClient: (client) => {
          clientCounter++;
          const ip = `10.0.${Math.floor(clientCounter / 250)}.${(clientCounter % 250) + 1}`;
          const headers = {
            "x-forwarded-for": ip,
            "x-real-ip": ip,
          };
          if (sessionCookie) {
            headers["cookie"] = sessionCookie;
          }
          client.setHeaders(headers);
        },
      },
      (err, result) => {
        clearInterval(sampler);
        if (err) return reject(err);

        const status429 = result.statusCodeStats?.["429"]?.count || 0;
        const status5xx = result["5xx"] || 0;
        const networkErrors = (result.errors || 0) + (result.timeouts || 0);
        const trueErrors = status5xx + networkErrors;
        const success2xx = result["2xx"] || 0;
        const other4xx = (result["4xx"] || 0) - status429;

        resolve({
          concurrency,
          endpoint,
          throughput: Math.round(result.requests.average),
          p50: result.latency.p50,
          p95: result.latency.p97_5,
          p99: result.latency.p99,
          totalRequests: result.requests.total,
          success2xx,
          status429,
          status5xx,
          networkErrors,
          trueErrors,
          other4xx,
          maxPgConns,
          maxClActive,
          maxClWaiting,
          maxSvActive,
        });
      },
    );
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(
    "=== STUNET SCALABILITY BENCHMARK — PRODUCTION BUILD WITH METHODOLOGY CORRECTION ===",
  );
  console.log(
    "Connecting to local production server (http://localhost:3010) and obtaining session cookie...",
  );

  const sessionCookie = await getSessionCookie();
  console.log("Session authenticated. Cookie ready.\n");

  const endpoints = [
    { name: "Home Feed (/api/posts)", path: "/api/posts", needsAuth: true },
    { name: "Success Board (/api/success-board)", path: "/api/success-board", needsAuth: false },
    { name: "Global Search (/api/search?q=a)", path: "/api/search?q=a", needsAuth: false },
  ];

  const concurrencies = [10, 50, 100, 500, 1000];
  const durationSec = 5;

  const allResults = {};

  for (const ep of endpoints) {
    console.log(`\n============================================================`);
    console.log(`Testing Endpoint: ${ep.name}`);
    console.log(`============================================================`);
    allResults[ep.name] = [];

    for (const c of concurrencies) {
      process.stdout.write(`Testing concurrency ${c} for ${durationSec}s... `);
      const res = await runAutocannonStage(
        ep.path,
        c,
        durationSec,
        ep.needsAuth ? sessionCookie : undefined,
      );
      allResults[ep.name].push(res);
      console.log(
        `Done! Throughput: ${res.throughput} req/s | p50: ${res.p50}ms | p95: ${res.p95}ms | p99: ${res.p99}ms | 2xx: ${res.success2xx} | 429: ${res.status429} | True Errors (5xx/net): ${res.trueErrors} | Max PG Conns: ${res.maxPgConns}/200 | PgBouncer sv_act: ${res.maxSvActive}, cl_wait: ${res.maxClWaiting}`,
      );
      await sleep(1500); // let pool settle
    }
  }

  console.log("\n\n============================================================");
  console.log("FINAL RESULTS SUMMARY TABLES (PRODUCTION BUILD)");
  console.log("============================================================\n");

  for (const ep of endpoints) {
    console.log(`### ${ep.name}`);
    console.log(
      `| Concurrency | Throughput (req/s) | p50 (ms) | p95 (ms) | p99 (ms) | 2xx (Success) | 429 (Rate-Limited) | True Errors (5xx/Net) | Active Postgres Conns | PgBouncer Pool (Active/Wait) |`,
    );
    console.log(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
    for (const r of allResults[ep.name]) {
      console.log(
        `| **${r.concurrency} users** | ${r.throughput} req/s | ${r.p50} ms | ${r.p95} ms | ${r.p99} ms | ${r.success2xx} | ${r.status429} | **${r.trueErrors}** (${r.status5xx} 5xx, ${r.networkErrors} net) | **${r.maxPgConns}** / 200 | cl_act: ${r.maxClActive}, cl_wait: ${r.maxClWaiting}, sv_act: ${r.maxSvActive} |`,
      );
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
