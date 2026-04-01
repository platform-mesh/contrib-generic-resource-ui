import { Injectable } from '@angular/core';
import * as LuigiClient from '@luigi-project/client';

/**
 * Service wrapper for Luigi Client to enable easier testing and dependency injection.
 */
@Injectable({
  providedIn: 'root',
})
export class LuigiClientService {
  /**
   * Get the Luigi linkManager for navigation
   */
  linkManager() {
    return LuigiClient.linkManager();
  }

  /**
   * Get the Luigi uxManager for UI interactions
   */
  uxManager() {
    return LuigiClient.uxManager();
  }

  /**
   * Get the current context from Luigi
   */
  getContext() {
    return LuigiClient.getContext();
  }

  /**
   * Add a context update listener
   */
  addContextUpdateListener(callback: (context: unknown) => void) {
    return LuigiClient.addContextUpdateListener(callback);
  }
}
