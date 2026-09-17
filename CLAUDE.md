# CLAUDE.md — BrianWeb

Guidance for Claude Code when working in this repository.

## What this repo is

A browser dashboard for **BRIAN**, an electronic nose (e-nose) built by the ODR research group at Malmö University. It connects to a BRIAN device with the **Web Bluetooth API** and plots live sensor data. It's used for bench testing, demos and commissioning; field recording (smell walks) happens in the mobile app.

- Live site: https://odrresearchgroup.github.io/BrianWeb/
- Related repos: **BrianHardware** (firmware; defines the BLE contract) and **BrianReactNative** (mobile app, where app/software issues are normally tracked).

## Commands

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173/BrianWeb/
npm run build     # tsc -b && vite build → dist/
npm run preview
npm run lint      # ESLint 9 flat config
```

There are no tests. Before opening a PR, run `npm run build` (includes the type check) and `npm run lint`. BLE behaviour can only be checked with a real device in a supported browser; list what a person should check in the PR.

## Deployment

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml` (`npm ci` → `npm run build` → upload `dist/`). `vite.config.ts` sets `base: "/BrianWeb/"`; keep it, or asset paths break on Pages. Web Bluetooth requires HTTPS (Pages) or `localhost`.

## Stack

React 19, TypeScript ~5.9 (`strict`, `verbatimModuleSyntax`, `erasableSyntaxOnly`: use `import type` for types and avoid enums/namespaces), Vite 8 beta (pinned via `overrides`), Plotly (`plotly.js-dist-min`, `react-plotly.js`), `@types/web-bluetooth`. Code style in this repo uses double quotes.

## Structure

```
src/
  main.tsx            entry
  App.tsx             connection controls, sensor value panel, plot type switching
  useBLE.ts           the core: requestDevice, time sync, characteristic discovery,
                      notification listeners, value parsing, data buffers
  LinePlot.tsx        live time-series plot (via usePlotlyLive)
  BarPlot.tsx         current values
  RadarPlot.tsx       sensor "fingerprint" radar
  usePlotlyLive.ts    imperative Plotly updates (extendTraces/react) for performance
  DataPlot.tsx        legacy stub (2 lines)
  ErrorBoundary.tsx
  *.d.ts              type shims for Plotly
```

### How `useBLE.ts` works

1. `navigator.bluetooth.requestDevice` with filters `name: "BRIAN"`, `name: "esp32"`, `namePrefix: "Brian-"` (current firmware uses unique `Brian-XXXXXX` names). Services must be listed in `optionalServices` to be accessible.
2. Writes the current Unix time (8 bytes, little-endian) to the time-sync characteristic; failure is non-fatal.
3. Discovers **all** characteristics on the ESS and custom services, names them from `ESS_UUID_NAME_MAP` / `CUSTOM_UUID_NAME_MAP` (unknown ones get a generic name), assigns a group (`mems` or `environmental`), skips the time-sync characteristic, and subscribes to notifications.
4. Parses values and keeps a rolling plot buffer (`MAX_PLOT_POINTS = 1000`) plus `allDataPoints` (full history for the session).

## BLE contract (defined by BrianHardware firmware)

Don't change UUIDs or assumptions here without checking the firmware (`BrianHardware/src/main.cpp`).

- Every sensor value is a **4-byte little-endian float32**; gas channels are **volts**.
- ESS service `0x181A`; custom service `de664a17-7db4-449f-97ba-5514e19a9d94`.
- The firmware only creates characteristics for sensor boards it detects at boot, so the set can vary between devices.

| Channel | Characteristic | Group | Unit |
|---|---|---|---|
| CH₄ | `0x2BD1` (ESS) | mems | V |
| VOC | `0x2BD3` (ESS) | mems | V |
| NH₃ | `0x2BCF` (ESS) | mems | V |
| NO₂ | `0x2BD2` (ESS) | mems | V |
| HCHO | `6a135b89-f360-4f64-86fc-5a14092034b4` | mems | V |
| Odor | `4c28fcb8-d69b-404a-8668-41655d814e7f` | mems | V |
| EtOH | `f8156843-6d98-4ba2-8014-1cf03d7dedb8` | mems | V |
| H₂S | `87dc71bd-29a4-4218-a2a7-83fd2a69cc40` | mems | V |
| CO | `88f6fa6c-c4e0-4a3d-ba72-f435641251c4` | mems | V |
| Smoke | `cafb955e-6e7b-424b-9e03-6d8d003aa286` | mems | V |
| H₂ | `0176655b-0007-4e02-abc1-e9f2d6815f46` | mems | V |
| Temperature | `0x2A6E` (ESS) | environmental | °C |
| Pressure | `0x2A6D` (ESS) | environmental | hPa |
| Humidity | `0x2A6F` (ESS) | environmental | % |
| Altitude | `0x2A69` (ESS) | environmental | m |
| BME680 gas resistance | `5b0e3c0b-1a44-4b76-82ee-8c2adc2dd8e9` | environmental | Ω |
| Time sync (write) | `a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d` | control | Unix seconds |

## Gotchas

- **The README is out of date:** it says 8 sensors and lists ESS UUIDs (`0x2BDB`, `0x2BDC`, `0x2BDF`, `0x2BE3`–`0x2BE5`) that don't match the firmware. The table above and the maps in `useBLE.ts` are correct. Fix the README when touching sensor lists.
- `parseFloat32()` first tries to decode the bytes as **text**, then little-endian float, then **big-endian** float, then integers. The firmware always sends little-endian float32, so the fallbacks can silently mis-decode a bad value. Be careful when changing it.
- **Stale GATT cache:** if some sensors are missing but the firmware log shows them, the browser/OS is serving a cached service table. See the README troubleshooting section (forget the device, clear `chrome://bluetooth-internals`, restart the browser).
- Web Bluetooth works in Chrome/Edge/Opera (desktop and Android); **not in Safari or iOS browsers**.
- Plot updates are imperative (`usePlotlyLive`) to avoid re-rendering Plotly on every notification. Don't move plot data into React state that re-renders the whole chart per value.

## Open issues in this repo

- #1 Log data to a downloadable CSV (`allDataPoints` already holds the session data)
- #2 Log data to an InfluxDB instance (the mobile app uses InfluxDB 3 line protocol; reuse the same measurement/field naming as BrianReactNative so data lines up)
- #3 Dynamically load BLE services and characteristics — discovery is already dynamic in `useBLE.ts`; check what's left before starting (probably only naming/grouping of unknown characteristics), and consider closing it.

## Current context (September 2026)

The group's focus is the smell walk on 25 Sept 2026 (mobile app, tracked in BrianReactNative #30). BrianWeb is useful for the sensor QC and side-by-side tests (BrianHardware #15): keep it working with the current firmware, including all 11 gas and 5 environmental channels.
