/**
 * Playwright global setup — runs once before all tests.
 * Discovers the webpack dev server via Bonjour and stores the
 * connection info in environment variables for the base-url fixture.
 */
import { Bonjour, Service } from "bonjour-service";

async function findDevServer(): Promise<{ port: string; protocol: string }> {
  const bonjour = new Bonjour();
  try {
    const service = await new Promise<Service | null>((resolve) => {
      let settled = false;
      const cleanup = (result: Service | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        httpBrowser.stop();
        httpsBrowser.stop();
        resolve(result);
      };
      const timer = setTimeout(() => cleanup(null), 3000);
      const matchService = (_service: Service) => {
        if (_service.name === process.env.BONJOUR_SERVICE_NAME) {
          cleanup(_service);
        }
      };
      // webpack-dev-server advertises as "http" or "https" based on TLS config
      const httpBrowser = bonjour.find({type: "http"}, matchService);
      const httpsBrowser = bonjour.find({type: "https"}, matchService);
    });

    if (!service) {
      console.error(`\nNo dev server found (looked for Bonjour service '${process.env.BONJOUR_SERVICE_NAME}').`);
      console.error("Start the dev server with: npm start or npm run start:secure\n");
      process.exit(1);
    }

    return { port: service.port.toString(), protocol: service.type === "https" ? "https" : "http" };
  } finally {
    bonjour.destroy();
  }
}

export default async function globalSetup() {
  if (process.env.CI) return;

  const server = await findDevServer();
  process.env.DEV_SERVER_PORT = server.port;
  process.env.DEV_SERVER_PROTOCOL = server.protocol;
  // eslint-disable-next-line no-console
  console.log(`Using dev server at ${server.protocol}://localhost:${server.port}`);
}
