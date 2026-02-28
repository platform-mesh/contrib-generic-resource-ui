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
  ListCardConfig,
  Resource,
  ResourceNodeContext,
} from 'models/index';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { ReadyStatusBadgeComponent } from 'components/shared/ready-status-badge/ready-status-badge.component';
import { CardDataService } from 'services/dashboard/card-data.service';

interface ListItem {
  name: string;
  resource: Resource;
}

@Component({
  selector: 'app-list-card',
  imports: [CardModule, BusyIndicatorModule, ObjectStatusModule, ReadyStatusBadgeComponent],
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
        } @else if (visibleItems().length === 0) {
          <p class="empty-message">No resources found.</p>
        } @else {
          <ul class="list-items">
            @for (item of visibleItems(); track item.name) {
              <li class="list-item">
                <span class="item-name">{{ item.name }}</span>
                <app-ready-status-badge
                  [status]="readyStatusDetector.detectReadyStatus(item.resource)"
                ></app-ready-status-badge>
              </li>
            }
          </ul>
          @if (overflowCount() > 0) {
            <p class="overflow-label">+{{ overflowCount() }} more</p>
          }
        }
      </fd-card-content>
    </fd-card>
  `,
  styles: [
    `
      .list-items {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .list-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--sapGroup_ContentBorderColor, #e5e5e5);
      }
      .list-item:last-child {
        border-bottom: none;
      }
      .item-name {
        font-size: 0.875rem;
        color: var(--sapTextColor);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 0.5rem;
      }
      .overflow-label {
        font-size: 0.8125rem;
        color: var(--sapContent_LabelColor);
        text-align: center;
        margin: 0.5rem 0 0;
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
export class ListCardComponent implements OnInit {
  readonly spec = input.required<DashboardCardSpec>();
  readonly context = input.required<ResourceNodeContext>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly cardDataService = inject(CardDataService);
  protected readonly readyStatusDetector = inject(ReadyStatusDetectorService);

  protected readonly cardData = signal<CardData>({ resources: [], loading: true, error: null });

  protected readonly config = computed<ListCardConfig>(() => {
    return (this.spec().config as ListCardConfig) ?? {};
  });

  private readonly maxItems = computed(() => this.config().maxItems ?? 5);
  private readonly nameField = computed(() => this.config().nameField ?? 'metadata.name');

  private readonly allItems = computed<ListItem[]>(() =>
    this.cardData().resources.map((r) => ({
      name: this.resolveField(r, this.nameField()),
      resource: r,
    })),
  );

  protected readonly visibleItems = computed(() =>
    this.allItems().slice(0, this.maxItems()),
  );

  protected readonly overflowCount = computed(() =>
    Math.max(0, this.allItems().length - this.maxItems()),
  );

  ngOnInit(): void {
    this.cardDataService
      .fetchCardData(this.spec(), this.context())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => this.cardData.set(data));
  }

  private resolveField(obj: any, path: string): string {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return '';
      current = current[part];
    }
    return String(current ?? '');
  }
}
