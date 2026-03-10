import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { ApolloFactory } from 'services/resource/apollo-factory';
import { ResourceNodeContext } from 'models/index';
import { MOCK_DASHBOARD_CARDS } from './mock-dashboard-cards';

describe('DashboardService', () => {
  const mockContext: ResourceNodeContext = {
    token: 'mock-token',
    resourceDefinition: {
      group: 'test',
      version: 'v1',
      kind: 'Test',
      plural: 'tests',
      singular: 'test',
      scope: 'Cluster',
    },
    portalContext: { crdGatewayApiUrl: 'http://localhost:8080/graphql' },
  };

  describe('mock mode', () => {
    let service: DashboardService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          { provide: ApolloFactory, useValue: {} },
          { provide: 'ENV', useValue: { mockGraphql: true } },
        ],
      });
      service = TestBed.inject(DashboardService);
    });

    it('should return mock dashboard cards', async () => {
      const cards = await firstValueFrom(service.fetchCards(mockContext));
      expect(cards.length).toBe(MOCK_DASHBOARD_CARDS.length);
      expect(cards[0].metadata.name).toBe('clusters-count');
      expect(cards[0].spec.type).toBe('count-card');
    });

    it('should return cards with proper labels', async () => {
      const cards = await firstValueFrom(service.fetchCards(mockContext));
      const firstCard = cards[0];
      expect(firstCard.metadata.labels?.['ui.platform-mesh.io/card-id']).toBe('clusters-count');
      expect(firstCard.metadata.labels?.['ui.platform-mesh.io/source']).toBe('operator-registered');
    });
  });

  describe('live mode', () => {
    let service: DashboardService;
    let mockApolloFactory: { apollo: jest.Mock };

    beforeEach(() => {
      mockApolloFactory = {
        apollo: jest.fn(),
      };

      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          { provide: ApolloFactory, useValue: mockApolloFactory },
          { provide: 'ENV', useValue: { mockGraphql: false } },
        ],
      });
      service = TestBed.inject(DashboardService);
    });

    it('should return empty array on query error', async () => {
      const mockApollo = {
        query: jest.fn().mockReturnValue(
          of({ data: null, errors: [{ message: 'Not found' }] }),
        ),
      };
      mockApolloFactory.apollo.mockReturnValue(mockApollo);

      const cards = await firstValueFrom(service.fetchCards(mockContext));
      expect(cards).toEqual([]);
    });

    it('should extract cards from live response', async () => {
      const mockCards = [
        { metadata: { name: 'card-1' }, spec: { type: 'count-card', title: 'Test' } },
      ];
      const mockApollo = {
        query: jest.fn().mockReturnValue(
          of({
            data: {
              ui_platform_mesh_io: {
                v1alpha1: {
                  DashboardCards: { items: mockCards },
                },
              },
            },
          }),
        ),
      };
      mockApolloFactory.apollo.mockReturnValue(mockApollo);

      const cards = await firstValueFrom(service.fetchCards(mockContext));
      expect(cards.length).toBe(1);
      expect(cards[0].metadata.name).toBe('card-1');
    });

    it('should parse Go map[] config strings into objects', async () => {
      const mockCards = [
        {
          metadata: { name: 'card-1' },
          spec: { type: 'bar-chart', title: 'Test', config: 'map[groupBy:status.phase]' },
        },
      ];
      const mockApollo = {
        query: jest.fn().mockReturnValue(
          of({ data: { ui_platform_mesh_io: { v1alpha1: { DashboardCards: { items: mockCards } } } } }),
        ),
      };
      mockApolloFactory.apollo.mockReturnValue(mockApollo);

      const cards = await firstValueFrom(service.fetchCards(mockContext));
      expect(cards[0].spec.config).toEqual({ groupBy: 'status.phase' });
    });

    it('should parse Go map[] config with nested maps', async () => {
      const mockCards = [
        {
          metadata: { name: 'card-2' },
          spec: { type: 'bar-chart', title: 'Test', config: 'map[labels:map[True:Ready False:Failing]]' },
        },
      ];
      const mockApollo = {
        query: jest.fn().mockReturnValue(
          of({ data: { ui_platform_mesh_io: { v1alpha1: { DashboardCards: { items: mockCards } } } } }),
        ),
      };
      mockApolloFactory.apollo.mockReturnValue(mockApollo);

      const cards = await firstValueFrom(service.fetchCards(mockContext));
      expect(cards[0].spec.config).toEqual({ labels: { True: 'Ready', False: 'Failing' } });
    });

    it('should parse Go map[] config with arrays of maps', async () => {
      const mockCards = [
        {
          metadata: { name: 'card-3' },
          spec: {
            type: 'status-table',
            title: 'Test',
            config: 'map[columns:[map[key:name label:Name path:metadata.name type:text] map[key:status label:Status path:status.phase type:status]]]',
          },
        },
      ];
      const mockApollo = {
        query: jest.fn().mockReturnValue(
          of({ data: { ui_platform_mesh_io: { v1alpha1: { DashboardCards: { items: mockCards } } } } }),
        ),
      };
      mockApolloFactory.apollo.mockReturnValue(mockApollo);

      const cards = await firstValueFrom(service.fetchCards(mockContext));
      const config = cards[0].spec.config as any;
      expect(Array.isArray(config.columns)).toBe(true);
      expect(config.columns.length).toBe(2);
      expect(config.columns[0]).toEqual({ key: 'name', label: 'Name', path: 'metadata.name', type: 'text' });
      expect(config.columns[1]).toEqual({ key: 'status', label: 'Status', path: 'status.phase', type: 'status' });
    });

    it('should parse boolean and number values in Go map config', async () => {
      const mockCards = [
        {
          metadata: { name: 'card-4' },
          spec: { type: 'count-card', title: 'Test', config: 'map[icon:employee showStatusBreakdown:false]' },
        },
      ];
      const mockApollo = {
        query: jest.fn().mockReturnValue(
          of({ data: { ui_platform_mesh_io: { v1alpha1: { DashboardCards: { items: mockCards } } } } }),
        ),
      };
      mockApolloFactory.apollo.mockReturnValue(mockApollo);

      const cards = await firstValueFrom(service.fetchCards(mockContext));
      expect(cards[0].spec.config).toEqual({ icon: 'employee', showStatusBreakdown: false });
    });
  });
});
