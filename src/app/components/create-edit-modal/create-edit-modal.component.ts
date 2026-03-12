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
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { ButtonBarComponent } from '@fundamental-ngx/core/bar';
import { DialogModule, DialogService, DialogRef } from '@fundamental-ngx/core/dialog';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { Store } from '@ngrx/store';
import { Subject, take, takeUntil, pairwise, startWith } from 'rxjs';
import { applyYaml, updateResource } from 'state/resources/resources.actions';
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
import { YamlTemplateGeneratorService } from 'services/view-generator/yaml-template-generator.service';
import { resourceToYaml, yamlToResource, stripTypename } from 'utils/yaml-utils';
import { LuigiDialogService } from 'services/index';
import { MonacoYamlViewerComponent } from '../shared/monaco-yaml-viewer/monaco-yaml-viewer.component';

@Component({
  selector: 'app-create-edit-modal',
  imports: [
    ButtonComponent,
    ButtonBarComponent,
    DialogModule,
    BusyIndicatorComponent,
    MonacoYamlViewerComponent,
  ],
  template: `
    <ng-template #dialogTemplate>
      <fd-dialog>
        <fd-dialog-header>
          <h3 fd-dialog-title>{{ title() }}</h3>
        </fd-dialog-header>

        <fd-dialog-body>
          <fd-busy-indicator [loading]="saving()" size="m" [block]="true">
            <p class="editor-description">{{ description() }}</p>
            <div class="yaml-editor-container">
              <app-monaco-yaml-viewer
                [content]="yamlContent()"
                [readOnly]="false"
                (contentChanged)="onYamlContentChanged($event)"
              />
            </div>
            @if (yamlValidationErrors().length > 0) {
              <div class="yaml-errors">
                @for (error of yamlValidationErrors(); track error) {
                  <div class="yaml-error">{{ error }}</div>
                }
              </div>
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
      .editor-description {
        color: var(--sapContent_LabelColor, #6a6d70);
        font-size: 0.875rem;
        margin: 0 0 0.75rem 0;
      }
      .yaml-editor-container {
        height: 400px;
        border: 1px solid var(--sapField_BorderColor, #89919a);
        border-radius: 4px;
        overflow: hidden;
      }
      .yaml-error {
        color: var(--sapNegativeColor);
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
      }
      .yaml-errors {
        margin-top: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEditModalComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private dialogService = inject(DialogService);
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

  protected readonly yamlValidationErrors = signal<string[]>([]);
  protected readonly yamlContent = signal('');

  protected readonly isEditMode = computed(() => this.modalMode() === 'edit');
  protected readonly title = computed(() =>
    this.isEditMode() ? 'Edit Resource' : 'Create Resource'
  );
  protected readonly description = computed(() => {
    const kind = this.resourceDefinition()?.kind;
    if (this.isEditMode()) {
      return kind
        ? `Edit the YAML definition of this ${kind} resource.`
        : 'Edit the YAML definition of this resource.';
    }
    return kind
      ? `Define a new ${kind} resource using YAML. A template has been provided below.`
      : 'Define a new resource using YAML.';
  });

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

    // Initialize YAML content based on mode
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
    this.yamlContent.set('');
    this.yamlValidationErrors.set([]);
  }

  private initializeModal(): void {
    const mode = this.modalMode();
    const editingName = this.editingResourceName();
    console.log('[Modal] initializeModal called, mode:', mode, 'editingName:', editingName);

    if (mode === 'edit' && editingName) {
      this.store
        .select(selectResourceByName(editingName))
        .pipe(take(1))
        .subscribe((resource) => {
          if (resource) {
            const yaml = resourceToYaml(stripTypename(resource));
            console.log('[Modal] edit mode, setting yaml content length:', yaml.length);
            this.yamlContent.set(yaml);
            this.yamlValidationErrors.set([]);
          }
        });
    } else {
      // Create mode: generate default YAML template
      const analysis = this.fieldAnalysis();
      const resourceDef = this.resourceDefinition();
      console.log('[Modal] create mode, hasAnalysis:', !!analysis, 'hasResourceDef:', !!resourceDef);
      if (analysis && resourceDef) {
        const defaultResource = this.yamlTemplateGenerator.buildDefaultResource(
          resourceDef,
          analysis
        );
        const yaml = resourceToYaml(defaultResource);
        console.log('[Modal] setting template yaml, length:', yaml.length, 'preview:', yaml.substring(0, 80));
        this.yamlContent.set(yaml);
      } else {
        console.log('[Modal] WARNING: no analysis or resourceDef available for template generation');
      }
      this.yamlValidationErrors.set([]);
    }
  }

  protected onYamlContentChanged(content: string): void {
    this.yamlContent.set(content);
    this.validateYaml();
  }

  protected canSubmit(): boolean {
    return this.isYamlValid();
  }

  protected onCancel(): void {
    this.store.dispatch(closeModal());
  }

  protected onSubmit(): void {
    if (!this.validateYaml()) {
      return;
    }
    if (this.isEditMode()) {
      let resource;
      try {
        resource = yamlToResource(this.yamlContent());
      } catch {
        this.yamlValidationErrors.set(['Invalid YAML syntax']);
        return;
      }
      this.store.dispatch(updateResource({ resource }));
    } else {
      this.store.dispatch(applyYaml({ yaml: this.yamlContent() }));
    }

    this.store.dispatch(closeModal());
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
