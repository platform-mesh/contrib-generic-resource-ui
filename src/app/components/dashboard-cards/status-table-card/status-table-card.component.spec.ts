import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { StatusTableCardComponent } from './status-table-card.component';
import { CardDataService } from 'services/dashboard/card-data.service';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { CardData, DashboardCardSpec, ResourceNodeContext, Resource } from 'models/index';

describe('StatusTableCardComponent', () => {
  let component: StatusTableCardComponent;
  let fixture: ComponentFixture<StatusTableCardComponent>;
  let mockCardDataService: { fetchCardData: jest.Mock };

  const testContext: ResourceNodeContext = {
    token: 'test',
    resourceDefinition: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', singular: 'test', scope: 'Cluster' },
    portalContext: { crdGatewayApiUrl: 'http://localhost/graphql' },
  };

  const resources: Resource[] = [
    {
      metadata: { name: 'prod-eu', namespace: 'team-a' },
      spec: { provider: 'aws', region: 'eu-central-1' },
      status: { conditions: [{ type: 'Ready', status: 'True' }] },
    },
    {
      metadata: { name: 'dev-us', namespace: 'team-b' },
      spec: { provider: 'gcp', region: 'us-east1' },
      status: { phase: 'Failed' },
    },
  ];

  beforeEach(async () => {
    mockCardDataService = { fetchCardData: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [StatusTableCardComponent],
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
    fixture = TestBed.createComponent(StatusTableCardComponent);
    fixture.componentRef.setInput('spec', spec);
    fixture.componentRef.setInput('context', testContext);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should auto-generate columns from resource shape', () => {
    const spec: DashboardCardSpec = {
      type: 'status-table',
      title: 'Clusters',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Namespaced' },
    };
    createComponent(spec, { resources, loading: false, error: null });

    const columns = component['columns']();
    expect(columns.find((c) => c.key === 'name')).toBeDefined();
    expect(columns.find((c) => c.key === 'namespace')).toBeDefined();
    expect(columns.find((c) => c.key === 'spec.provider')).toBeDefined();
  });

  it('should use configured columns when provided', () => {
    const spec: DashboardCardSpec = {
      type: 'status-table',
      title: 'Clusters',
      config: {
        columns: [
          { key: 'name', label: 'Cluster', path: 'metadata.name', type: 'text' },
          { key: 'region', label: 'Region', path: 'spec.region', type: 'text' },
        ],
      },
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Namespaced' },
    };
    createComponent(spec, { resources, loading: false, error: null });

    const columns = component['columns']();
    expect(columns.length).toBe(2);
    expect(columns[0].label).toBe('Cluster');
    expect(columns[1].label).toBe('Region');
  });

  it('should create rows with resolved cell values', () => {
    const spec: DashboardCardSpec = {
      type: 'status-table',
      title: 'Clusters',
      config: {
        columns: [
          { key: 'name', label: 'Name', path: 'metadata.name', type: 'text' },
        ],
      },
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Namespaced' },
    };
    createComponent(spec, { resources, loading: false, error: null });

    const rows = component['rows']();
    expect(rows.length).toBe(2);
    expect(rows[0].cells['name']).toBe('prod-eu');
    expect(rows[1].cells['name']).toBe('dev-us');
  });

  it('should handle loading state', () => {
    const spec: DashboardCardSpec = {
      type: 'status-table',
      title: 'Clusters',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Namespaced' },
    };
    createComponent(spec, { resources: [], loading: true, error: null });
    expect(component['cardData']().loading).toBe(true);
  });

  it('should handle error state', () => {
    const spec: DashboardCardSpec = {
      type: 'status-table',
      title: 'Clusters',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Namespaced' },
    };
    createComponent(spec, { resources: [], loading: false, error: 'Network error' });
    expect(component['cardData']().error).toBe('Network error');
  });

  it('should handle empty resources', () => {
    const spec: DashboardCardSpec = {
      type: 'status-table',
      title: 'Clusters',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Namespaced' },
    };
    createComponent(spec, { resources: [], loading: false, error: null });
    expect(component['rows']().length).toBe(0);
    expect(component['columns']().length).toBe(0);
  });
});
