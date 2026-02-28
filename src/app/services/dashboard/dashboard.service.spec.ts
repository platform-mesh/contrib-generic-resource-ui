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
  });
});
