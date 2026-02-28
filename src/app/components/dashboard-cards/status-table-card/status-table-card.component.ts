import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardModule } from '@fundamental-ngx/core/card';
import { BusyIndicatorModule } from '@fundamental-ngx/core/busy-indicator';
import { ObjectStatusModule } from '@fundamental-ngx/core/object-status';
import { TableModule } from '@fundamental-ngx/core/table';
import {
  CardData,
  DashboardCardSpec,
  ResourceNodeContext,
  StatusTableColumn,
  StatusTableConfig,
} from 'models/index';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { ReadyStatusBadgeComponent } from 'components/shared/ready-status-badge/ready-status-badge.component';
import { CardDataService } from 'services/dashboard/card-data.service';
import { humanizeFieldName } from 'utils/humanize';

interface TableRow {
  cells: Record<string, any>;
  resource: any;
}

@Component({
  selector: 'app-status-table-card',
  imports: [CardModule, BusyIndicatorModule, ObjectStatusModule, TableModule, ReadyStatusBadgeComponent],
  template: `
    <fd-card>
      <fd-card-header>
        <h3 fd-card-title>{{ spec().title }}</h3>
        @if (spec().description) {
          <p fd-card-subtitle>{{ spec().description }}</p>
        }
      </fd-card-header>
      <fd-card-content>
        @if (cardData().loading) {
          <fd-busy-indicator [loading]="true" label="Loading..."></fd-busy-indicator>
        } @else if (cardData().error) {
          <span fd-object-status status="negative" [label]="cardData().error!"></span>
        } @else if (rows().length === 0) {
          <p class="empty-message">No resources found.</p>
        } @else {
          <table fd-table>
            <thead fd-table-header>
              <tr fd-table-row>
                @for (col of columns(); track col.key) {
                  <th fd-table-cell>{{ col.label }}</th>
                }
                <th fd-table-cell>Status</th>
              </tr>
            </thead>
            <tbody fd-table-body>
              @for (row of rows(); track row.cells['name'] ?? $index) {
                <tr fd-table-row>
                  @for (col of columns(); track col.key) {
                    <td fd-table-cell>{{ row.cells[col.key] ?? '-' }}</td>
                  }
                  <td fd-table-cell>
                    <app-ready-status-badge
                      [status]="readyStatusDetector.detectReadyStatus(row.resource)"
                    ></app-ready-status-badge>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </fd-card-content>
    </fd-card>
  `,
  styles: [
    `
      table[fd-table] {
        width: 100%;
      }
      .empty-message {
        font-size: 0.875rem;
        color: var(--sapContent_LabelColor);
        text-align: center;
        padding: 1rem 0;
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusTableCardComponent implements OnInit {
  readonly spec = input.required<DashboardCardSpec>();
  readonly context = input.required<ResourceNodeContext>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly cardDataService = inject(CardDataService);
  protected readonly readyStatusDetector = inject(ReadyStatusDetectorService);

  protected readonly cardData = signal<CardData>({ resources: [], loading: true, error: null });

  protected readonly config = computed<StatusTableConfig>(() => {
    return (this.spec().config as StatusTableConfig) ?? {};
  });

  protected readonly columns = computed<StatusTableColumn[]>(() => {
    const configColumns = this.config().columns;
    if (configColumns && configColumns.length > 0) {
      return configColumns;
    }
    return this.autoGenerateColumns();
  });

  protected readonly rows = computed<TableRow[]>(() => {
    const resources = this.cardData().resources;
    const cols = this.columns();
    return resources.map((r) => ({
      cells: Object.fromEntries(cols.map((col) => [col.key, this.resolveField(r, col.path)])),
      resource: r,
    }));
  });

  ngOnInit(): void {
    this.cardDataService
      .fetchCardData(this.spec(), this.context())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => this.cardData.set(data));
  }

  private autoGenerateColumns(): StatusTableColumn[] {
    const resources = this.cardData().resources;
    if (resources.length === 0) return [];

    const columns: StatusTableColumn[] = [
      { key: 'name', label: 'Name', path: 'metadata.name', type: 'text' },
    ];

    const first = resources[0];
    if (first.metadata?.namespace) {
      columns.push({ key: 'namespace', label: 'Namespace', path: 'metadata.namespace', type: 'text' });
    }

    // Add top-level spec scalar fields (up to 3)
    if (first.spec) {
      const specKeys = Object.keys(first.spec).filter(
        (k) => typeof first.spec![k] === 'string' || typeof first.spec![k] === 'number',
      );
      for (const key of specKeys.slice(0, 3)) {
        columns.push({
          key: `spec.${key}`,
          label: humanizeFieldName(key),
          path: `spec.${key}`,
          type: 'text',
        });
      }
    }

    return columns;
  }

  private resolveField(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }
}