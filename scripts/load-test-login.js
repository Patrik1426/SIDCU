// scripts/load-test-login.js
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "http://localhost:3000";

export const options = {
  scenarios: {
    login_burst: {
      executor: "ramping-arrival-rate",
      startRate: 0,
      timeUnit: "1s",
      preAllocatedVUs: 100,
      maxVUs: 300,
      stages: [
        { target: 8, duration: "60s" }, // ~300-500 logins repartidos en 60s
        { target: 0, duration: "5s" },
      ],
      exec: "login",
    },
    dashboard_reads: {
      executor: "constant-vus",
      vus: 20,
      duration: "60s",
      exec: "readDashboard",
    },
  },
  thresholds: {
    "http_req_duration{scenario:login_burst}": ["p(95)<2000"],
    "http_req_duration{scenario:dashboard_reads}": ["p(95)<1000"],
  },
};

// NOTA: reemplazar CURP/password por credenciales de usuarios PWTEST_
// sembrados antes de correr (ver Step 4), nunca credenciales reales.
export function login() {
  const idx = Math.floor(Math.random() * 300);
  const curp = `PWTS900101HDF${String(idx).padStart(3, "0")}01`;
  const res = http.post(
    `${BASE_URL}/api/trpc/auth.login`,
    JSON.stringify({ json: { curp, password: "LoadTest12345" } }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, { "login status 200": (r) => r.status === 200 });
  sleep(1);
}

export function readDashboard() {
  const res = http.get(`${BASE_URL}/api/trpc/servidores.estadisticas`);
  check(res, { "dashboard status 200 or 401": (r) => r.status === 200 || r.status === 401 });
  sleep(1);
}
