import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { BusyIndicatorModule } from '@fundamental-ngx/core/busy-indicator';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { IconComponent } from '@fundamental-ngx/core/icon';
import { PopoverModule } from '@fundamental-ngx/core/popover';
import { ListModule } from '@fundamental-ngx/core/list';
import {
  ILuigiContextTypes,
  LuigiContextServiceImpl,
} from '@luigi-project/client-support-angular';
import { timer, take, filter } from 'rxjs';
import { CardHostComponent } from 'components/dashboard-cards/card-host/card-host.component';
import {
  DashboardCard,
  DashboardPreferences,
  NodeContext,
  ResourceNodeContext,
} from 'models/index';
import { ConfigService } from 'services/config/config.service';
import { DashboardService } from 'services/dashboard/dashboard.service';
import { DashboardPreferencesService } from 'services/dashboard/dashboard-preferences.service';

function getCardId(card: DashboardCard): string {
  return card.metadata.labels?.['ui.platform-mesh.io/card-id'] ?? card.metadata.name;
}

function getCategory(card: DashboardCard): string {
  return card.spec.category ?? card.metadata.labels?.['ui.platform-mesh.io/category'] ?? 'general';
}

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

interface CategoryGroup {
  name: string;
  displayName: string;
  cards: DashboardCard[];
}

@Component({
  selector: 'app-dashboard',
  imports: [
    BusyIndicatorModule,
    ButtonComponent,
    IconComponent,
    PopoverModule,
    ListModule,
    DragDropModule,
    CardHostComponent,
  ],
  template: `
    <div class="dashboard">
      <div class="dashboard-toolbar">
        <h2 class="dashboard-title">Dashboard</h2>
        <div class="dashboard-actions">
          @if (hiddenCount() > 0) {
            <button
              fd-button
              [fdType]="showHidden() ? 'emphasized' : 'transparent'"
              [label]="'Show hidden (' + hiddenCount() + ')'"
              (click)="toggleShowHidden()"
            ></button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="dashboard-loading">
          <fd-busy-indicator [loading]="true" label="Loading dashboard..."></fd-busy-indicator>
        </div>
      } @else if (error()) {
        <div class="dashboard-error">
          <fd-icon glyph="message-warning" class="error-icon"></fd-icon>
          <span>{{ error() }}</span>
        </div>
      } @else if (cardsByCategory().length === 0) {
        <div class="dashboard-empty">
          <fd-icon glyph="dashboard" class="empty-icon"></fd-icon>
          <span>No dashboard cards available</span>
        </div>
      } @else {
        @for (group of cardsByCategory(); track group.name) {
          <section class="category-section">
            <h3 class="category-title">{{ group.displayName }}</h3>
            <div class="card-grid" cdkDropList [cdkDropListData]="group.name" (cdkDropListDropped)="onDrop($event)">
              @for (card of group.cards; track getCardId(card)) {
                <div class="card-wrapper" [class.card-pinned]="isPinned(card)" [class.card-hidden-style]="isHidden(card)" [class.card-wide]="isWide(card)" cdkDrag>
                  <div class="card-drag-placeholder" *cdkDragPlaceholder></div>
                  <div class="card-inner">
                    <div class="card-overlay-actions">
                      @if (isPinned(card)) {
                        <fd-icon glyph="pushpin-on" class="pin-indicator"></fd-icon>
                      }
                      <div class="card-action-buttons">
                        <fd-popover [noArrow]="true" [placement]="'bottom-end'">
                          <fd-popover-control>
                            <button
                              fd-button
                              fdType="transparent"
                              glyph="overflow"
                              class="card-menu-trigger"
                            ></button>
                          </fd-popover-control>
                          <fd-popover-body>
                            <ul fd-list [noBorder]="true">
                              @if (isPinned(card)) {
                                <li fd-list-item (click)="onUnpin(card)">
                                  <span fd-list-title>Unpin</span>
                                </li>
                              } @else {
                                <li fd-list-item (click)="onPin(card)">
                                  <span fd-list-title>Pin to top</span>
                                </li>
                              }
                              @if (isHidden(card)) {
                                <li fd-list-item (click)="onShow(card)">
                                  <span fd-list-title>Show card</span>
                                </li>
                              } @else {
                                <li fd-list-item (click)="onHide(card)">
                                  <span fd-list-title>Hide card</span>
                                </li>
                              }
                            </ul>
                          </fd-popover-body>
                        </fd-popover>
                      </div>
                    </div>
                    <app-card-host [spec]="card.spec" [context]="context()!"></app-card-host>
                  </div>
                </div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [
    `
      .dashboard {
        padding: 1.5rem;
        max-width: 1400px;
        margin: 0 auto;
      }
      .dashboard-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
      }
      .dashboard-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--sapTextColor);
        margin: 0;
      }
      .dashboard-loading,
      .dashboard-error,
      .dashboard-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 3rem 1rem;
        color: var(--sapContent_LabelColor);
      }
      .error-icon {
        font-size: 2rem;
        color: var(--sapNegativeColor);
      }
      .empty-icon {
        font-size: 2rem;
        color: var(--sapContent_IconColor);
      }
      .category-section {
        margin-bottom: 1.5rem;
      }
      .category-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--sapContent_LabelColor);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0 0 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1rem;
      }
      .card-wrapper {
        min-width: 0;
      }
      .card-wrapper.card-wide {
        grid-column: span 2;
      }
      @media (max-width: 700px) {
        .card-wrapper.card-wide {
          grid-column: span 1;
        }
      }
      .card-wrapper.card-pinned .card-inner {
        border-left: 3px solid var(--sapInformativeColor, #0a6ed1);
        border-radius: var(--fdCard_Border_Corner_Radius, 0.75rem);
      }
      .card-wrapper.card-hidden-style .card-inner {
        opacity: 0.5;
      }
      .card-inner {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      :host ::ng-deep app-card-host {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      :host ::ng-deep app-card-host > * {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      :host ::ng-deep fd-card {
        flex: 1;
      }
      :host ::ng-deep .fd-card__header {
        padding: 1rem 1rem 0.5rem;
      }
      :host ::ng-deep .fd-card__content {
        padding: 0 1rem 1rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex: 1;
      }
      .card-overlay-actions {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        z-index: 10;
        pointer-events: none;
      }
      .card-action-buttons {
        pointer-events: all;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      .card-wrapper:hover .card-action-buttons {
        opacity: 1;
      }
      .pin-indicator {
        font-size: 0.75rem;
        color: var(--sapInformativeColor, #0a6ed1);
        pointer-events: none;
      }
      .card-menu-trigger {
        min-width: unset !important;
        min-height: unset !important;
        padding: 0.25rem !important;
      }

      /* CDK Drag & Drop */
      .cdk-drag-preview {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
        border-radius: 4px;
        opacity: 0.9;
      }
      .cdk-drag-animating {
        transition: transform 200ms ease;
      }
      .card-drag-placeholder {
        background: var(--sapField_Background, #f5f6f7);
        border: 2px dashed var(--sapGroup_ContentBorderColor, #d9d9d9);
        border-radius: 4px;
        min-height: 120px;
        transition: transform 200ms ease;
      }
      .card-grid.cdk-drop-list-dragging .card-wrapper:not(.cdk-drag-placeholder) {
        transition: transform 200ms ease;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly luigiContextService = inject(LuigiContextServiceImpl);
  private readonly configService = inject(ConfigService);
  private readonly dashboardService = inject(DashboardService);
  private readonly preferencesService = inject(DashboardPreferencesService);
  private luigiInitialized = false;

  protected readonly allCards = signal<DashboardCard[]>([]);
  protected readonly preferences = signal<DashboardPreferences>({
    hiddenCards: [],
    cardOrder: [],
    pinnedCards: [],
  });
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showHidden = signal(false);
  protected readonly context = signal<ResourceNodeContext | null>(null);

  private readonly workspaceName = computed(() => {
    const ctx = this.context();
    if (!ctx) return 'default';
    const url = ctx.portalContext.crdGatewayApiUrl;
    const match = url.match(/\/([^/]+)\/graphql$/);
    return match?.[1] ?? 'default';
  });

  protected readonly visibleCards = computed(() => {
    const cards = this.allCards();
    const prefs = this.preferences();
    const showAll = this.showHidden();

    const filtered = showAll
      ? cards
      : cards.filter((c) => !prefs.hiddenCards.includes(getCardId(c)));

    return this.sortCards(filtered, prefs);
  });

  protected readonly cardsByCategory = computed<CategoryGroup[]>(() => {
    const cards = this.visibleCards();
    const groups = new Map<string, DashboardCard[]>();

    for (const card of cards) {
      const cat = getCategory(card);
      if (!groups.has(cat)) {
        groups.set(cat, []);
      }
      groups.get(cat)!.push(card);
    }

    return Array.from(groups.entries()).map(([name, groupCards]) => ({
      name,
      displayName: formatCategory(name),
      cards: groupCards,
    }));
  });

  protected readonly hiddenCount = computed(() => {
    const cards = this.allCards();
    const prefs = this.preferences();
    return cards.filter((c) => prefs.hiddenCards.includes(getCardId(c))).length;
  });

  ngOnInit(): void {
    // Try Luigi context first (portal mode)
    this.luigiContextService
      .contextObservable()
      .pipe(
        filter(
          (msg) =>
            msg.contextType === ILuigiContextTypes.INIT ||
            msg.contextType === ILuigiContextTypes.UPDATE
        ),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((msg) => {
        this.luigiInitialized = true;
        const nodeCtx = msg.context as NodeContext;
        const ctx: ResourceNodeContext = {
          token: nodeCtx.token,
          portalContext: nodeCtx.portalContext,
          resourceDefinition: nodeCtx.resourceDefinition ?? {
            group: '',
            version: '',
            kind: '',
            plural: '',
            singular: '',
            scope: 'Cluster',
          },
          accountId: nodeCtx.accountId,
        };
        this.initDashboard(ctx);
      });

    // Fallback to config.json after timeout (standalone mode)
    timer(500)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.luigiInitialized) {
          this.configService
            .loadConfig()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((config) => {
              this.initDashboard(this.configService.toResourceNodeContext(config));
            });
        }
      });
  }

  private initDashboard(ctx: ResourceNodeContext): void {
    this.context.set(ctx);

    const workspace = this.workspaceName();
    this.preferences.set(this.preferencesService.getPreferences(workspace));

    this.dashboardService
      .fetchCards(ctx)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cards) => {
          this.allCards.set(cards);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(String(err));
          this.loading.set(false);
        },
      });
  }

  protected getCardId = getCardId;

  protected isPinned(card: DashboardCard): boolean {
    return this.preferences().pinnedCards.includes(getCardId(card));
  }

  protected isHidden(card: DashboardCard): boolean {
    return this.preferences().hiddenCards.includes(getCardId(card));
  }

  protected isWide(card: DashboardCard): boolean {
    return card.spec.type === 'status-table';
  }

  protected toggleShowHidden(): void {
    this.showHidden.update((v) => !v);
  }

  protected onHide(card: DashboardCard): void {
    const workspace = this.workspaceName();
    const cardId = getCardId(card);
    this.preferencesService.hideCard(workspace, cardId);
    this.preferences.set(this.preferencesService.getPreferences(workspace));
  }

  protected onShow(card: DashboardCard): void {
    const workspace = this.workspaceName();
    const cardId = getCardId(card);
    this.preferencesService.showCard(workspace, cardId);
    this.preferences.set(this.preferencesService.getPreferences(workspace));
  }

  protected onPin(card: DashboardCard): void {
    const workspace = this.workspaceName();
    const cardId = getCardId(card);
    this.preferencesService.pinCard(workspace, cardId);
    this.preferences.set(this.preferencesService.getPreferences(workspace));
  }

  protected onUnpin(card: DashboardCard): void {
    const workspace = this.workspaceName();
    const cardId = getCardId(card);
    this.preferencesService.unpinCard(workspace, cardId);
    this.preferences.set(this.preferencesService.getPreferences(workspace));
  }

  protected onDrop(event: CdkDragDrop<string>): void {
    const cards = this.visibleCards();
    const reordered = [...cards];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);

    const workspace = this.workspaceName();
    const newOrder = reordered.map((c) => getCardId(c));
    this.preferencesService.reorderCards(workspace, newOrder);
    this.preferences.set(this.preferencesService.getPreferences(workspace));
  }

  private sortCards(cards: DashboardCard[], prefs: DashboardPreferences): DashboardCard[] {
    return [...cards].sort((a, b) => {
      const aId = getCardId(a);
      const bId = getCardId(b);
      const aPin = prefs.pinnedCards.includes(aId) ? 0 : 1;
      const bPin = prefs.pinnedCards.includes(bId) ? 0 : 1;

      if (aPin !== bPin) return aPin - bPin;

      const orderA = prefs.cardOrder.indexOf(aId);
      const orderB = prefs.cardOrder.indexOf(bId);
      if (orderA !== -1 && orderB !== -1) return orderA - orderB;
      if (orderA !== -1) return -1;
      if (orderB !== -1) return 1;

      return (a.spec.priority ?? 100) - (b.spec.priority ?? 100);
    });
  }
}
