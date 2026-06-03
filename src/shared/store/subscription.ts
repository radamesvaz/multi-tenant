import { defineStore } from 'pinia';
import { fetchSubscriptionContext, SubscriptionCanceledError } from '../../core/auth/subscriptionApi';
import type { SubscriptionContext } from '../../core/models';

/** Occasional refresh when returning to the tab (not aggressive polling). */
export const SUBSCRIPTION_REFRESH_MS = 4 * 60 * 60 * 1000;

type SubscriptionState = {
  tenantId: number | null;
  tenantSlug: string | null;
  subscription: SubscriptionContext | null;
  isLoaded: boolean;
  isCanceled: boolean;
  isHydrating: boolean;
  lastRefreshedAt: number | null;
};

let hydrateInFlight: Promise<void> | null = null;

export const useSubscriptionStore = defineStore('subscription', {
  state: (): SubscriptionState => ({
    tenantId: null,
    tenantSlug: null,
    subscription: null,
    isLoaded: false,
    isCanceled: false,
    isHydrating: false,
    lastRefreshedAt: null,
  }),
  actions: {
    markCanceled() {
      this.isCanceled = true;
      this.subscription = null;
      this.isLoaded = false;
    },
    clearSubscription() {
      this.tenantId = null;
      this.tenantSlug = null;
      this.subscription = null;
      this.isLoaded = false;
      this.isCanceled = false;
      this.lastRefreshedAt = null;
    },
    async hydrateFromToken(token: string, options?: { reload?: boolean }): Promise<void> {
      if (this.isCanceled && !options?.reload) {
        return;
      }
      if (this.isLoaded && !options?.reload) {
        return;
      }
      if (hydrateInFlight) {
        return hydrateInFlight;
      }

      hydrateInFlight = this.fetchAndApply(token).finally(() => {
        hydrateInFlight = null;
      });
      return hydrateInFlight;
    },
    async refreshFromToken(token: string): Promise<void> {
      if (this.isCanceled) {
        return;
      }
      const stale =
        this.lastRefreshedAt == null ||
        Date.now() - this.lastRefreshedAt >= SUBSCRIPTION_REFRESH_MS;
      if (!stale) {
        return;
      }
      await this.hydrateFromToken(token, { reload: true });
    },
    async fetchAndApply(token: string): Promise<void> {
      this.isHydrating = true;
      try {
        const data = await fetchSubscriptionContext(token);
        this.tenantId = data.tenant_id;
        this.tenantSlug = data.tenant_slug;
        this.subscription = data.subscription;
        this.isLoaded = true;
        this.isCanceled = false;
        this.lastRefreshedAt = Date.now();
      } catch (err) {
        if (err instanceof SubscriptionCanceledError) {
          this.markCanceled();
        }
        throw err;
      } finally {
        this.isHydrating = false;
      }
    },
  },
});
