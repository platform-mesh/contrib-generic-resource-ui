import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { BarComponent, BarRightDirective, BarElementDirective } from '@fundamental-ngx/core/bar';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { LuigiClientService } from 'services/luigi/luigi-client.service';
import { GenericResourceService } from 'services/resource/generic-resource.service';
import { selectFieldAnalysis } from 'state/schema/schema.selectors';
import { selectResourceDefinition, selectResourceContext } from 'state/context/context.selectors';
import { YamlTemplateGeneratorService } from 'services/view-generator/yaml-template-generator.service';
import { resourceToYaml, yamlToResource } from 'utils/yaml-utils';
import { ContextService } from 'services/context/context.service';
import { MonacoYamlViewerComponent } from 'components/shared/monaco-yaml-viewer/monaco-yaml-viewer.component';

@Component({
  selector: 'app-create-resource-page',
  standalone: true,
  imports: [
    ButtonComponent,
    BarComponent,
    BarRightDirective,
    BarElementDirective,
    BusyIndicatorComponent,
    MonacoYamlViewerComponent,
  ],
  template: `
    <fd-busy-indicator [loading]="saving()" size="m" [block]="true">
      <div class="modal-container">
        <div class="modal-content">
          <p class="editor-description">{{ description() }}</p>
          <div class="yaml-editor-container">
            <app-monaco-yaml-viewer
              [content]="yamlContent()"
              [readOnly]="false"
              (contentChanged)="onYamlContentChanged($event)"
            />
          </div>

          @if (yamlValidationErrors().length > 0) {
            <div class="form-errors">
              @for (error of yamlValidationErrors(); track error) {
                <div class="form-error">{{ error }}</div>
              }
            </div>
          }
        </div>

        <div fd-bar barDesign="footer" class="modal-footer">
          <div fd-bar-right>
            <div fd-bar-element>
              <button
                fd-button
                fdType="transparent"
                (click)="onCancel()"
              >
                Cancel
              </button>
            </div>
            <div fd-bar-element>
              <button
                fd-button
                fdType="emphasized"
                [disabled]="!canSubmit()"
                (click)="onSubmit()"
                test-id="create-resource-submit"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </fd-busy-indicator>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
      :host ::ng-deep fd-busy-indicator,
      :host ::ng-deep .fd-busy-indicator--container,
      :host ::ng-deep .fd-busy-indicator {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .modal-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .modal-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 1rem;
        overflow-y: auto;
        min-height: 0;
      }
      .modal-footer {
        flex-shrink: 0;
      }
      .editor-description {
        color: var(--sapContent_LabelColor, #6a6d70);
        font-size: 0.875rem;
        margin: 0 0 0.75rem 0;
        flex-shrink: 0;
      }
      .yaml-editor-container {
        flex: 1;
        min-height: 300px;
        border: 1px solid var(--sapField_BorderColor, #89919a);
        border-radius: 4px;
        overflow: hidden;
      }
      .form-error {
        color: var(--sapNegativeColor);
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
      }
      .form-errors {
        margin-top: 0.5rem;
        padding: 0.5rem;
        background-color: var(--sapErrorBackground, #ffebeb);
        border-radius: 4px;
        flex-shrink: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateResourcePageComponent implements OnInit {
  private store = inject(Store);
  private luigiClient = inject(LuigiClientService);
  private resourceService = inject(GenericResourceService);
  private contextService = inject(ContextService);
  private yamlTemplateGenerator = inject(YamlTemplateGeneratorService);

  protected readonly fieldAnalysis = toSignal(
    this.store.select(selectFieldAnalysis)
  );
  protected readonly resourceDefinition = toSignal(
    this.store.select(selectResourceDefinition)
  );
  protected readonly resourceContext = toSignal(
    this.store.select(selectResourceContext)
  );

  protected readonly yamlValidationErrors = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly yamlContent = signal('');
  private templateInitialized = false;

  protected readonly description = computed(() => {
    const kind = this.resourceDefinition()?.kind;
    return kind
      ? `Define a new ${kind} resource using YAML. A template has been provided below.`
      : 'Define a new resource using YAML.';
  });

  constructor() {
    // Reactively generate YAML template when schema/definition become available
    effect(() => {
      const analysis = this.fieldAnalysis();
      const resourceDef = this.resourceDefinition();
      console.log('[CreatePage] effect fired, hasAnalysis:', !!analysis, 'hasResourceDef:', !!resourceDef, 'templateInitialized:', this.templateInitialized);
      if (analysis && resourceDef && !this.templateInitialized) {
        this.templateInitialized = true;
        const defaultResource = this.yamlTemplateGenerator.buildDefaultResource(
          resourceDef,
          analysis
        );
        const yaml = resourceToYaml(defaultResource);
        console.log('[CreatePage] setting template yaml, length:', yaml.length, 'preview:', yaml.substring(0, 80));
        this.yamlContent.set(yaml);
      }
    });
  }

  ngOnInit(): void {
    // Tell Luigi the app is ready (hides loading indicator)
    try {
      this.luigiClient.uxManager().hideLoadingIndicator();
    } catch {
      // Ignore - may not be in Luigi context
    }

    // Initialize context if not already done
    this.contextService.initialize();
  }

  protected onYamlContentChanged(content: string): void {
    this.yamlContent.set(content);
    this.validateYaml();
  }

  protected canSubmit(): boolean {
    return this.isYamlValid();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.onCancel();
  }

  protected onCancel(): void {
    this.luigiClient.linkManager().goBack({ cancelled: true });
  }

  protected onSubmit(): void {
    const context = this.resourceContext();

    if (!context) {
      this.yamlValidationErrors.set(['Resource context not available']);
      return;
    }

    if (!this.validateYaml()) {
      return;
    }

    this.saving.set(true);

    this.resourceService.applyYaml(this.yamlContent(), context).pipe(take(1)).subscribe({
      next: () => {
        this.saving.set(false);
        let name = '';
        try { name = yamlToResource(this.yamlContent()).metadata?.name || ''; } catch { /* ignore */ }
        this.luigiClient.linkManager().goBack({ created: name });
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.yamlValidationErrors.set([`Failed to create resource: ${err.message || 'Unknown error'}`]);
      },
    });
  }

  private isYamlValid(): boolean {
    try {
      const resource = yamlToResource(this.yamlContent());

      if (!resource.metadata?.name) {
        return false;
      }
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(resource.metadata.name)) {
        return false;
      }

      const analysis = this.fieldAnalysis();
      if (analysis) {
        for (const field of analysis.requiredInputFields) {
          if (field.name !== 'name') {
            const value = resource.spec?.[field.name];
            if (value === undefined || value === null || value === '') {
              return false;
            }
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private validateYaml(): boolean {
    const errors: string[] = [];

    try {
      const resource = yamlToResource(this.yamlContent());

      // Validate metadata.name
      if (!resource.metadata?.name) {
        errors.push('metadata.name is required');
      } else if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(resource.metadata.name)) {
        errors.push('metadata.name must be a valid Kubernetes name (lowercase alphanumeric and hyphens, 1-63 characters)');
      }

      // Validate required spec fields
      const analysis = this.fieldAnalysis();
      if (analysis) {
        for (const field of analysis.requiredInputFields) {
          if (field.name !== 'name') {
            const value = resource.spec?.[field.name];
            if (value === undefined || value === null || value === '') {
              errors.push(`spec.${field.name} is required`);
            }
          }
        }
      }
    } catch {
      errors.push('Invalid YAML syntax');
    }

    this.yamlValidationErrors.set(errors);
    return errors.length === 0;
  }
}
