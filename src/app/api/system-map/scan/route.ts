import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic execution for real-time live scanning
export const dynamic = 'force-dynamic';

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.vscode',
  '.firebase',
  'daily_reports',
  'scratch',
  '.gemini'
]);

interface ScannedFunction {
  name: string;
  signature: string;
  description: string;
  isAsync: boolean;
}

interface ScannedFile {
  path: string;
  relPath: string;
  name: string;
  ext: string;
  size: number;
  lines: number;
  category: 'app_route' | 'api_route' | 'feature' | 'component' | 'lib' | 'store' | 'agent' | 'script' | 'root_config';
  routePath?: string;
  httpMethods?: string[];
  exports: string[];
  functions: ScannedFunction[];
  components: string[];
  lastModified: string;
}

function getCategory(relPath: string): ScannedFile['category'] {
  const norm = relPath.replace(/\\/g, '/');
  if (norm.startsWith('src/app/api/')) return 'api_route';
  if (norm.startsWith('src/app/')) return 'app_route';
  if (norm.startsWith('src/features/')) return 'feature';
  if (norm.startsWith('src/components/')) return 'component';
  if (norm.startsWith('src/lib/')) return 'lib';
  if (norm.startsWith('src/store/') || norm.startsWith('src/data/')) return 'store';
  if (norm.startsWith('.agents/') || norm.startsWith('agents/')) return 'agent';
  if (norm.startsWith('scripts/')) return 'script';
  return 'root_config';
}

function routeFromFilePath(relPath: string): string | undefined {
  const norm = relPath.replace(/\\/g, '/');
  if (!norm.startsWith('src/app/')) return undefined;
  if (!norm.endsWith('/page.tsx') && !norm.endsWith('/page.jsx') && !norm.endsWith('/route.ts') && !norm.endsWith('/route.js')) {
    if (norm === 'src/app/page.tsx' || norm === 'src/app/page.jsx') return '/';
    return undefined;
  }
  let route = norm
    .replace(/^src\/app/, '')
    .replace(/\/page\.(tsx|jsx|js|ts)$/, '')
    .replace(/\/route\.(tsx|jsx|js|ts)$/, '');
  
  if (route === '') route = '/';
  return route;
}

function parseFile(filePath: string, rootDir: string): ScannedFile | null {
  try {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const name = path.basename(filePath);
    const ext = path.extname(filePath);
    const stat = fs.statSync(filePath);

    // Skip large binary / media files for content parsing
    const isCode = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.py', '.rules', '.css'].includes(ext);
    let content = '';
    if (isCode && stat.size < 1_500_000) {
      content = fs.readFileSync(filePath, 'utf8');
    }

    const lines = content ? content.split('\n').length : 0;
    const category = getCategory(relPath);
    const routePath = routeFromFilePath(relPath);

    const exports: string[] = [];
    const functions: ScannedFunction[] = [];
    const components: string[] = [];
    const httpMethods: string[] = [];

    if (content) {
      // Parse exports
      const expMatches = content.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z0-9_]+)/g);
      for (const m of expMatches) {
        if (!exports.includes(m[1])) exports.push(m[1]);
      }
      if (/export\s+default\s+function\s*\(/.test(content)) {
        exports.push('default');
      }

      // Parse HTTP methods for API routes
      if (category === 'api_route') {
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].forEach(m => {
          if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`).test(content) || new RegExp(`export\\s+const\\s+${m}\\b`).test(content)) {
            httpMethods.push(m);
          }
        });
      }

      // Parse named function declarations with signatures
      const fnMatches = content.matchAll(/(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g);
      for (const m of fnMatches) {
        const fnName = m[1];
        const params = m[2]?.trim() || '';
        const isAsync = m[0].startsWith('async');
        
        // Detect React Component
        if (/^[A-Z]/.test(fnName) && (ext === '.tsx' || ext === '.jsx')) {
          if (!components.includes(fnName)) components.push(fnName);
        }

        if (!functions.some(f => f.name === fnName)) {
          functions.push({
            name: fnName,
            signature: `(${params.replace(/\s+/g, ' ')})`,
            description: `פונקציה ${isAsync ? 'אסינכרונית ' : ''}בקובץ ${name}`,
            isAsync
          });
        }
      }

      // Parse const arrow functions
      const arrowMatches = content.matchAll(/(?:export\s+)?(?:const|let)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*[^=>]+)?\s*=>/g);
      for (const m of arrowMatches) {
        const fnName = m[1];
        const params = m[2]?.trim() || '';
        const isAsync = m[0].includes('async');

        if (/^[A-Z]/.test(fnName) && (ext === '.tsx' || ext === '.jsx')) {
          if (!components.includes(fnName)) components.push(fnName);
        }

        if (!functions.some(f => f.name === fnName)) {
          functions.push({
            name: fnName,
            signature: `(${params.replace(/\s+/g, ' ')})`,
            description: `פונקציית חץ ${isAsync ? 'אסינכרונית ' : ''}בקובץ ${name}`,
            isAsync
          });
        }
      }
    }

    return {
      path: filePath,
      relPath,
      name,
      ext,
      size: stat.size,
      lines,
      category,
      routePath,
      httpMethods: httpMethods.length > 0 ? httpMethods : undefined,
      exports,
      functions,
      components,
      lastModified: stat.mtime.toISOString()
    };
  } catch (err) {
    return null;
  }
}

function scanDirectory(dir: string, rootDir: string): ScannedFile[] {
  let results: ScannedFile[] = [];
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (EXCLUDE_DIRS.has(item)) continue;
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(scanDirectory(fullPath, rootDir));
      } else {
        const fileObj = parseFile(fullPath, rootDir);
        if (fileObj) results.push(fileObj);
      }
    }
  } catch (e) {}
  return results;
}

export async function GET() {
  const rootDir = process.cwd();
  const startTime = Date.now();

  const allFiles = scanDirectory(rootDir, rootDir);
  const scanDurationMs = Date.now() - startTime;

  // Categorize for fast frontend consumption
  const appRoutes = allFiles.filter(f => f.category === 'app_route' && f.routePath);
  const apiRoutes = allFiles.filter(f => f.category === 'api_route');
  const features = allFiles.filter(f => f.category === 'feature');
  const components = allFiles.filter(f => f.category === 'component');
  const libs = allFiles.filter(f => f.category === 'lib');
  const stores = allFiles.filter(f => f.category === 'store');
  const agents = allFiles.filter(f => f.category === 'agent');
  const scripts = allFiles.filter(f => f.category === 'script');

  const totalLines = allFiles.reduce((acc, f) => acc + f.lines, 0);
  const totalFunctions = allFiles.reduce((acc, f) => acc + f.functions.length, 0);

  return NextResponse.json({
    success: true,
    scannedAt: new Date().toISOString(),
    scanDurationMs,
    metrics: {
      totalFiles: allFiles.length,
      totalLines,
      totalAppRoutes: appRoutes.length,
      totalApiRoutes: apiRoutes.length,
      totalFeatures: features.length,
      totalComponents: components.length,
      totalLibs: libs.length,
      totalFunctions
    },
    data: {
      allFiles,
      appRoutes,
      apiRoutes,
      features,
      components,
      libs,
      stores,
      agents,
      scripts
    }
  });
}
