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
import { IconComponent } from '@fundamental-ngx/core/icon';
import {
  CardData,
  CountCardConfig,
  DashboardCardSpec,
  ResourceNodeContext,
  StatusBreakdown,
} from 'models/index';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { CardDataService } from 'services/dashboard/card-data.service';

@Component({
  selector: 'app-count-card',
  imports: [CardModule, BusyIndicatorModule, ObjectStatusModule, IconComponent],
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
          <div class="count-container">
            @if (config().icon) {
              <fd-icon [glyph]="config().icon!" class="count-icon"></fd-icon>
            }
            <span class="count-value">{{ totalCount() }}</span>
            <span class="count-label">{{ spec().title }}</span>
          </div>
          @if (config().showStatusBreakdown && statusBreakdown().length > 0) {
            <div class="breakdown">
              @for (item of statusBreakdown(); track item.status) {
                <div class="breakdown-item">
                  <span class="breakdown-dot" [style.background-color]="item.color"></span>
                  <span class="breakdown-label">{{ item.status }}</span>
                  <span class="breakdown-count">{{ item.count }}</span>
                </div>
              }
            </div>
          }
        }
      </fd-card-content>
    </fd-card>
  `,
  styles: [
    `
      .count-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem 0;
      }
      .count-icon {
        font-size: 1.5rem;
        color: var(--sapContent_IconColor);
        margin-bottom: 0.5rem;
      }
      .count-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--sapTextColor);
        line-height: 1;
      }
      .count-label {
        font-size: 0.8125rem;
        color: var(--sapContent_LabelColor);
        margin-top: 0.25rem;
      }
      .breakdown {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--sapGroup_TitleBorderColor);
        margin-top: 0.75rem;
      }
      .breakdown-item {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.8125rem;
      }
      .breakdown-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .breakdown-label {
        color: var(--sapContent_LabelColor);
      }
      .breakdown-count {
        font-weight: 600;
        color: var(--sapTextColor);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountCardComponent implements OnInit {
  readonly spec = input.required<DashboardCardSpec>();
  readonly context = input.required<ResourceNodeContext>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly cardDataService = inject(CardDataService);
  private readonly readyStatusDetector = inject(ReadyStatusDetectorService);

  protected readonly cardData = signal<CardData>({ resources: [], loading: true, error: null });

  protected readonly config = computed<CountCardConfig>(() => {
    return (this.spec().config as CountCardConfig) ?? {};
  });

  protected readonly totalCount = computed(() => this.cardData().resources.length);

  protected readonly statusBreakdown = computed<StatusBreakdown[]>(() => {
    const resources = this.cardData().resources;
    if (resources.length === 0) return [];

    const counts = new Map<string, number>();
    for (const resource of resources) {
      const status = this.readyStatusDetector.detectReadyStatus(resource);
      const label = status.status;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    const total = resources.length;
    return Array.from(counts.entries()).map(([status, count]) => ({
      status: this.formatStatusLabel(status),
      count,
      percentage: Math.round((count / total) * 100),
      color: this.getStatusColor(status),
    }));
  });

  ngOnInit(): void {
    this.cardDataService
      .fetchCardData(this.spec(), this.context())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => this.cardData.set(data));
  }

  private formatStatusLabel(status: string): string {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'not-ready':
        return 'Not Ready';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Unknown';
    }
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'ready':
        return 'var(--sapPositiveColor)';
      case 'not-ready':
        return 'var(--sapNegativeColor)';
      case 'in-progress':
        return 'var(--sapCriticalColor)';
      default:
        return 'var(--sapNeutralColor)';
    }
  }
}
