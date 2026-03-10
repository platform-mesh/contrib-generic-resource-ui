import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { BarComponent } from '@fundamental-ngx/core/bar';
import { FormItemComponent, FormLabelComponent, FormControlComponent } from '@fundamental-ngx/core/form';
import { SegmentedButtonModule } from '@fundamental-ngx/core/segmented-button';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { Resource } from 'models/index';
import { LuigiClientService } from 'services/luigi/luigi-client.service';
import { GenericResourceService } from 'services/resource/generic-resource.service';
import { selectFieldAnalysis } from 'state/schema/schema.selectors';
import { selectResourceDefinition } from 'state/context/context.selectors';
import { selectResourceContext } from 'state/context/context.selectors';
import { FormFieldGeneratorService } from 'services/view-generator/form-field-generator.service';
import { YamlTemplateGeneratorService } from 'services/view-generator/yaml-template-generator.service';
import { resourceToYaml, yamlToResource } from 'utils/yaml-utils';
import { k8sNameValidator } from 'validators/k8s-name-validator';
import { ContextService } from 'services/context/context.service';

type EditorMode = 'form' | 'yaml';

@Component({
  selector: 'app-create-resource-page',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    BarComponent,
    FormItemComponent,
    FormLabelComponent,
    FormControlComponent,
    SegmentedButtonModule,
    BusyIndicatorComponent,
  ],
  template: `
    <fd-busy-indicator [loading]="saving()" size="m" [block]="true">
      <div class="modal-container">
        <div class="modal-content">
          <div class="mode-selector">
            <fd-segmented-button>
              <button
                fd-button
                [class.is-selected]="editorMode() === 'form'"
                (click)="setEditorMode('form')"
              >
                Form
              </button>
              <button
                fd-button
                [class.is-selected]="editorMode() === 'yaml'"
                (click)="setEditorMode('yaml')"
              >
                YAML
              </button>
            </fd-segmented-button>
          </div>

          @if (editorMode() === 'form') {
            <form [formGroup]="resourceForm">
              <div fd-form-item>
                <label fd-form-label [required]="true" for="resource-name">Name</label>
                <input
                  fd-form-control
                  id="resource-name"
                  formControlName="name"
                  placeholder="Enter resource name (e.g., my-resource)"
                  [state]="getFieldState('name')"
                  test-id="create-field-metadata_name"
                />
                @if (resourceForm.get('name')?.hasError('k8sNameInvalid') &&
                     resourceForm.get('name')?.touched) {
                  <span class="field-error">
                    Name must be lowercase, start and end with alphanumeric, contain only letters, numbers, and hyphens
                  </span>
                }
                @if (resourceForm.get('name')?.hasError('required') &&
                     resourceForm.get('name')?.touched) {
                  <span class="field-error">Name is required</span>
                }
              </div>

              @for (field of formFields(); track field.key) {
                <div fd-form-item>
                  <label fd-form-label [required]="field.required" [for]="'field-' + field.key">
                    {{ field.label }}
                  </label>
                  @if (field.type === 'boolean') {
                    <input
                      type="checkbox"
                      fd-form-control
                      [id]="'field-' + field.key"
                      [formControlName]="field.key"
                      [attr.test-id]="'create-field-spec_' + field.key"
                    />
                  } @else if (field.type === 'number') {
                    <input
                      type="number"
                      fd-form-control
                      [id]="'field-' + field.key"
                      [formControlName]="field.key"
                      [placeholder]="field.placeholder || ''"
                      [state]="getFieldState(field.key)"
                      [attr.test-id]="'create-field-spec_' + field.key"
                    />
                  } @else if (field.type === 'yaml' || field.type === 'textarea') {
                    <textarea
                      fd-form-control
                      [id]="'field-' + field.key"
                      [formControlName]="field.key"
                      [placeholder]="field.placeholder || ''"
                      rows="5"
                      [state]="getFieldState(field.key)"
                      [attr.test-id]="'create-field-spec_' + field.key"
                    ></textarea>
                  } @else {
                    <input
                      type="text"
                      fd-form-control
                      [id]="'field-' + field.key"
                      [formControlName]="field.key"
                      [placeholder]="field.placeholder || ''"
                      [state]="getFieldState(field.key)"
                      [attr.test-id]="'create-field-spec_' + field.key"
                    />
                  }
                  @if (resourceForm.get(field.key)?.hasError('required') &&
                       resourceForm.get(field.key)?.touched) {
                    <span class="field-error">{{ field.label }} is required</span>
                  }
                </div>
              }
            </form>
          } @else {
            <textarea
              class="yaml-editor"
              [(ngModel)]="yamlContent"
              (ngModelChange)="onYamlChange()"
              rows="20"
            ></textarea>
          }

          @if (yamlValidationErrors().length > 0) {
            <div class="form-errors">
              @for (error of yamlValidationErrors(); track error) {
                <div class="form-error">{{ error }}</div>
              }
            </div>
          }
        </div>

        <div fd-bar barDesign="footer" class="modal-footer">
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
          <div fd-bar-element>
            <button
              fd-button
              fdType="transparent"
              (click)="onCancel()"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </fd-busy-indicator>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .modal-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .modal-content {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
      }
      .modal-footer {
        flex-shrink: 0;
      }
      .mode-selector {
        margin-bottom: 1rem;
      }
      .yaml-editor {
        width: 100%;
        font-family: monospace;
        font-size: 0.875rem;
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
      }
      .field-error {
        color: var(--sapNegativeColor);
        font-size: 0.75rem;
        margin-top: 0.25rem;
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateResourcePageComponent implements OnInit {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private luigiClient = inject(LuigiClientService);
  private resourceService = inject(GenericResourceService);
  private contextService = inject(ContextService);
  private formFieldGenerator = inject(FormFieldGeneratorService);
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

  protected readonly editorMode = signal<EditorMode>('form');
  protected readonly yamlValidationErrors = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected yamlContent = '';
  protected resourceForm: FormGroup;

  protected readonly formFields = computed(() => {
    const analysis = this.fieldAnalysis();
    if (!analysis) {
      return [];
    }
    return this.formFieldGenerator.generateFormFields(
      analysis.requiredInputFields,
      analysis.scalarSpecFields
    ).filter(f => f.key !== 'name');
  });

  constructor() {
    this.resourceForm = this.fb.group({
      name: ['', [Validators.required, k8sNameValidator]],
    });

    // Rebuild form controls whenever formFields changes (schema loads asynchronously)
    effect(() => {
      this.formFields(); // Track the signal
      this.buildDynamicFormControls();
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

  private buildDynamicFormControls(): void {
    const fields = this.formFields();

    // Remove old dynamic controls, keep static ones
    const staticControls = ['name'];
    Object.keys(this.resourceForm.controls)
      .filter(key => !staticControls.includes(key))
      .forEach(key => this.resourceForm.removeControl(key));

    // Add new controls based on schema
    for (const field of fields) {
      const validators = field.required ? [Validators.required] : [];
      this.resourceForm.addControl(
        field.key,
        this.fb.control(field.defaultValue ?? '', validators)
      );
    }
  }

  protected getFieldState(fieldName: string): 'error' | 'success' | 'default' {
    const control = this.resourceForm.get(fieldName);
    if (control?.invalid && control?.touched) {
      return 'error';
    }
    return 'default';
  }

  protected setEditorMode(mode: EditorMode): void {
    if (mode === 'yaml' && this.editorMode() === 'form') {
      this.syncFormToYaml();
    } else if (mode === 'form' && this.editorMode() === 'yaml') {
      this.syncYamlToForm();
    }
    this.editorMode.set(mode);
  }

  protected onYamlChange(): void {
    this.validateYaml();
  }

  protected canSubmit(): boolean {
    if (this.editorMode() === 'form') {
      return this.resourceForm.valid;
    }
    // Use pure validation check without setting signals (avoids NG0600 error)
    return this.isYamlValid();
  }

  private isYamlValid(): boolean {
    try {
      const resource = yamlToResource(this.yamlContent);

      // Validate metadata.name
      if (!resource.metadata?.name) {
        return false;
      }
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(resource.metadata.name)) {
        return false;
      }

      // Validate required spec fields
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

  protected onCancel(): void {
    this.luigiClient.linkManager().goBack({ cancelled: true });
  }

  protected onSubmit(): void {
    const resourceDef = this.resourceDefinition();
    const context = this.resourceContext();

    if (!resourceDef || !context) {
      this.yamlValidationErrors.set(['Resource definition or context not available']);
      return;
    }

    this.saving.set(true);

    if (this.editorMode() === 'yaml') {
      if (!this.validateYaml()) {
        this.saving.set(false);
        return;
      }
      this.resourceService.applyYaml(this.yamlContent, context).pipe(take(1)).subscribe({
        next: () => {
          this.saving.set(false);
          let name = '';
          try { name = yamlToResource(this.yamlContent).metadata?.name || ''; } catch { /* ignore */ }
          this.luigiClient.linkManager().goBack({ created: name });
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.yamlValidationErrors.set([`Failed to create resource: ${err.message || 'Unknown error'}`]);
        },
      });
    } else {
      const resource = this.buildResourceFromForm();
      this.resourceService.create(resource, resourceDef, context).pipe(take(1)).subscribe({
        next: () => {
          this.saving.set(false);
          this.luigiClient.linkManager().goBack({ created: resource.metadata.name });
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.yamlValidationErrors.set([`Failed to create resource: ${err.message || 'Unknown error'}`]);
        },
      });
    }
  }

  private validateYaml(): boolean {
    const errors: string[] = [];

    try {
      const resource = yamlToResource(this.yamlContent);

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

  private buildResourceFromForm(): Resource {
    const formValue = this.resourceForm.value;
    const { name, ...specFields } = formValue;

    const resourceDef = this.resourceDefinition();
    const resource: Resource = {
      metadata: {
        name,
      },
      spec: specFields,
    };

    // Add apiVersion and kind if we have resource definition
    if (resourceDef) {
      resource.apiVersion = `${resourceDef.group}/${resourceDef.version}`;
      resource.kind = resourceDef.kind;
    }

    return resource;
  }

  private syncFormToYaml(): void {
    const analysis = this.fieldAnalysis();
    const resourceDef = this.resourceDefinition();

    // Start with schema-based template if available, otherwise build from form only
    let resource: Resource;
    if (analysis && resourceDef) {
      resource = this.yamlTemplateGenerator.buildDefaultResource(resourceDef, analysis);
    } else {
      resource = this.buildResourceFromForm();
    }

    // Overlay form values onto the template
    const formValue = this.resourceForm.value;
    const { name, ...specFields } = formValue;

    resource.metadata = resource.metadata || {};
    resource.metadata.name = name || '';

    resource.spec = resource.spec || {};
    for (const [key, value] of Object.entries(specFields)) {
      if (value !== undefined && value !== null && value !== '') {
        resource.spec[key] = value;
      }
    }

    this.yamlContent = resourceToYaml(resource);
    this.yamlValidationErrors.set([]);
  }

  private syncYamlToForm(): void {
    try {
      const resource = yamlToResource(this.yamlContent);
      this.resourceForm.patchValue({
        name: resource.metadata?.name || '',
      });

      if (resource.spec) {
        for (const [key, value] of Object.entries(resource.spec)) {
          if (this.resourceForm.contains(key)) {
            this.resourceForm.patchValue({ [key]: value });
          }
        }
      }

      this.yamlValidationErrors.set([]);
    } catch {
      this.yamlValidationErrors.set(['Invalid YAML syntax']);
    }
  }
}
