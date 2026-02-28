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
  BarChartConfig,
  CardData,
  DashboardCardSpec,
  ResourceNodeContext,
} from 'models/index';
import { CardDataService } from 'services/dashboard/card-data.service';

interface BarItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

const BAR_COLORS = [
  'var(--sapChart_OrderedColor_1, #5899da)',
  'var(--sapChart_OrderedColor_2, #e8743b)',
  'var(--sapChart_OrderedColor_3, #19a979)',
  'var(--sapChart_OrderedColor_4, #ed4a7b)',
  'var(--sapChart_OrderedColor_5, #945ecf)',
  'var(--sapChart_OrderedColor_6, #13a4b4)',
  'var(--sapChart_OrderedColor_7, #525df4)',
  'var(--sapChart_OrderedColor_8, #bf399e)',
];

@Component({
  selector: 'app-bar-chart-card',
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
        } @else if (bars().length === 0) {
          <p class="empty-message">No data available.</p>
        } @else {
          <div class="chart">
            @for (bar of bars(); track bar.label) {
              <div class="bar-row">
                <span class="bar-label">{{ bar.label }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    [style.width.%]="bar.percentage"
                    [style.background-color]="bar.color"
                  ></div>
                </div>
                <span class="bar-count">{{ bar.count }}</span>
              </div>
            }
          </div>
        }
      </fd-card-content>
    </fd-card>
  `,
  styles: [
    `
      .chart {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .bar-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .bar-label {
        flex: 0 0 auto;
        min-width: 80px;
        max-width: 120px;
        font-size: 0.8125rem;
        color: var(--sapTextColor);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .bar-track {
        flex: 1 1 auto;
        height: 16px;
        background: var(--sapField_Background, #f5f6f7);
        border-radius: 2px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
        min-width: 2px;
      }
      .bar-count {
        flex: 0 0 auto;
        min-width: 24px;
        text-align: right;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--sapTextColor);
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
export class BarChartCardComponent implements OnInit {
  readonly spec = input.required<DashboardCardSpec>();
  readonly context = input.required<ResourceNodeContext>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly cardDataService = inject(CardDataService);

  protected readonly cardData = signal<CardData>({ resources: [], loading: true, error: null });

  protected readonly config = computed<BarChartConfig>(() => {
    return (this.spec().config as BarChartConfig) ?? {};
  });

  protected readonly bars = computed<BarItem[]>(() => {
    const resources = this.cardData().resources;
    if (resources.length === 0) return [];

    const groupBy = this.config().groupBy ?? 'status.phase';
    const counts = new Map<string, number>();

    for (const resource of resources) {
      const value = String(this.resolveField(resource, groupBy) ?? 'Unknown');
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    const maxCount = Math.max(...counts.values());
    let colorIdx = 0;

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        count,
        percentage: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0,
        color: BAR_COLORS[colorIdx++ % BAR_COLORS.length],
      }));
  });

  ngOnInit(): void {
    this.cardDataService
      .fetchCardData(this.spec(), this.context())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => this.cardData.set(data));
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
