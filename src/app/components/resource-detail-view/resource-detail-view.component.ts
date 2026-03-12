import { SpecSectionComponent } from './spec-section/spec-section.component';
import { StatusSectionComponent } from './status-section/status-section.component';
import { DataSectionComponent } from './data-section/data-section.component';
import { YamlPanelComponent } from './yaml-panel/yaml-panel.component';
import { ReadyStatusBadgeComponent } from 'components/shared/ready-status-badge/ready-status-badge.component';
import { ValueCellComponent } from 'components/shared/value-cell/value-cell.component';
import { LabelsDisplayComponent } from 'components/shared/labels-display/labels-display.component';
import { CopyButtonComponent } from 'components/shared/copy-button/copy-button.component';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import {
  FacetComponent,
  FacetGroupComponent,
} from '@fundamental-ngx/core/facets';
import { FormLabelComponent } from '@fundamental-ngx/core/form';
import { ObjectStatusComponent } from '@fundamental-ngx/core/object-status';
import { ToolbarComponent } from '@fundamental-ngx/core/toolbar';
import {
  DynamicPageComponent,
  DynamicPageTitleComponent,
  DynamicPageGlobalActionsComponent,
  DynamicPageHeaderComponent,
  DynamicPageContentComponent,
} from '@fundamental-ngx/platform/dynamic-page';
import { Store } from '@ngrx/store';
import { combineLatest, distinctUntilChanged, filter, map, switchMap, take } from 'rxjs';
import { ContextService } from 'services/context/context.service';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { selectIsContextInitialized, selectNamespaceId, selectResourceDefinition, selectResourceId } from 'state/context/context.selectors';
import { setNamespace } from 'state/context/context.actions';
import { loadResourceDetail } from 'state/resources/resources.actions';
import {
  selectDetailLoading,
  selectSelectedResource,
} from 'state/resources/resources.selectors';
import { selectFieldAnalysis } from 'state/schema/schema.selectors';
import { openDeleteConfirmation, openEditModal, toggleYamlPanel } from 'state/ui/ui.actions';
import { selectYamlPanelOpen } from 'state/ui/ui.selectors';

@Component({
  selector: 'app-resource-detail-view',
  imports: [
    SpecSectionComponent,
    StatusSectionComponent,
    DataSectionComponent,
    YamlPanelComponent,
    BusyIndicatorComponent,
    ButtonComponent,
    ToolbarComponent,
    FacetComponent,
    FacetGroupComponent,
    FormLabelComponent,
    ObjectStatusComponent,
    DynamicPageComponent,
    DynamicPageTitleComponent,
    DynamicPageGlobalActionsComponent,
    DynamicPageHeaderComponent,
    DynamicPageContentComponent,
    ReadyStatusBadgeComponent,
    ValueCellComponent,
    LabelsDisplayComponent,
    CopyButtonComponent,
  ],
  template: `
    <fd-busy-indicator [loading]="loading()" size="m" [block]="true">
      @if (resource()) {
        <fdp-dynamic-page ariaLabel="Resource Detail" size="large" [autoResponsive]="false">
          <fdp-dynamic-page-title
            [title]="resource()!.metadata.name"
            [subtitle]="subtitle()"
          >
            <fdp-dynamic-page-global-actions>
              <!-- eslint-disable @angular-eslint/template/elements-content -->
              <fd-toolbar fdType="transparent" [clearBorder]="true">
                <button
                  fd-button
                  fdType="transparent"
                  glyph="syntax"
                  label="YAML"
                  (click)="onToggleYaml()"
                ></button>
                <button
                  fd-button
                  glyph="edit"
                  label="Edit"
                  (click)="onEdit()"
                ></button>
                <button
                  fd-button
                  fdType="negative"
                  glyph="delete"
                  label="Delete"
                  (click)="onDelete()"
                ></button>
              </fd-toolbar>
              <!-- eslint-enable @angular-eslint/template/elements-content -->
            </fdp-dynamic-page-global-actions>
          </fdp-dynamic-page-title>

          <!-- eslint-disable @angular-eslint/template/label-has-associated-control -->
          <fdp-dynamic-page-header [collapsible]="true" [pinnable]="true">
            <fd-facet-group ariaLabel="Resource Metadata">
              @if (hasStatus()) {
                <fd-facet type="key-value">
                  <label fd-form-label [colon]="true">Status</label>
                  <app-ready-status-badge
                    [status]="readyStatus()"
                    [showMessage]="true"
                  ></app-ready-status-badge>
                </fd-facet>
              }

              @if (resource()!.metadata.namespace) {
                <fd-facet type="key-value">
                  <label fd-form-label [colon]="true">Namespace</label>
                  <span fd-object-status [label]="resource()!.metadata.namespace"></span>
                </fd-facet>
              }

              <fd-facet type="key-value">
                <label fd-form-label [colon]="true">Created</label>
                <span>
                  <app-value-cell
                    [value]="resource()!.metadata.creationTimestamp"
                    type="date"
                  ></app-value-cell>
                </span>
              </fd-facet>

              @if (hasLabels()) {
                <fd-facet type="custom" class="labels-facet">
                  <div class="facet-labels-section">
                    <label fd-form-label [colon]="true">Labels</label>
                    <app-labels-display
                      [labels]="resource()!.metadata.labels"
                      [maxLabels]="5"
                    ></app-labels-display>
                  </div>
                </fd-facet>
              }

              <fd-facet type="custom" class="more-link-facet">
                <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
                <span
                  class="show-more-link"
                  (click)="toggleExtendedMetadata()"
                >
                  {{ showExtendedMetadata() ? 'Show less' : 'More...' }}
                </span>
              </fd-facet>
            </fd-facet-group>

            @if (showExtendedMetadata()) {
              <fd-facet-group ariaLabel="Extended Metadata" class="extended-metadata">
                <fd-facet type="key-value">
                  <label fd-form-label [colon]="true">Resource Version</label>
                  <span fd-object-status [label]="resource()!.metadata.resourceVersion"></span>
                </fd-facet>

                @if (resource()!.metadata.generation) {
                  <fd-facet type="key-value">
                    <label fd-form-label [colon]="true">Generation</label>
                    <span fd-object-status [label]="resource()!.metadata.generation?.toString() ?? ''"></span>
                  </fd-facet>
                }

                <fd-facet type="key-value" class="uid-facet">
                  <label fd-form-label [colon]="true">UID</label>
                  <span class="uid-container">
                    <span class="uid-text">
                      {{ resource()!.metadata.uid }}
                    </span>
                    <app-copy-button [value]="resource()!.metadata.uid ?? ''" label="UID"></app-copy-button>
                  </span>
                </fd-facet>

                @if (hasAnnotations()) {
                  <fd-facet type="custom" class="labels-facet">
                    <div class="facet-labels-section">
                      <label fd-form-label [colon]="true">Annotations</label>
                      <app-labels-display
                        [labels]="resource()!.metadata.annotations"
                        [maxLabels]="10"
                        [hideAnnotations]="true"
                      ></app-labels-display>
                    </div>
                  </fd-facet>
                }

                @if (hasFinalizers()) {
                  <fd-facet type="custom" class="labels-facet">
                    <div class="facet-labels-section">
                      <label fd-form-label [colon]="true">Finalizers</label>
                      <div class="finalizers-list">
                        @for (finalizer of resource()!.metadata.finalizers; track finalizer) {
                          <span class="finalizer-tag">{{ finalizer }}</span>
                        }
                      </div>
                    </div>
                  </fd-facet>
                }

                @if (hasOwnerReferences()) {
                  <fd-facet type="custom" class="labels-facet">
                    <div class="facet-labels-section">
                      <label fd-form-label [colon]="true">Owner References</label>
                      <div class="owner-refs-list">
                        @for (owner of resource()!.metadata.ownerReferences; track owner.uid) {
                          <span class="owner-ref-tag" [title]="owner.uid">
                            {{ owner.kind }}/{{ owner.name }}
                          </span>
                        }
                      </div>
                    </div>
                  </fd-facet>
                }
              </fd-facet-group>
            }
          </fdp-dynamic-page-header>
          <!-- eslint-enable @angular-eslint/template/label-has-associated-control -->

          <fdp-dynamic-page-content>
            <div class="sections-container">
              <app-spec-section
                [resource]="resource()!"
                [fieldAnalysis]="fieldAnalysis()"
              ></app-spec-section>

              <app-data-section
                [resource]="resource()!"
                [resourceDefinition]="resourceDefinition()"
              ></app-data-section>

              <app-status-section
                [resource]="resource()!"
                [fieldAnalysis]="fieldAnalysis()"
              ></app-status-section>
            </div>
          </fdp-dynamic-page-content>
        </fdp-dynamic-page>
      }
    </fd-busy-indicator>

    <div class="yaml-panel" [class.open]="yamlPanelOpen()">
      @if (resource() && yamlPanelOpen()) {
        <app-yaml-panel [resource]="resource()!"></app-yaml-panel>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        position: relative;
      }
      .sections-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .yaml-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 50vw;
        min-width: 500px;
        max-width: 900px;
        height: 100%;
        background: var(--sapBackgroundColor);
        border-left: 1px solid var(--sapGroup_TitleBorderColor);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 1000;
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
      }
      .yaml-panel.open {
        transform: translateX(0);
      }
      .uid-container {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }
      .uid-text {
        font-family: monospace;
        font-size: 0.8125rem;
      }
      .uid-facet {
        max-width: 220px;
      }
      .labels-facet {
        min-width: 200px;
      }
      .facet-labels-section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .more-link-facet {
        display: flex;
        align-items: center;
      }
      .show-more-link {
        color: var(--sapLinkColor);
        cursor: pointer;
        font-size: 0.875rem;
        padding: 0.25rem 0.5rem;
      }
      .show-more-link:hover {
        text-decoration: underline;
      }
      .extended-metadata {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .finalizers-list,
      .owner-refs-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
      }
      .finalizer-tag,
      .owner-ref-tag {
        display: inline-block;
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        background: var(--sapList_Background);
        border: 1px solid var(--sapGroup_TitleBorderColor);
        border-radius: 4px;
        font-family: monospace;
      }
      :host ::ng-deep {
        .fd-facet-group {
          display: flex;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .fd-facet {
          margin-bottom: 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceDetailViewComponent implements OnInit {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private contextService = inject(ContextService);
  private readyStatusDetector = inject(ReadyStatusDetectorService);

  protected readonly resource = toSignal(
    this.store.select(selectSelectedResource)
  );
  protected readonly resourceDefinition = toSignal(
    this.store.select(selectResourceDefinition)
  );
  protected readonly fieldAnalysis = toSignal(
    this.store.select(selectFieldAnalysis)
  );
  protected readonly loading = toSignal(this.store.select(selectDetailLoading), {
    initialValue: false,
  });
  protected readonly yamlPanelOpen = toSignal(
    this.store.select(selectYamlPanelOpen),
    { initialValue: false }
  );

  protected readonly readyStatus = computed(() => {
    const res = this.resource();
    return res ? this.readyStatusDetector.detectReadyStatus(res) : null;
  });

  protected readonly subtitle = computed(() => {
    const def = this.resourceDefinition();
    return def ? `${def.kind} details` : 'Resource details';
  });

  protected readonly hasLabels = computed(() => {
    const res = this.resource();
    return res?.metadata?.labels && Object.keys(res.metadata.labels).length > 0;
  });

  protected readonly hasAnnotations = computed(() => {
    const res = this.resource();
    return res?.metadata?.annotations && Object.keys(res.metadata.annotations).length > 0;
  });

  protected readonly hasFinalizers = computed(() => {
    const res = this.resource();
    return res?.metadata?.finalizers && res.metadata.finalizers.length > 0;
  });

  protected readonly hasOwnerReferences = computed(() => {
    const res = this.resource();
    return res?.metadata?.ownerReferences && res.metadata.ownerReferences.length > 0;
  });

  protected readonly hasStatus = computed(() => {
    const status = this.readyStatus();
    return status && status.status !== 'unknown';
  });

  protected readonly hasExtendedMetadata = computed(() => {
    return this.hasLabels() || this.hasAnnotations() || this.hasFinalizers() || this.hasOwnerReferences();
  });

  protected readonly showExtendedMetadata = signal(false);

  protected toggleExtendedMetadata(): void {
    this.showExtendedMetadata.update((v) => !v);
  }

  ngOnInit(): void {
    this.contextService.initialize();

    // Read namespace from route params (e.g., /:namespace/:name) and set in store
    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const namespace = params.get('namespace');
      if (namespace) {
        this.store.dispatch(setNamespace({ namespaceId: namespace }));
      }
    });

    // React to context/schema readiness AND route changes
    // This ensures we reload the resource when:
    // 1. Initial load when context is ready
    // 2. Route params change
    // 3. Schema reloads (context switch)
    combineLatest([
      this.store.select(selectIsContextInitialized),
      this.store.select(selectFieldAnalysis),
      this.store.select(selectResourceDefinition),
      this.route.paramMap.pipe(map((params) => params.get('name'))),
      this.store.select(selectResourceId),
      this.store.select(selectNamespaceId),
    ])
      .pipe(
        filter(([initialized, fieldAnalysis, resourceDef, , , namespaceId]) => {
          if (!initialized || !fieldAnalysis) {
            return false;
          }
          // For namespaced resources, wait until the namespace is available in the context
          if (resourceDef?.scope === 'Namespaced' && !namespaceId) {
            return false;
          }
          return true;
        }),
        map(([, , resourceDef, routeName, contextResourceId]) => ({
          // Include resource definition key to detect context/schema changes
          contextKey: resourceDef ? `${resourceDef.group}/${resourceDef.kind}` : '',
          name: routeName || contextResourceId,
        })),
        filter((data): data is { contextKey: string; name: string } => !!data.name),
        distinctUntilChanged((prev, curr) => prev.name === curr.name && prev.contextKey === curr.contextKey)
      )
      .subscribe(({ name }) => {
        this.store.dispatch(loadResourceDetail({ resourceName: name }));
      });
  }

  onToggleYaml(): void {
    this.store.dispatch(toggleYamlPanel());
  }

  onEdit(): void {
    const res = this.resource();
    if (res) {
      this.store.dispatch(openEditModal({ resourceName: res.metadata.name }));
    }
  }

  onDelete(): void {
    const res = this.resource();
    if (res) {
      this.store.dispatch(openDeleteConfirmation({
        resourceName: res.metadata.name,
        resourceNamespace: res.metadata.namespace,
      }));
    }
  }

  truncateUid(uid: string | undefined): string {
    if (!uid) {
      return '-';
    }
    if (uid.length > 20) {
      return uid.substring(0, 8) + '...' + uid.substring(uid.length - 8);
    }
    return uid;
  }
}
