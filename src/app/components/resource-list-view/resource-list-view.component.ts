import { ListFiltersComponent } from './list-filters/list-filters.component';
import { ResourceTableComponent } from './resource-table/resource-table.component';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { ToolbarComponent } from '@fundamental-ngx/core/toolbar';
import {
  DynamicPageComponent,
  DynamicPageTitleComponent,
  DynamicPageGlobalActionsComponent,
  DynamicPageContentComponent,
} from '@fundamental-ngx/platform/dynamic-page';
import { Store } from '@ngrx/store';
import { ContextService } from 'services/context/context.service';
import { LuigiClientService } from 'services/luigi/luigi-client.service';
import { selectResourceDefinition, selectNamespaceId, selectUiTitle } from 'state/context/context.selectors';
import { humanizeFieldName } from 'utils/humanize';
import {
  selectResources,
  selectResourcesLoading,
} from 'state/resources/resources.selectors';
import { loadResources } from 'state/resources/resources.actions';
import { selectFieldAnalysis, selectSchemaLoading } from 'state/schema/schema.selectors';
import { selectSearchTerm } from 'state/ui/ui.selectors';

@Component({
  selector: 'app-resource-list-view',
  imports: [
    ListFiltersComponent,
    ResourceTableComponent,
    BusyIndicatorComponent,
    ButtonComponent,
    ToolbarComponent,
    DynamicPageComponent,
    DynamicPageTitleComponent,
    DynamicPageGlobalActionsComponent,
    DynamicPageContentComponent,
  ],
  template: `
    <fd-busy-indicator [loading]="loading()" size="m" [block]="true">
      <fdp-dynamic-page ariaLabel="Resources" size="large" [autoResponsive]="false">
        <fdp-dynamic-page-title [title]="title()">
          <fdp-dynamic-page-global-actions>
            <!-- eslint-disable @angular-eslint/template/elements-content -->
            <fd-toolbar fdType="transparent" [clearBorder]="true">
              <button
                fd-button
                fdType="emphasized"
                glyphPosition="before"
                glyph="add"
                label="Create"
                (click)="onCreate()"
                test-id="generic-list-view-create-button"
              ></button>
            </fd-toolbar>
            <!-- eslint-enable @angular-eslint/template/elements-content -->
          </fdp-dynamic-page-global-actions>
        </fdp-dynamic-page-title>

        <fdp-dynamic-page-content>
          <app-list-filters></app-list-filters>
          <app-resource-table
            [resources]="filteredResources()"
            [fieldAnalysis]="fieldAnalysis()"
            [searchTerm]="searchTerm()"
            [showNamespaceColumn]="showNamespaceColumn()"
          ></app-resource-table>
        </fdp-dynamic-page-content>
      </fdp-dynamic-page>
    </fd-busy-indicator>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceListViewComponent implements OnInit {
  private store = inject(Store);
  private contextService = inject(ContextService);
  private luigiClient = inject(LuigiClientService);

  protected readonly resourceDefinition = toSignal(
    this.store.select(selectResourceDefinition)
  );
  private readonly namespaceId = toSignal(
    this.store.select(selectNamespaceId)
  );
  protected readonly resources = toSignal(this.store.select(selectResources), {
    initialValue: [],
  });
  protected readonly fieldAnalysis = toSignal(
    this.store.select(selectFieldAnalysis)
  );
  protected readonly searchTerm = toSignal(this.store.select(selectSearchTerm), {
    initialValue: '',
  });
  protected readonly resourcesLoading = toSignal(
    this.store.select(selectResourcesLoading),
    { initialValue: false }
  );
  protected readonly schemaLoading = toSignal(
    this.store.select(selectSchemaLoading),
    { initialValue: false }
  );

  protected readonly uiTitle = toSignal(this.store.select(selectUiTitle));

  // Show namespace column for namespaced resources when no specific namespace is set
  protected readonly showNamespaceColumn = computed(() => {
    const def = this.resourceDefinition();
    const nsId = this.namespaceId();
    return def?.scope === 'Namespaced' && !nsId;
  });

  protected readonly loading = () =>
    this.resourcesLoading() || this.schemaLoading();

  protected readonly title = computed(() => {
    // Prefer UI config title if set
    const configTitle = this.uiTitle();
    if (configTitle) {
      return configTitle;
    }
    // Fallback to humanized kind name (plural)
    const def = this.resourceDefinition();
    if (def) {
      return humanizeFieldName(def.kind) + 's';
    }
    return 'Resources';
  });

  protected readonly filteredResources = () => {
    const resources = this.resources();
    const search = this.searchTerm().toLowerCase();

    if (!search) {
      return resources;
    }

    return resources.filter((resource) =>
      resource.metadata.name.toLowerCase().includes(search)
    );
  };

  ngOnInit(): void {
    this.contextService.initialize();
  }

  onCreate(): void {
    const resourceDef = this.resourceDefinition();
    const title = resourceDef
      ? `Create ${resourceDef.kind}`
      : 'Create Resource';

    // Navigate to create using relative path from closest context
    this.luigiClient
      .linkManager()
      .fromClosestContext()
      .openAsModal('create', {
        title,
        size: 'm',
      })
      .then((result: unknown) => {
        const modalResult = result as { created?: string; cancelled?: boolean } | undefined;
        if (modalResult?.created) {
          // Reload resources after successful creation
          this.store.dispatch(loadResources());
        }
      })
      .catch(() => {
        // Modal was closed without action
      });
  }
}
