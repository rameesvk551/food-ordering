import environments from './environments.json';

// ─── Types ───────────────────────────────────────────────────
export type EnvironmentKey = 'local' | 'development' | 'staging' | 'production';

export interface AppConfig {
  url: string;
  name: string;
  description: string;
  icon: string;
  requiredRoles: string[];
}

export interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  socketUrl: string;
  ssoDomain: string;
  apps: Record<string, AppConfig>;
}

type Environments = Record<string, EnvironmentConfig>;

// ─── Env-var overrides (optional, set via .env or CI) ────────
interface EnvOverrides {
  apiUrl?: string;
  socketUrl?: string;
  ssoDomain?: string;
  appUrl?: string;
}

/**
 * Configuration Manager for Food Ordering
 *
 * Priority: Environment Variables > environments.json
 */
class Config {
  private environments: Environments;
  private currentEnvironment: EnvironmentKey;
  private envOverrides: EnvOverrides | null;

  constructor() {
    this.environments = environments as Environments;
    this.envOverrides = this.loadEnvOverrides();
    this.currentEnvironment = this.detectEnvironment();

    const usingEnvVars = this.envOverrides ? 'YES' : 'NO';
    console.log(
      `[Config] loaded: ${this.currentEnvironment} (hostname: ${window.location.hostname}, env-var overrides: ${usingEnvVars})`,
    );
  }

  // ── Private helpers ───────────────────────────────────────

  /** Read VITE_* env vars; return null when none are set */
  private loadEnvOverrides(): EnvOverrides | null {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const socketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
    const ssoDomain = import.meta.env.VITE_SSO_DOMAIN as string | undefined;
    const appUrl = import.meta.env.VITE_APP_URL as string | undefined;

    if (!apiUrl && !socketUrl && !ssoDomain && !appUrl) return null;

    return { apiUrl, socketUrl, ssoDomain, appUrl };
  }

  /** Auto-detect environment from hostname + localStorage */
  private detectEnvironment(): EnvironmentKey {
    const hostname = window.location.hostname;
    const storedEnv = localStorage.getItem('app_environment') as EnvironmentKey | null;

    let detected: EnvironmentKey = 'local';

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
      detected = 'local';
    } else if (hostname.includes('.dev.') || hostname.includes('dev-')) {
      detected = 'development';
    } else if (hostname.includes('.staging.') || hostname.includes('staging-') || hostname.includes('staging.')) {
      detected = 'staging';
    } else if (hostname.includes('.wayon.in') || hostname === 'wayon.in') {
      detected = 'production';
    } else {
      detected = 'production'; // default fallback for unknown domains
    }

    // Production / staging — always trust detection, ignore localStorage
    if (detected === 'production' || detected === 'staging') {
      localStorage.setItem('app_environment', detected);
      return detected;
    }

    // Local / dev — allow localStorage override
    if (storedEnv && this.environments[storedEnv]) {
      return storedEnv;
    }

    localStorage.setItem('app_environment', detected);
    return detected;
  }

  // ── Public API ────────────────────────────────────────────

  getEnvironment(): EnvironmentKey {
    return this.currentEnvironment;
  }

  getEnvironmentName(): string {
    return this.environments[this.currentEnvironment]?.name ?? this.currentEnvironment;
  }

  setEnvironment(env: EnvironmentKey): void {
    if (!this.environments[env]) {
      throw new Error(`Invalid environment: ${env}`);
    }
    this.currentEnvironment = env;
    localStorage.setItem('app_environment', env);
    console.log(`[Config] environment switched to: ${env}`);
    window.location.reload();
  }

  getAvailableEnvironments(): Array<{ key: string; name: string }> {
    return Object.keys(this.environments).map((key) => ({
      key,
      name: this.environments[key].name,
    }));
  }

  getCurrentConfig(): EnvironmentConfig {
    return this.environments[this.currentEnvironment];
  }

  // ── Resolved getters (env-var overrides take precedence) ──

  /** Full API base URL including /api/v1 */
  get apiUrl(): string {
    return this.envOverrides?.apiUrl || this.getCurrentConfig().apiUrl;
  }

  /** Socket.io server URL (no /api/v1 suffix) */
  get socketUrl(): string {
    return (
      this.envOverrides?.socketUrl ||
      this.getCurrentConfig().socketUrl
    );
  }

  /** SSO cookie domain */
  get ssoDomain(): string {
    return this.envOverrides?.ssoDomain || this.getCurrentConfig().ssoDomain;
  }

  // ── App helpers ───────────────────────────────────────────

  getApps(): Record<string, AppConfig> {
    const apps = { ...this.getCurrentConfig().apps };

    // Override the primary app URL if VITE_APP_URL is set
    if (this.envOverrides?.appUrl && apps['food-ordering']) {
      apps['food-ordering'] = { ...apps['food-ordering'], url: this.envOverrides.appUrl };
    }

    return apps;
  }

  getApp(appId: string): AppConfig | undefined {
    return this.getApps()[appId];
  }

  getAvailableApps(userRoles: string[] = []): Array<AppConfig & { id: string }> {
    const apps = this.getApps();

    return Object.entries(apps)
      .map(([id, app]) => ({ id, ...app }))
      .filter((app) => {
        if (!app.requiredRoles || app.requiredRoles.length === 0) return true;
        return app.requiredRoles.some((role) => userRoles.includes(role));
      });
  }
}

const config = new Config();
export default config;
