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
import {
  CardData,
  DashboardCardSpec,
  ResourceNodeContext,
  StatusBreakdown,
  StatusSummaryConfig,
} from 'models/index';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { CardDataService } from 'services/dashboard/card-data.service';

@Component({
  selector: 'app-status-summary-card',
  imports: [CardModule, BusyIndicatorModule, ObjectStatusModule],
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
        } @else {
          <div class="summary-grid">
            @for (item of statusBreakdown(); track item.status) {
              <div class="summary-tile">
                <span class="tile-count" [style.color]="item.color">{{ item.count }}</span>
                <span class="tile-label">{{ item.status }}</span>
                @if (showPercentages()) {
                  <span class="tile-pct">{{ item.percentage }}%</span>
                }
              </div>
            }
          </div>
          <div class="total-row">
            <span class="total-label">Total</span>
            <span class="total-value">{{ totalCount() }}</span>
          </div>
        }
      </fd-card-content>
    </fd-card>
  `,
  styles: [
    `
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
      .summary-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.75rem 0.5rem;
        border: 1px solid var(--sapGroup_ContentBorderColor, #e5e5e5);
        border-radius: 4px;
      }
      .tile-count {
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1;
      }
      .tile-label {
        font-size: 0.75rem;
        color: var(--sapContent_LabelColor);
        margin-top: 0.25rem;
      }
      .tile-pct {
        font-size: 0.6875rem;
        color: var(--sapContent_LabelColor);
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 0.75rem;
        margin-top: 0.75rem;
        border-top: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .total-label {
        font-size: 0.8125rem;
        color: var(--sapContent_LabelColor);
      }
      .total-value {
        font-size: 1rem;
        font-weight: 600;
        color: var(--sapTextColor);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusSummaryCardComponent implements OnInit {
  readonly spec = input.required<DashboardCardSpec>();
  readonly context = input.required<ResourceNodeContext>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly cardDataService = inject(CardDataService);
  private readonly readyStatusDetector = inject(ReadyStatusDetectorService);

  protected readonly cardData = signal<CardData>({ resources: [], loading: true, error: null });

  protected readonly config = computed<StatusSummaryConfig>(() => {
    return (this.spec().config as StatusSummaryConfig) ?? {};
  });

  protected readonly showPercentages = computed(() => this.config().showPercentages ?? true);

  protected readonly totalCount = computed(() => this.cardData().resources.length);

  protected readonly statusBreakdown = computed<StatusBreakdown[]>(() => {
    const resources = this.cardData().resources;
    if (resources.length === 0) return [];

    const buckets: Record<string, number> = {
      ready: 0,
      'not-ready': 0,
      'in-progress': 0,
      unknown: 0,
    };

    for (const resource of resources) {
      const status = this.readyStatusDetector.detectReadyStatus(resource);
      buckets[status.status] = (buckets[status.status] ?? 0) + 1;
    }

    const total = resources.length;
    const colorMap: Record<string, string> = {
      ready: 'var(--sapPositiveColor)',
      'not-ready': 'var(--sapNegativeColor)',
      'in-progress': 'var(--sapCriticalColor)',
      unknown: 'var(--sapNeutralColor)',
    };
    const labelMap: Record<string, string> = {
      ready: 'Ready',
      'not-ready': 'Not Ready',
      'in-progress': 'In Progress',
      unknown: 'Unknown',
    };

    return Object.entries(buckets)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        status: labelMap[status] ?? status,
        count,
        percentage: Math.round((count / total) * 100),
        color: colorMap[status] ?? 'var(--sapNeutralColor)',
      }));
  });

  ngOnInit(): void {
    this.cardDataService
      .fetchCardData(this.spec(), this.context())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => this.cardData.set(data));
  }
}
