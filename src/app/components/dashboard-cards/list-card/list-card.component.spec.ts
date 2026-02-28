import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { ListCardComponent } from './list-card.component';
import { CardDataService } from 'services/dashboard/card-data.service';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { CardData, DashboardCardSpec, ResourceNodeContext, Resource } from 'models/index';

describe('ListCardComponent', () => {
  let component: ListCardComponent;
  let fixture: ComponentFixture<ListCardComponent>;
  let mockCardDataService: { fetchCardData: jest.Mock };

  const testContext: ResourceNodeContext = {
    token: 'test',
    resourceDefinition: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', singular: 'test', scope: 'Cluster' },
    portalContext: { crdGatewayApiUrl: 'http://localhost/graphql' },
  };

  function makeResources(count: number): Resource[] {
    return Array.from({ length: count }, (_, i) => ({
      metadata: { name: `resource-${i + 1}` },
      status: { conditions: [{ type: 'Ready', status: 'True' }] },
    }));
  }

  beforeEach(async () => {
    mockCardDataService = { fetchCardData: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ListCardComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CardDataService, useValue: mockCardDataService },
        { provide: 'ENV', useValue: { mockGraphql: true } },
        ReadyStatusDetectorService,
      ],
    }).compileComponents();
  });

  function createComponent(spec: DashboardCardSpec, data: CardData): void {
    mockCardDataService.fetchCardData.mockReturnValue(of(data));
    fixture = TestBed.createComponent(ListCardComponent);
    fixture.componentRef.setInput('spec', spec);
    fixture.componentRef.setInput('context', testContext);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should limit visible items to maxItems', () => {
    const spec: DashboardCardSpec = {
      type: 'list',
      title: 'Resources',
      config: { maxItems: 3 },
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources: makeResources(7), loading: false, error: null });

    expect(component['visibleItems']().length).toBe(3);
    expect(component['overflowCount']()).toBe(4);
  });

  it('should default maxItems to 5', () => {
    const spec: DashboardCardSpec = {
      type: 'list',
      title: 'Resources',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources: makeResources(10), loading: false, error: null });

    expect(component['visibleItems']().length).toBe(5);
    expect(component['overflowCount']()).toBe(5);
  });

  it('should show zero overflow when items fit', () => {
    const spec: DashboardCardSpec = {
      type: 'list',
      title: 'Resources',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources: makeResources(3), loading: false, error: null });

    expect(component['visibleItems']().length).toBe(3);
    expect(component['overflowCount']()).toBe(0);
  });

  it('should resolve custom nameField', () => {
    const spec: DashboardCardSpec = {
      type: 'list',
      title: 'Resources',
      config: { nameField: 'spec.displayName' },
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    const resources: Resource[] = [
      { metadata: { name: 'r1' }, spec: { displayName: 'My Resource' } },
    ];
    createComponent(spec, { resources, loading: false, error: null });

    expect(component['visibleItems']()[0].name).toBe('My Resource');
  });

  it('should handle loading state', () => {
    const spec: DashboardCardSpec = {
      type: 'list',
      title: 'Resources',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources: [], loading: true, error: null });
    expect(component['cardData']().loading).toBe(true);
  });

  it('should handle error state', () => {
    const spec: DashboardCardSpec = {
      type: 'list',
      title: 'Resources',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources: [], loading: false, error: 'Fetch failed' });
    expect(component['cardData']().error).toBe('Fetch failed');
  });
});
