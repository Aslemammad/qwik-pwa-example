/*
 * WHAT IS THIS FILE?
 *
 * The service-worker.ts file is used to have state of the art prefetching.
 * https://qwik.builder.io/qwikcity/prefetching/overview/
 *
 * Qwik uses a service worker to speed up your site and reduce latency, ie, not used in the traditional way of offline.
 * You can also use this file to add more functionality that runs in the service worker.
 */
import { setupServiceWorker } from "@builder.io/qwik-city/service-worker";
import type { PrecacheEntry } from "workbox-precaching";
import { getCacheKeyForURL, precacheAndRoute } from "workbox-precaching";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";

import { registerRoute } from "workbox-routing";

console.log(routes);
const assets = [...publicDirAssets, ...emittedAssets];

registerRoute(
  ({ url }) => routes.includes(url.pathname),
  new StaleWhileRevalidate()
);

registerRoute(({ url }) => assets.includes(url.pathname), new CacheFirst());

precacheAndRoute(urlsToEntries([...routes, ...assets], manifestHash));

setupServiceWorker();

addEventListener("install", () => self.skipWaiting());

addEventListener("activate", () => self.clients.claim());

const base = "/build/"; // temp, it should be dynamic based on the build
const qprefetchEvent = new MessageEvent<ServiceWorkerMessage>("message", {
  data: {
    type: "qprefetch",
    base,
    links: routes,
    bundles: appBundles.map((appBundle) => appBundle[0]),
  },
});

self.dispatchEvent(qprefetchEvent);

function urlsToEntries(urls: string[], hash: string): PrecacheEntry[] {
  return urls.map((url) => ({
    url,
    // we should think about enabling this https://github.com/GoogleChrome/workbox/issues/2024
    // revision: hash
  }));
}

declare const self: ServiceWorkerGlobalScope;

export type AppSymbols = Map<string, string>;
export type AppBundle =
  | [bundleName: string, importedBundleIds: number[]]
  | [
      bundleName: string,
      importedBundleIds: number[],
      symbolHashesInBundle: string[],
    ];

export type LinkBundle = [routePattern: RegExp, bundleIds: number[]];

export interface QPrefetchData {
  links?: string[];
  bundles?: string[];
  symbols?: string[];
}

export interface QPrefetchMessage extends QPrefetchData {
  type: "qprefetch";
  base: string;
}

export type ServiceWorkerMessage = QPrefetchMessage;

export interface ServiceWorkerMessageEvent {
  data: ServiceWorkerMessage;
}
declare const appBundles: AppBundle[];
declare const libraryBundleIds: number[];
declare const linkBundles: LinkBundle[];

declare const publicDirAssets: string[];
declare const emittedAssets: string[];
declare const routes: string[];
declare const manifestHash: string;
