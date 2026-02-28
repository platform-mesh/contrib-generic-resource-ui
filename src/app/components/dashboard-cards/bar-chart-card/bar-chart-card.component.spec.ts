import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { BarChartCardComponent } from './bar-chart-card.component';
import { CardDataService } from 'services/dashboard/card-data.service';
import { CardData, DashboardCardSpec, ResourceNodeContext, Resource } from 'models/index';

describe('BarChartCardComponent', () => {
  let component: BarChartCardComponent;
  let fixture: ComponentFixture<BarChartCardComponent>;
  let mockCardDataService: { fetchCardData: jest.Mock };

  const testContext: ResourceNodeContext = {
    token: 'test',
    resourceDefinition: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', singular: 'test', scope: 'Cluster' },
    portalContext: { crdGatewayApiUrl: 'http://localhost/graphql' },
  };

  const resources: Resource[] = [
    { metadata: { name: 'r1' }, status: { phase: 'Running' } },
    { metadata: { name: 'r2' }, status: { phase: 'Running' } },
    { metadata: { name: 'r3' }, status: { phase: 'Running' } },
    { metadata: { name: 'r4' }, status: { phase: 'Failed' } },
    { metadata: { name: 'r5' }, status: { phase: 'Creating' } },
  ];

  beforeEach(async () => {
    mockCardDataService = { fetchCardData: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [BarChartCardComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CardDataService, useValue: mockCardDataService },
        { provide: 'ENV', useValue: { mockGraphql: true } },
      ],
    }).compileComponents();
  });

  function createComponent(spec: DashboardCardSpec, data: CardData): void {
    mockCardDataService.fetchCardData.mockReturnValue(of(data));
    fixture = TestBed.createComponent(BarChartCardComponent);
    fixture.componentRef.setInput('spec', spec);
    fixture.componentRef.setInput('context', testContext);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should group by default status.phase', () => {
    const spec: DashboardCardSpec = {
      type: 'bar-chart',
      title: 'Phase Distribution',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources, loading: false, error: null });

    const bars = component['bars']();
    expect(bars.length).toBe(3);
    expect(bars[0].label).toBe('Running');
    expect(bars[0].count).toBe(3);
    expect(bars[0].percentage).toBe(100); // max is 3, so 3/3 = 100%
    expect(bars[1].count).toBe(1);
  });

  it('should use custom groupBy field', () => {
    const spec: DashboardCardSpec = {
      type: 'bar-chart',
      title: 'By Provider',
      config: { groupBy: 'spec.provider' },
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    const providerResources: Resource[] = [
      { metadata: { name: 'r1' }, spec: { provider: 'aws' } },
      { metadata: { name: 'r2' }, spec: { provider: 'aws' } },
      { metadata: { name: 'r3' }, spec: { provider: 'gcp' } },
    ];
    createComponent(spec, { resources: providerResources, loading: false, error: null });

    const bars = component['bars']();
    expect(bars.length).toBe(2);
    expect(bars[0].label).toBe('aws');
    expect(bars[0].count).toBe(2);
  });

  it('should sort bars by count descending', () => {
    const spec: DashboardCardSpec = {
      type: 'bar-chart',
      title: 'Distribution',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources, loading: false, error: null });

    const bars = component['bars']();
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i - 1].count).toBeGreaterThanOrEqual(bars[i].count);
    }
  });

  it('should handle missing field with "Unknown" label', () => {
    const spec: DashboardCardSpec = {
      type: 'bar-chart',
      title: 'Distribution',
      config: { groupBy: 'spec.missing' },
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources, loading: false, error: null });

    const bars = component['bars']();
    expect(bars.length).toBe(1);
    expect(bars[0].label).toBe('Unknown');
    expect(bars[0].count).toBe(5);
  });

  it('should handle empty resources', () => {
    const spec: DashboardCardSpec = {
      type: 'bar-chart',
      title: 'Distribution',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources: [], loading: false, error: null });
    expect(component['bars']()).toEqual([]);
  });

  it('should handle loading state', () => {
    const spec: DashboardCardSpec = {
      type: 'bar-chart',
      title: 'Distribution',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources: [], loading: true, error: null });
    expect(component['cardData']().loading).toBe(true);
  });

  it('should assign unique colors to bars', () => {
    const spec: DashboardCardSpec = {
      type: 'bar-chart',
      title: 'Distribution',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources, loading: false, error: null });

    const bars = component['bars']();
    const colors = bars.map((b) => b.color);
    const unique = new Set(colors);
    expect(unique.size).toBe(colors.length);
  });
});
