import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { IconComponent } from '@fundamental-ngx/core/icon';
import {
  TableModule,
} from '@fundamental-ngx/core/table';
import { Store } from '@ngrx/store';
import { FieldAnalysis, ListColumn, Resource } from 'models/index';
import { NavigationService } from 'services/navigation/navigation.service';
import { ListColumnGeneratorService } from 'services/view-generator/list-column-generator.service';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { openDeleteConfirmation, openEditModal } from 'state/ui/ui.actions';
import { ReadyStatusBadgeComponent } from 'components/shared/ready-status-badge/ready-status-badge.component';
import { ValueCellComponent } from 'components/shared/value-cell/value-cell.component';
import { LabelsDisplayComponent } from 'components/shared/labels-display/labels-display.component';
import { getValueByPath } from 'utils/yaml-utils';

@Component({
  selector: 'app-resource-table',
  imports: [
    TableModule,
    ButtonComponent,
    IconComponent,
    ReadyStatusBadgeComponent,
    ValueCellComponent,
    LabelsDisplayComponent,
  ],
  template: `
    @if (resources().length === 0) {
      <div class="empty-state">
        <fd-icon glyph="document" size="xl"></fd-icon>
        <p>No resources found</p>
      </div>
    } @else {
      <table fd-table>
        <thead fd-table-header>
          <tr fd-table-row>
            @for (column of columns(); track column.key) {
              <th fd-table-cell>{{ column.label }}</th>
            }
            <th fd-table-cell>Status</th>
            <th fd-table-cell>Actions</th>
          </tr>
        </thead>
        <tbody fd-table-body>
          @for (resource of resources(); track resource.metadata.uid) {
            <tr fd-table-row>
              @for (column of columns(); track column.key) {
                <td fd-table-cell>
                  @if (column.type === 'link') {
                    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
                    <a
                      class="fd-link"
                      (click)="onRowClick(resource)"
                    >
                      {{ getColumnValue(resource, column) }}
                    </a>
                  } @else if (column.type === 'labels') {
                    <app-labels-display
                      [labels]="getColumnValue(resource, column)"
                      [maxLabels]="3"
                    ></app-labels-display>
                  } @else {
                    <app-value-cell
                      [value]="getColumnValue(resource, column)"
                      [type]="column.type"
                    ></app-value-cell>
                  }
                </td>
              }
              <td fd-table-cell>
                <app-ready-status-badge
                  [status]="getReadyStatus(resource)"
                ></app-ready-status-badge>
              </td>
              <td fd-table-cell>
                <!-- eslint-disable @angular-eslint/template/elements-content -->
                <button
                  fd-button
                  fdType="transparent"
                  glyph="edit"
                  ariaLabel="Edit"
                  (click)="onEdit(resource)"
                ></button>
                <button
                  fd-button
                  fdType="transparent"
                  glyph="delete"
                  ariaLabel="Delete"
                  (click)="onDelete(resource)"
                ></button>
                <!-- eslint-enable @angular-eslint/template/elements-content -->
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: var(--sapContent_DisabledTextColor);
      }
      .empty-state fd-icon {
        margin-bottom: 1rem;
      }
      .fd-link {
        cursor: pointer;
        color: var(--sapLinkColor);
        text-decoration: none;
      }
      .fd-link:hover {
        text-decoration: underline;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceTableComponent {
  private navigationService = inject(NavigationService);
  private store = inject(Store);
  private columnGenerator = inject(ListColumnGeneratorService);
  private readyStatusDetector = inject(ReadyStatusDetectorService);

  readonly resources = input<Resource[]>([]);
  readonly fieldAnalysis = input<FieldAnalysis | null | undefined>();
  readonly searchTerm = input<string>('');
  readonly showNamespaceColumn = input<boolean>(false);

  protected readonly columns = computed((): ListColumn[] => {
    const analysis = this.fieldAnalysis();
    const base = analysis
      ? this.columnGenerator.generateColumns(analysis)
      : this.getDefaultColumns();

    if (this.showNamespaceColumn()) {
      const nsColumn: ListColumn = {
        key: 'namespace',
        label: 'Namespace',
        path: 'metadata.namespace',
        sortable: true,
        type: 'text',
        priority: 1,
      };
      return [base[0], nsColumn, ...base.slice(1)].sort((a, b) => a.priority - b.priority);
    }
    return base;
  });

  protected getColumnValue(resource: Resource, column: ListColumn): any {
    return getValueByPath(resource, column.path);
  }

  protected getReadyStatus(resource: Resource) {
    return this.readyStatusDetector.detectReadyStatus(resource);
  }

  protected onRowClick(resource: Resource): void {
    this.navigationService.navigateToResource(
      resource.metadata.name,
      resource.metadata.namespace
    );
  }

  protected onEdit(resource: Resource): void {
    this.store.dispatch(openEditModal({ resourceName: resource.metadata.name }));
  }

  protected onDelete(resource: Resource): void {
    this.store.dispatch(
      openDeleteConfirmation({ resourceName: resource.metadata.name })
    );
  }

  private getDefaultColumns(): ListColumn[] {
    return [
      {
        key: 'name',
        label: 'Name',
        path: 'metadata.name',
        sortable: true,
        type: 'link',
        priority: 0,
      },
      {
        key: 'creationTimestamp',
        label: 'Created',
        path: 'metadata.creationTimestamp',
        sortable: true,
        type: 'date',
        priority: 100,
      },
    ];
  }
}
