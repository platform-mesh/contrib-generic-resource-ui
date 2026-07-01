import { environment } from '../../../environments/environment';
import { ConfigService } from '../config/config.service';
import { Injectable, inject } from '@angular/core';
import {
  ILuigiContextTypes,
  LuigiContextServiceImpl,
} from '@luigi-project/client-support-angular';
import { Store } from '@ngrx/store';
import deepmerge from 'deepmerge';
import { NodeContext, ResourceNodeContext } from 'models/index';
import { Observable, map, timer, take } from 'rxjs';
import { contextInitialized, contextUpdated } from 'state/context/context.actions';

@Injectable({
  providedIn: 'root',
})
export class ContextService {
  private luigiContextService = inject(LuigiContextServiceImpl);
  private configService = inject(ConfigService);
  private store = inject(Store);
  private initialized = false;

  initialize(): void {
    console.log('[ContextService] Initializing...');

    this.luigiContextService.contextObservable().subscribe((contextMessage) => {
      console.log('[ContextService] Received Luigi context message:', contextMessage.contextType, contextMessage.context);

      if (
        contextMessage.contextType === ILuigiContextTypes.INIT ||
        contextMessage.contextType === ILuigiContextTypes.UPDATE
      ) {
        this.initialized = true;
        const context = this.mergeWithEnvironmentOverwrite(
          contextMessage.context as NodeContext
        );
        console.log('[ContextService] Merged context:', context);

        const resourceContext = this.toResourceNodeContext(context);
        console.log('[ContextService] Resource context:', resourceContext);

        if (contextMessage.contextType === ILuigiContextTypes.INIT) {
          console.log('[ContextService] Dispatching contextInitialized');
          this.store.dispatch(contextInitialized({ context: resourceContext }));
        } else {
          console.log('[ContextService] Dispatching contextUpdated');
          this.store.dispatch(
            contextUpdated({ context: resourceContext })
          );
        }
      }
    });

    timer(500)
      .pipe(take(1))
      .subscribe(() => {
        console.log('[ContextService] Timer fired, initialized:', this.initialized);
        if (!this.initialized) {
          console.log('[ContextService] No Luigi context received, falling back to config');
          this.initializeFromConfig();
        }
      });
  }

  initializeFromConfig(): void {
    console.log('[ContextService] Loading from config...');
    this.configService.loadConfig().subscribe({
      next: (config) => {
        console.log('[ContextService] Config loaded:', config);
        const resourceContext = this.configService.toResourceNodeContext(config);

        // Check for namespace in URL query params
        const urlNamespace = this.getNamespaceFromUrl();
        if (urlNamespace) {
          resourceContext.namespaceId = urlNamespace;
          console.log('[ContextService] Using namespace from URL:', urlNamespace);
        }

        console.log('[ContextService] Config resource context:', resourceContext);
        this.store.dispatch(contextInitialized({ context: resourceContext }));
        this.initialized = true;
      },
      error: (err) => {
        console.error('[ContextService] Failed to load config:', err);
      },
    });
  }

  getContextAsync(): Promise<NodeContext> {
    return this.luigiContextService.getContextAsync().then((context) =>
      this.mergeWithEnvironmentOverwrite(context as NodeContext)
    );
  }

  getContext(): NodeContext {
    return this.mergeWithEnvironmentOverwrite(
      this.luigiContextService.getContext() as NodeContext
    );
  }

  contextObservable(): Observable<NodeContext> {
    return this.luigiContextService.contextObservable().pipe(
      map((contextMessage) =>
        this.mergeWithEnvironmentOverwrite(contextMessage.context as NodeContext)
      )
    );
  }

  private mergeWithEnvironmentOverwrite(context: NodeContext): NodeContext {
    if (!environment.luigiContextOverwrite) {
      return context;
    }

    return deepmerge(context, environment.luigiContextOverwrite) as NodeContext;
  }

  private toResourceNodeContext(context: NodeContext): ResourceNodeContext {
    // Fix stale portalContext.crdGatewayApiUrl by deriving it from kcpPath
    const portalContext = this.fixGatewayUrl(context);

    // Get namespace from various sources (priority order):
    // 1. Luigi nodeParams (from withParams navigation)
    // 2. Context namespaceId (from content config)
    // 3. URL query params (fallback)
    const nodeParams = context['nodeParams'] as Record<string, string> | undefined;
    const namespaceId = nodeParams?.['namespace'] || context.namespaceId || this.getNamespaceFromUrl();

    if (nodeParams?.['namespace']) {
      console.log('[ContextService] Using namespace from nodeParams:', nodeParams['namespace']);
    }

    return {
      token: context.token,
      resourceDefinition: context.resourceDefinition!,
      portalContext,
      namespaceId: namespaceId || undefined,
      accountId: context.accountId,
      resourceId: context['resourceId'] || context['core_platform-mesh_io_accountId'],
      entityType: context.entityType,
      entityName: context.entityName,
    };
  }

  private getNamespaceFromUrl(): string | null {
    // Check hash-based query params (e.g., /#/?namespace=default)
    const hash = window.location.hash;
    const hashQueryIndex = hash.indexOf('?');
    if (hashQueryIndex !== -1) {
      const hashParams = new URLSearchParams(hash.substring(hashQueryIndex + 1));
      const ns = hashParams.get('namespace');
      if (ns) {
        return ns;
      }
    }

    // Check regular query params (e.g., ?namespace=default)
    const params = new URLSearchParams(window.location.search);
    return params.get('namespace');
  }

  private fixGatewayUrl(context: NodeContext): NodeContext['portalContext'] {
    const portalContext = context.portalContext;
    const kcpPath = context['kcpPath'] as string | undefined;

    if (!portalContext?.crdGatewayApiUrl || !kcpPath) {
      return portalContext;
    }

    // Extract the base URL pattern and rebuild with current kcpPath. Two
    // path shapes are supported:
    //   /api/kubernetes-graphql-gateway/{kcpPath}/graphql
    //   /gateway/api/clusters/{kcpPath}/graphql
    const urlMatch = portalContext.crdGatewayApiUrl.match(
      /^(https?:\/\/[^/]+\/(?:api\/kubernetes-graphql-gateway|gateway\/api\/clusters)\/)([^/]+)(\/graphql)$/
    );

    if (!urlMatch) {
      return portalContext;
    }

    const [, baseUrl, , suffix] = urlMatch;
    const correctedUrl = `${baseUrl}${kcpPath}${suffix}`;

    if (correctedUrl !== portalContext.crdGatewayApiUrl) {
      console.log('[ContextService] Fixed stale gateway URL:', portalContext.crdGatewayApiUrl, '->', correctedUrl);
    }

    return {
      ...portalContext,
      crdGatewayApiUrl: correctedUrl,
    };
  }
}
