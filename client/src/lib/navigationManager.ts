
import { QueryClient } from '@tanstack/react-query';

export class NavigationManager {
  private static instance: NavigationManager;
  private queryClient: QueryClient | null = null;
  private navigationHistory: string[] = [];

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

  addToHistory(path: string) {
    this.navigationHistory.push(path);
    // Keep only last 10 entries
    if (this.navigationHistory.length > 10) {
      this.navigationHistory.shift();
    }
  }

  getLastPath(): string | null {
    return this.navigationHistory.length > 1 
      ? this.navigationHistory[this.navigationHistory.length - 2] 
      : null;
  }

  async safeNavigateBack(fallbackPath: string = '/dashboard') {
    // Clear any stale queries before navigation
    if (this.queryClient) {
      await this.queryClient.invalidateQueries();
    }

    const lastPath = this.getLastPath();
    
    if (lastPath && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = fallbackPath;
    }
  }

  clearHistory() {
    this.navigationHistory = [];
  }
}

export const navigationManager = NavigationManager.getInstance();
