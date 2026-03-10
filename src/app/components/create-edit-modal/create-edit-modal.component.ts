import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { ButtonBarComponent } from '@fundamental-ngx/core/bar';
import { DialogModule, DialogService, DialogRef } from '@fundamental-ngx/core/dialog';
import { FormItemComponent, FormLabelComponent, FormControlComponent } from '@fundamental-ngx/core/form';
import { InputGroupModule } from '@fundamental-ngx/core/input-group';
import { SegmentedButtonModule } from '@fundamental-ngx/core/segmented-button';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { Store } from '@ngrx/store';
import { Subject, take, takeUntil, pairwise, startWith } from 'rxjs';
import { Resource } from 'models/index';
import { applyYaml, createResource, updateResource } from 'state/resources/resources.actions';
import {
  selectResourceByName,
  selectSaving,
} from 'state/resources/resources.selectors';
import { selectFieldAnalysis } from 'state/schema/schema.selectors';
import { selectResourceDefinition } from 'state/context/context.selectors';
import {
  selectEditingResourceName,
  selectModalMode,
  selectModalOpen,
} from 'state/ui/ui.selectors';
import { closeModal } from 'state/ui/ui.actions';
import { FormFieldGeneratorService } from 'services/view-generator/form-field-generator.service';
import { YamlTemplateGeneratorService } from 'services/view-generator/yaml-template-generator.service';
import { resourceToYaml, yamlToResource, stripTypename } from 'utils/yaml-utils';
import { k8sNameValidator } from 'validators/k8s-name-validator';
import { LuigiDialogService } from 'services/index';

type EditorMode = 'form' | 'yaml';

@Component({
  selector: 'app-create-edit-modal',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    ButtonBarComponent,
    DialogModule,
    FormItemComponent,
    FormLabelComponent,
    FormControlComponent,
    InputGroupModule,
    SegmentedButtonModule,
    BusyIndicatorComponent,
  ],
  template: `
    <ng-template #dialogTemplate>
      <fd-dialog>
        <fd-dialog-header>
          <h3 fd-dialog-title>{{ title() }}</h3>
        </fd-dialog-header>

        <fd-dialog-body>
          <fd-busy-indicator [loading]="saving()" size="m" [block]="true">
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
                    [readonly]="isEditMode()"
                    [state]="getFieldState('name')"
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
                      />
                    } @else if (field.type === 'number') {
                      <input
                        type="number"
                        fd-form-control
                        [id]="'field-' + field.key"
                        [formControlName]="field.key"
                        [placeholder]="field.placeholder || ''"
                        [state]="getFieldState(field.key)"
                      />
                    } @else if (field.type === 'yaml' || field.type === 'textarea') {
                      <textarea
                        fd-form-control
                        [id]="'field-' + field.key"
                        [formControlName]="field.key"
                        [placeholder]="field.placeholder || ''"
                        rows="5"
                        [state]="getFieldState(field.key)"
                      ></textarea>
                    } @else {
                      <input
                        type="text"
                        fd-form-control
                        [id]="'field-' + field.key"
                        [formControlName]="field.key"
                        [placeholder]="field.placeholder || ''"
                        [state]="getFieldState(field.key)"
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
              @if (yamlValidationErrors().length > 0) {
                <div class="yaml-errors">
                  @for (error of yamlValidationErrors(); track error) {
                    <div class="yaml-error">{{ error }}</div>
                  }
                </div>
              }
            }
          </fd-busy-indicator>
        </fd-dialog-body>

        <fd-dialog-footer>
          <fd-button-bar
            fdType="transparent"
            (click)="onCancel()"
          >Cancel</fd-button-bar>
          <fd-button-bar
            fdType="emphasized"
            [disabled]="!canSubmit()"
            (click)="onSubmit()"
          >{{ isEditMode() ? 'Update' : 'Create' }}</fd-button-bar>
        </fd-dialog-footer>
      </fd-dialog>
    </ng-template>
  `,
  styles: [
    `
      .mode-selector {
        margin-bottom: 1rem;
      }
      .yaml-editor {
        width: 100%;
        font-family: monospace;
        font-size: 0.875rem;
      }
      .yaml-error {
        color: var(--sapNegativeColor);
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
      }
      .yaml-errors {
        margin-top: 0.5rem;
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
export class CreateEditModalComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private dialogService = inject(DialogService);
  private formFieldGenerator = inject(FormFieldGeneratorService);
  private yamlTemplateGenerator = inject(YamlTemplateGeneratorService);
  private luigiDialogService = inject(LuigiDialogService);
  private destroy$ = new Subject<void>();
  private dialogRef: DialogRef | null = null;

  @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<unknown>;

  protected readonly modalMode = toSignal(this.store.select(selectModalMode));
  protected readonly editingResourceName = toSignal(
    this.store.select(selectEditingResourceName)
  );
  protected readonly fieldAnalysis = toSignal(
    this.store.select(selectFieldAnalysis)
  );
  protected readonly resourceDefinition = toSignal(
    this.store.select(selectResourceDefinition)
  );
  protected readonly saving = toSignal(this.store.select(selectSaving), {
    initialValue: false,
  });

  protected readonly editorMode = signal<EditorMode>('form');
  protected readonly yamlValidationErrors = signal<string[]>([]);
  protected yamlContent = '';
  protected resourceForm: FormGroup;

  protected readonly isEditMode = computed(() => this.modalMode() === 'edit');
  protected readonly title = computed(() =>
    this.isEditMode() ? 'Edit Resource' : 'Create Resource'
  );

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
  }

  ngOnInit(): void {
    // Watch for modal open/close state changes
    this.store.select(selectModalOpen).pipe(
      takeUntil(this.destroy$),
      startWith(false),
      pairwise()
    ).subscribe(([wasOpen, isOpen]) => {
      if (!wasOpen && isOpen) {
        this.openDialog();
      } else if (wasOpen && !isOpen) {
        this.closeDialog();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.closeDialog();
  }

  private openDialog(): void {
    // Add Luigi backdrop
    this.luigiDialogService.dialogOpened();

    // Initialize form based on mode
    this.initializeModal();

    // Open dialog using DialogService
    this.dialogRef = this.dialogService.open(this.dialogTemplate, {
      width: '600px',
      responsivePadding: true,
      backdropClickCloseable: false,
      escKeyCloseable: true,
    });

    // Handle dialog close
    this.dialogRef.afterClosed.subscribe(() => {
      this.luigiDialogService.dialogClosed();
      // Dispatch close action if dialog was closed by escape key
      this.store.dispatch(closeModal());
    });
  }

  private closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
    this.resetForm();
  }

  private initializeModal(): void {
    const mode = this.modalMode();
    const editingName = this.editingResourceName();

    // Build dynamic form controls based on schema
    this.buildDynamicFormControls();

    if (mode === 'edit' && editingName) {
      this.store
        .select(selectResourceByName(editingName))
        .pipe(take(1))
        .subscribe((resource) => {
          if (resource) {
            this.loadResourceIntoForm(resource);
          }
        });
    } else {
      // Create mode: generate default YAML template
      const analysis = this.fieldAnalysis();
      const resourceDef = this.resourceDefinition();
      if (analysis && resourceDef) {
        const defaultResource = this.yamlTemplateGenerator.buildDefaultResource(
          resourceDef,
          analysis
        );
        this.yamlContent = resourceToYaml(defaultResource);
      }
      this.yamlValidationErrors.set([]);
    }
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
    return this.validateYaml();
  }

  protected onCancel(): void {
    this.store.dispatch(closeModal());
  }

  protected onSubmit(): void {
    if (this.editorMode() === 'yaml') {
      if (!this.validateYaml()) {
        return;
      }
      if (this.isEditMode()) {
        let resource: Resource;
        try {
          resource = yamlToResource(this.yamlContent);
        } catch {
          this.yamlValidationErrors.set(['Invalid YAML syntax']);
          return;
        }
        this.store.dispatch(updateResource({ resource }));
      } else {
        this.store.dispatch(applyYaml({ yaml: this.yamlContent }));
      }
    } else {
      const resource = this.buildResourceFromForm();
      if (this.isEditMode()) {
        this.store.dispatch(updateResource({ resource }));
      } else {
        this.store.dispatch(createResource({ resource }));
      }
    }

    this.store.dispatch(closeModal());
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

  private loadResourceIntoForm(resource: Resource): void {
    this.resourceForm.patchValue({
      name: resource.metadata.name,
    });

    if (resource.spec) {
      for (const [key, value] of Object.entries(resource.spec)) {
        if (this.resourceForm.contains(key)) {
          this.resourceForm.patchValue({ [key]: value });
        } else {
          this.resourceForm.addControl(key, this.fb.control(value));
        }
      }
    }

    this.yamlContent = resourceToYaml(stripTypename(resource));
    this.yamlValidationErrors.set([]);
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
    const resource = this.buildResourceFromForm();
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

  private resetForm(): void {
    this.resourceForm.reset();
    this.yamlContent = '';
    this.yamlValidationErrors.set([]);
    this.editorMode.set('form');
  }
}
