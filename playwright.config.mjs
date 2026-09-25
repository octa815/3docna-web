import { defineConfig, devices } from "@playwright/test";

// Usa el Chrome del sistema; WebGL por software para que la impresora 3D se pinte sin GPU.
export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4181", channel: "chrome", locale: "es-ES", timezoneId: "Europe/Madrid",
    launchOptions: { args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] },
  },
  webServer: { command: "python3 -m http.server 4181 --bind 127.0.0.1", url: "http://127.0.0.1:4181", reuseExistingServer: true },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "movil", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
});
