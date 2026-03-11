import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import LuigiClient from '@luigi-project/client';
import { setNamespace } from 'state/context/context.actions';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);
  private store = inject(Store);

  navigateToResource(resourceName: string, namespace?: string): void {
    if (namespace) {
      this.store.dispatch(setNamespace({ namespaceId: namespace }));
    }

    if (this.isInLuigiContext()) {
      // Navigate via Luigi for proper browser history and parent URL sync.
      // For namespaced resources, encode as ns/name in the path (e.g., default/my-resource).
      // For cluster-scoped resources, just the name (e.g., my-resource).
      const path = namespace ? `${namespace}/${resourceName}` : resourceName;
      LuigiClient.linkManager().navigate(path);
    } else {
      if (namespace) {
        this.router.navigate(['/', namespace, resourceName]);
      } else {
        this.router.navigate(['/', resourceName]);
      }
    }
  }

  navigateBack(): void {
    if (this.isInLuigiContext()) {
      LuigiClient.linkManager().goBack(undefined);
    } else {
      this.router.navigate(['/']);
    }
  }

  private isInLuigiContext(): boolean {
    try {
      const isInIframe = window.self !== window.top;
      if (!isInIframe) {
        return false;
      }
      const context = LuigiClient.getContext();
      return !!context;
    } catch {
      return false;
    }
  }
}
