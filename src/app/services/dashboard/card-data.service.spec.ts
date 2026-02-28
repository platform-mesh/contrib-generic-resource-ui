import { TestBed } from '@angular/core/testing';
import { firstValueFrom, lastValueFrom, of, throwError, toArray } from 'rxjs';
import { CardDataService } from './card-data.service';
import { MockGraphqlService } from './mock-graphql.service';
import { ApolloFactory } from 'services/resource/apollo-factory';
import { DashboardCardSpec, ResourceNodeContext, CardResourceDefinition } from 'models/index';

describe('CardDataService', () => {
  const mockResource: CardResourceDefinition = {
    group: 'core.gardener.cloud',
    version: 'v1beta1',
    kind: 'Shoot',
    plural: 'shoots',
    scope: 'Namespaced',
  };

  const baseSpec: DashboardCardSpec = {
    type: 'count-card',
    title: 'Clusters',
    resource: mockResource,
  };

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
    let service: CardDataService;
    let mockGraphqlService: { queryResources: jest.Mock; subscribeResources: jest.Mock };

    beforeEach(() => {
      mockGraphqlService = { queryResources: jest.fn(), subscribeResources: jest.fn() };

      TestBed.configureTestingModule({
        providers: [
          CardDataService,
          { provide: MockGraphqlService, useValue: mockGraphqlService },
          { provide: ApolloFactory, useValue: {} },
          { provide: 'ENV', useValue: { mockGraphql: true } },
        ],
      });

      service = TestBed.inject(CardDataService);
    });

    it('should emit loading then data', async () => {
      const fakeResources = [{ metadata: { name: 'a' } }, { metadata: { name: 'b' } }];
      mockGraphqlService.queryResources.mockReturnValue(of(fakeResources));

      const emissions = await lastValueFrom(
        service.fetchCardData(baseSpec, mockContext).pipe(toArray()),
      );

      expect(emissions.length).toBe(2);
      expect(emissions[0].loading).toBe(true);
      expect(emissions[0].resources).toEqual([]);
      expect(emissions[1].loading).toBe(false);
      expect(emissions[1].resources).toEqual(fakeResources);
      expect(emissions[1].error).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockGraphqlService.queryResources.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const emissions = await lastValueFrom(
        service.fetchCardData(baseSpec, mockContext).pipe(toArray()),
      );

      // Should emit loading, then error
      expect(emissions.length).toBe(2);
      expect(emissions[0].loading).toBe(true);
      expect(emissions[1].loading).toBe(false);
      expect(emissions[1].error).toContain('Network error');
    });
  });

  describe('live mode', () => {
    let service: CardDataService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          CardDataService,
          { provide: MockGraphqlService, useValue: {} },
          { provide: ApolloFactory, useValue: {} },
          { provide: 'ENV', useValue: { mockGraphql: false } },
        ],
      });

      service = TestBed.inject(CardDataService);
    });

    it('should return error when no dataQuery is configured', async () => {
      const specNoQuery: DashboardCardSpec = { type: 'count-card', title: 'Test' };
      const result = await firstValueFrom(service.fetchCardData(specNoQuery, mockContext));

      expect(result.loading).toBe(false);
      expect(result.error).toBe('No dataQuery configured');
      expect(result.resources).toEqual([]);
    });
  });

  describe('extractItems', () => {
    let service: CardDataService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          CardDataService,
          { provide: MockGraphqlService, useValue: {} },
          { provide: ApolloFactory, useValue: {} },
          { provide: 'ENV', useValue: { mockGraphql: false } },
        ],
      });

      service = TestBed.inject(CardDataService);
    });

    const testCases = [
      {
        name: 'should extract items from direct response',
        data: { shoots: { items: [{ metadata: { name: 'a' } }] } },
        expected: [{ metadata: { name: 'a' } }],
      },
      {
        name: 'should extract items from nested response',
        data: { data: { shoots: { items: [{ metadata: { name: 'b' } }] } } },
        expected: [{ metadata: { name: 'b' } }],
      },
      {
        name: 'should return empty array for null data',
        data: null,
        expected: [],
      },
      {
        name: 'should return empty array when no items found',
        data: { shoots: { count: 5 } },
        expected: [],
      },
    ];

    testCases.forEach(({ name, data, expected }) => {
      it(name, () => {
        const result = (service as any).extractItems(data);
        expect(result).toEqual(expected);
      });
    });
  });
});
