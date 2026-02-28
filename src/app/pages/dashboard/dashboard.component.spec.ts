import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from 'services/dashboard/dashboard.service';
import { DashboardPreferencesService } from 'services/dashboard/dashboard-preferences.service';
import { ConfigService } from 'services/config/config.service';
import { DashboardCard, ResourceNodeContext } from 'models/index';
import { MOCK_DASHBOARD_CARDS } from 'services/dashboard/mock-dashboard-cards';

// Mock the Luigi ESM modules to avoid SyntaxError in Jest
jest.mock('@luigi-project/client-support-angular', () => ({
  ILuigiContextTypes: { INIT: 'init', UPDATE: 'update' },
  LuigiContextServiceImpl: class {
    contextObservable = jest.fn().mockReturnValue({ subscribe: jest.fn() });
    getContextAsync = jest.fn();
    getContext = jest.fn();
  },
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

  const emptyPrefs = { hiddenCards: [], cardOrder: [], pinnedCards: [] };

  beforeEach(async () => {
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load config and fetch cards', () => {
    expect(mockConfigService.loadConfig).toHaveBeenCalled();
    expect(mockConfigService.toResourceNodeContext).toHaveBeenCalled();
    expect(mockDashboardService.fetchCards).toHaveBeenCalledWith(testContext);
    expect((component as any).allCards()).toEqual(MOCK_DASHBOARD_CARDS);
    expect((component as any).loading()).toBe(false);
  });

  it('should group cards by category', () => {
    const groups = (component as any).cardsByCategory();
    const categoryNames = groups.map((g: any) => g.name);
    expect(categoryNames).toContain('infrastructure');
    expect(categoryNames).toContain('services');
    expect(categoryNames).toContain('identity');
    expect(categoryNames).toContain('security');
  });

  it('should sort pinned cards first', () => {
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
    (component as any).preferences.set({
      ...emptyPrefs,
      hiddenCards: ['clusters-count', 'service-instances-count'],
    });
    fixture.detectChanges();

    expect((component as any).hiddenCount()).toBe(2);
  });

  it('should call preferencesService.hideCard on onHide', () => {
    const card = MOCK_DASHBOARD_CARDS[0];
    (component as any).onHide(card);
    expect(mockPreferencesService.hideCard).toHaveBeenCalledWith('my-workspace', 'clusters-count');
  });

  it('should call preferencesService.pinCard on onPin', () => {
    const card = MOCK_DASHBOARD_CARDS[0];
    (component as any).onPin(card);
    expect(mockPreferencesService.pinCard).toHaveBeenCalledWith('my-workspace', 'clusters-count');
  });

  it('should sort by priority when no user ordering', () => {
    const visible = (component as any).visibleCards();
    const priorities = visible.map((c: DashboardCard) => c.spec.priority ?? 100);
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
    }
  });
});
