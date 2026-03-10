import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { LuigiContextServiceImpl } from '@luigi-project/client-support-angular';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from 'services/dashboard/dashboard.service';
import { DashboardPreferencesService } from 'services/dashboard/dashboard-preferences.service';
import { ConfigService } from 'services/config/config.service';
import { DashboardCard, ResourceNodeContext } from 'models/index';
import { MOCK_DASHBOARD_CARDS } from 'services/dashboard/mock-dashboard-cards';

let luigiContext$: Subject<any>;

// Mock the Luigi ESM modules to avoid SyntaxError in Jest
jest.mock('@luigi-project/client-support-angular', () => ({
  ILuigiContextTypes: { INIT: 'init', UPDATE: 'update' },
  LuigiContextServiceImpl: class {},
}));
jest.mock('@luigi-project/testing-utilities', () => ({}));

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockDashboardService: { fetchCards: jest.Mock };
  let mockPreferencesService: {
    getPreferences: jest.Mock;
    savePreferences: jest.Mock;
    hideCard: jest.Mock;
    showCard: jest.Mock;
    pinCard: jest.Mock;
    unpinCard: jest.Mock;
    reorderCards: jest.Mock;
  };
  let mockConfigService: {
    loadConfig: jest.Mock;
    toResourceNodeContext: jest.Mock;
  };

  const testContext: ResourceNodeContext = {
    token: 'test-token',
    resourceDefinition: {
      group: 'test',
      version: 'v1',
      kind: 'Test',
      plural: 'tests',
      singular: 'test',
      scope: 'Cluster',
    },
    portalContext: { crdGatewayApiUrl: 'http://localhost/my-workspace/graphql' },
  };

  const luigiNodeContext = {
    token: 'test-token',
    portalContext: { crdGatewayApiUrl: 'http://localhost/my-workspace/graphql' },
  };

  const emptyPrefs = { hiddenCards: [], cardOrder: [], pinnedCards: [] };

  beforeEach(async () => {
    luigiContext$ = new Subject<any>();

    mockDashboardService = {
      fetchCards: jest.fn().mockReturnValue(of(MOCK_DASHBOARD_CARDS)),
    };

    mockPreferencesService = {
      getPreferences: jest.fn().mockReturnValue({ ...emptyPrefs }),
      savePreferences: jest.fn(),
      hideCard: jest.fn(),
      showCard: jest.fn(),
      pinCard: jest.fn(),
      unpinCard: jest.fn(),
      reorderCards: jest.fn(),
    };

    mockConfigService = {
      loadConfig: jest.fn().mockReturnValue(of({ token: 'test-token', portalContext: { crdGatewayApiUrl: 'http://localhost/my-workspace/graphql' } })),
      toResourceNodeContext: jest.fn().mockReturnValue(testContext),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, HttpClientTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: DashboardPreferencesService, useValue: mockPreferencesService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: LuigiContextServiceImpl,
          useValue: {
            contextObservable: jest.fn().mockReturnValue(luigiContext$.asObservable()),
          },
        },
        { provide: 'ENV', useValue: { mockGraphql: true } },
      ],
    })
      .overrideComponent(DashboardComponent, {
        set: {
          template: '<div class="dashboard-test"></div>',
          imports: [],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  /** Emit Luigi INIT context to initialize the dashboard (portal mode) */
  function initViaLuigi() {
    fixture.detectChanges();
    luigiContext$.next({ contextType: 'init', context: luigiNodeContext });
    fixture.detectChanges();
  }

  /** Wait for the 500ms fallback timer (standalone mode) */
  function initViaConfigFallback() {
    return fakeAsync(() => {
      fixture.detectChanges();
      tick(600);
      fixture.detectChanges();
    })();
  }

  it('should create', () => {
    initViaLuigi();
    expect(component).toBeTruthy();
  });

  it('should use Luigi context when available', () => {
    initViaLuigi();
    expect(mockConfigService.loadConfig).not.toHaveBeenCalled();
    expect(mockDashboardService.fetchCards).toHaveBeenCalled();
    expect((component as any).allCards()).toEqual(MOCK_DASHBOARD_CARDS);
    expect((component as any).loading()).toBe(false);
  });

  it('should not call config when Luigi context arrives first', () => {
    initViaLuigi();
    expect(mockConfigService.loadConfig).not.toHaveBeenCalled();
  });

  it('should group cards by category', () => {
    initViaLuigi();
    const groups = (component as any).cardsByCategory();
    const categoryNames = groups.map((g: any) => g.name);
    expect(categoryNames).toContain('infrastructure');
    expect(categoryNames).toContain('services');
    expect(categoryNames).toContain('identity');
    expect(categoryNames).toContain('security');
  });

  it('should sort pinned cards first', () => {
    initViaLuigi();
    (component as any).preferences.set({
      ...emptyPrefs,
      pinnedCards: ['permissions-overview'],
    });
    fixture.detectChanges();

    const visible = (component as any).visibleCards();
    const firstCardId = visible[0]?.metadata?.labels?.['ui.platform-mesh.io/card-id'];
    expect(firstCardId).toBe('permissions-overview');
  });

  it('should hide cards based on preferences', () => {
    initViaLuigi();
    (component as any).preferences.set({
      ...emptyPrefs,
      hiddenCards: ['clusters-count'],
    });
    fixture.detectChanges();

    const visible = (component as any).visibleCards();
    const cardIds = visible.map(
      (c: DashboardCard) => c.metadata.labels?.['ui.platform-mesh.io/card-id']
    );
    expect(cardIds).not.toContain('clusters-count');
  });

  it('should show hidden cards when showHidden is toggled', () => {
    initViaLuigi();
    (component as any).preferences.set({
      ...emptyPrefs,
      hiddenCards: ['clusters-count'],
    });
    (component as any).showHidden.set(true);
    fixture.detectChanges();

    const visible = (component as any).visibleCards();
    const cardIds = visible.map(
      (c: DashboardCard) => c.metadata.labels?.['ui.platform-mesh.io/card-id']
    );
    expect(cardIds).toContain('clusters-count');
  });

  it('should compute hidden count', () => {
    initViaLuigi();
    (component as any).preferences.set({
      ...emptyPrefs,
      hiddenCards: ['clusters-count', 'service-instances-count'],
    });
    fixture.detectChanges();

    expect((component as any).hiddenCount()).toBe(2);
  });

  it('should call preferencesService.hideCard on onHide', () => {
    initViaLuigi();
    const card = MOCK_DASHBOARD_CARDS[0];
    (component as any).onHide(card);
    expect(mockPreferencesService.hideCard).toHaveBeenCalledWith('my-workspace', 'clusters-count');
  });

  it('should call preferencesService.pinCard on onPin', () => {
    initViaLuigi();
    const card = MOCK_DASHBOARD_CARDS[0];
    (component as any).onPin(card);
    expect(mockPreferencesService.pinCard).toHaveBeenCalledWith('my-workspace', 'clusters-count');
  });

  it('should sort by priority when no user ordering', () => {
    initViaLuigi();
    const visible = (component as any).visibleCards();
    const priorities = visible.map((c: DashboardCard) => c.spec.priority ?? 100);
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
    }
  });
});
