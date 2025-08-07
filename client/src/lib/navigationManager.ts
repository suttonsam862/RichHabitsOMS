import { QueryClient } from '@tanstack/react-query';

export class NavigationManager {
  private static instance: NavigationManager;
  private queryClient: QueryClient | null = null;

  private constructor() {}

  static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  setQueryClient(client: QueryClient) {
    this.queryClient = client;
  }

  async safeNavigateBack(fallbackPath: string = '/dashboard') {
    try {
      // Clear any stale queries before navigation
      if (this.queryClient) {
        await this.queryClient.invalidateQueries();
      }

      // Simple back navigation
      if (document.referrer && document.referrer.includes(window.location.hostname)) {
        window.history.back();
      } else {
        window.location.href = fallbackPath;
      }
    } catch (error) {
      console.warn('Navigation manager error:', error);
      window.location.href = fallbackPath;
    }
  }
}

export const navigationManager = NavigationManager.getInstance();