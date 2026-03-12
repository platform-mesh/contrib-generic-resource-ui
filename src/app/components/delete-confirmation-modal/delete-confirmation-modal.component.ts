import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { BarModule } from '@fundamental-ngx/core/bar';
import { FormItemComponent, FormLabelComponent, FormControlComponent } from '@fundamental-ngx/core/form';
import { MessageStripComponent } from '@fundamental-ngx/core/message-strip';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { Store } from '@ngrx/store';
import { deleteResource } from 'state/resources/resources.actions';
import { selectDeleting } from 'state/resources/resources.selectors';
import {
  selectDeleteConfirmationOpen,
  selectDeletingResourceName,
  selectDeletingResourceNamespace,
} from 'state/ui/ui.selectors';
import { closeDeleteConfirmation } from 'state/ui/ui.actions';

@Component({
  selector: 'app-delete-confirmation-modal',
  imports: [
    FormsModule,
    ButtonComponent,
    BarModule,
    FormItemComponent,
    FormLabelComponent,
    FormControlComponent,
    MessageStripComponent,
    BusyIndicatorComponent,
  ],
  template: `
    @if (isOpen()) {
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div class="dialog-backdrop" (click)="onCancel()"></div>
      <div class="dialog-container" role="dialog" aria-modal="true">
        <div class="dialog-header">
          <h3 class="dialog-title">Delete Resource</h3>
        </div>

        <div class="dialog-body">
          <fd-busy-indicator [loading]="deleting()" size="m" [block]="true">
            <fd-message-strip type="warning" [dismissible]="false">
              This action cannot be undone. The resource will be permanently
              deleted.
            </fd-message-strip>

            <p class="confirmation-text">
              To confirm deletion, please type the resource name:
              <strong>{{ resourceName() }}</strong>
            </p>

            <div fd-form-item>
              <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
              <label fd-form-label>Resource Name</label>
              <input
                fd-form-control
                type="text"
                [(ngModel)]="confirmationInput"
                placeholder="Enter resource name"
              />
            </div>
          </fd-busy-indicator>
        </div>

        <div fd-bar barDesign="footer" class="dialog-footer">
          <div fd-bar-element>
            <button
              fd-button
              fdType="transparent"
              (click)="onCancel()"
            >Cancel</button>
          </div>
          <div fd-bar-element>
            <button
              fd-button
              fdType="negative"
              [disabled]="!canDelete()"
              (click)="onDelete()"
            >Delete</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .dialog-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
      }
      .dialog-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--sapBackgroundColor, white);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 1001;
        min-width: 400px;
        max-width: 90vw;
      }
      .dialog-header {
        padding: 1rem;
        border-bottom: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .dialog-title {
        margin: 0;
        font-size: 1.125rem;
      }
      .dialog-body {
        padding: 1rem;
      }
      .dialog-footer {
        border-top: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .confirmation-text {
        margin: 1rem 0;
      }
      strong {
        font-family: monospace;
        background: var(--sapBackgroundColor);
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteConfirmationModalComponent {
  private store = inject(Store);

  protected readonly isOpen = toSignal(
    this.store.select(selectDeleteConfirmationOpen),
    { initialValue: false }
  );
  protected readonly resourceName = toSignal(
    this.store.select(selectDeletingResourceName),
    { initialValue: '' }
  );
  protected readonly resourceNamespace = toSignal(
    this.store.select(selectDeletingResourceNamespace)
  );
  protected readonly deleting = toSignal(this.store.select(selectDeleting), {
    initialValue: false,
  });

  protected confirmationInput = '';

  protected canDelete(): boolean {
    return this.confirmationInput === this.resourceName();
  }

  protected onCancel(): void {
    this.confirmationInput = '';
    this.store.dispatch(closeDeleteConfirmation());
  }

  protected onDelete(): void {
    const name = this.resourceName();
    if (name && this.canDelete()) {
      this.store.dispatch(deleteResource({
        resourceName: name,
        resourceNamespace: this.resourceNamespace() ?? undefined,
      }));
      this.confirmationInput = '';
      this.store.dispatch(closeDeleteConfirmation());
    }
  }
}
