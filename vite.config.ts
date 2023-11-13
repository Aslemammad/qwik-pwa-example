import { routes } from '@qwik-city-plan';
import { PluginOption, defineConfig, Plugin, } from "vite";
import { QwikVitePlugin, qwikVite } from "@builder.io/qwik/optimizer";
import { QwikCityPlugin, qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import fs from "node:fs/promises";
import fg from 'fast-glob'

export default defineConfig(() => {
  return {
    plugins: [
      
      
      qwikCity(), qwikVite(), tsconfigPaths(),
      qwikPwa()
    
      // VitePWA({
      //   strategies: 'injectManifest',
      //   srcDir: 'src',
      //   filename: 'routes/service-worker.ts'
      // }),
    
    ],
    preview: {
      headers: {
        "Cache-Control": "public, max-age=600",
      },
    },
  };
});

let tempGenerateFunc: NonNullable<Plugin['generateBundle']> = (() => {}) satisfies Plugin['generateBundle']
type OutputBundle = Parameters<typeof tempGenerateFunc>[1]


export function qwikPwa(): PluginOption {
  let qwikPlugin: QwikVitePlugin | null = null;
  let qwikCityPlugin: QwikCityPlugin | null = null;
  let rootDir: string | null = null
  let outDir: string | null = null;
  let publicDir: string | null = null;
  let clientOut

  // make the type an argument of the generateBundle function
  let bundle: OutputBundle

  return [{
    name: 'qwik-pwa',
    enforce: 'post',
    apply(config, env) {
      if (env.ssrBuild) {
        return false
      }
      return true
    },
    configResolved(config) {
      rootDir = path.resolve(config.root);
      qwikPlugin = config.plugins.find((p) => p.name === 'vite-plugin-qwik') as QwikVitePlugin;
      qwikCityPlugin = config.plugins.find(
        (p) => p.name === 'vite-plugin-qwik-city'
      ) as QwikCityPlugin;
      if (!qwikPlugin) {
        throw new Error('Missing vite-plugin-qwik');
      }
      publicDir = config.publicDir;
      outDir = config.build?.outDir;
    },
    generateBundle(_, _bundle) {
      bundle = _bundle
    },
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        if (!publicDir) {
          // skip in SSG when publicDir is ""
          return
        }
        const clientOutDir = qwikPlugin!.api.getClientOutDir()!;
        const basePathRelDir = qwikCityPlugin!.api.getBasePathname().replace(/^\/|\/$/, '');
        const clientOutBaseDir = path.join(clientOutDir, basePathRelDir);

        const publicDirAssets = await fg.glob('**/*' , {cwd: publicDir!})
        // the q-*.js files are going to be handled by qwik itself
        const emittedAssets = Object.keys(bundle).filter((key) => !/.*q-.*\.js$/.test(key))
        
        const routes = qwikCityPlugin!.api.getRoutes().map((route) => route.pathname)
        const swClientDistPath = path.join(clientOutBaseDir, 'service-worker.js');
        const swCode = await fs.readFile(swClientDistPath, 'utf-8');
        const swCodeUpdate = `
        const publicDirAssets = ${JSON.stringify(publicDirAssets)};
        const emittedAssets = ${JSON.stringify(emittedAssets)};
        const routes = ${JSON.stringify(routes)};
        
        ${swCode}
        `
        await fs.writeFile(swClientDistPath, swCodeUpdate);
      }
    }
  }, {
    name: 'qwik-pwa-ssr',
    enforce: 'post',
    apply(config, env) {
      if (env.ssrBuild) {
        return true
      }
      return false
    },
    configResolved(config) {
      qwikPlugin = config.plugins.find((p) => p.name === 'vite-plugin-qwik') as QwikVitePlugin;
      qwikCityPlugin = config.plugins.find(
        (p) => p.name === 'vite-plugin-qwik-city'
      ) as QwikCityPlugin;
    },
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {

        const clientOutDir = qwikPlugin!.api.getClientOutDir()!;
        const basePathRelDir = qwikCityPlugin!.api.getBasePathname().replace(/^\/|\/$/, '');
        const clientOutBaseDir = path.join(clientOutDir, basePathRelDir);
        const swClientDistPath = path.join(clientOutBaseDir, 'service-worker.js');
        const swCode = await fs.readFile(swClientDistPath, 'utf-8');
        const manifest = qwikPlugin!.api.getManifest()
        const swCodeUpdate = `
        const manifestHash = ${JSON.stringify(manifest?.manifestHash)};
        
        ${swCode}
        `
        await fs.writeFile(swClientDistPath, swCodeUpdate);
      }

    }

  }
]

}