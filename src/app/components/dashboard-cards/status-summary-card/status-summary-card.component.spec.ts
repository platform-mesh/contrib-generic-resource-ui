import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { StatusSummaryCardComponent } from './status-summary-card.component';
import { CardDataService } from 'services/dashboard/card-data.service';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { CardData, DashboardCardSpec, ResourceNodeContext, Resource } from 'models/index';

describe('StatusSummaryCardComponent', () => {
  let component: StatusSummaryCardComponent;
  let fixture: ComponentFixture<StatusSummaryCardComponent>;
  let mockCardDataService: { fetchCardData: jest.Mock };

  const testContext: ResourceNodeContext = {
    token: 'test',
    resourceDefinition: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', singular: 'test', scope: 'Cluster' },
    portalContext: { crdGatewayApiUrl: 'http://localhost/graphql' },
  };

  const resources: Resource[] = [
    { metadata: { name: 'r1' }, status: { conditions: [{ type: 'Ready', status: 'True' }] } },
    { metadata: { name: 'r2' }, status: { conditions: [{ type: 'Ready', status: 'True' }] } },
    { metadata: { name: 'r3' }, status: { phase: 'Failed' } },
    { metadata: { name: 'r4' }, status: { phase: 'Creating' } },
    { metadata: { name: 'r5' } },
  ];

  beforeEach(async () => {
    mockCardDataService = { fetchCardData: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [StatusSummaryCardComponent],
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
    fixture = TestBed.createComponent(StatusSummaryCardComponent);
    fixture.componentRef.setInput('spec', spec);
    fixture.componentRef.setInput('context', testContext);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should group resources by status', () => {
    const spec: DashboardCardSpec = {
      type: 'status-summary',
      title: 'Status',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources, loading: false, error: null });

    const breakdown = component['statusBreakdown']();
    expect(breakdown.find((b) => b.status === 'Ready')?.count).toBe(2);
    expect(breakdown.find((b) => b.status === 'Not Ready')?.count).toBe(1);
    expect(breakdown.find((b) => b.status === 'In Progress')?.count).toBe(1);
    expect(breakdown.find((b) => b.status === 'Unknown')?.count).toBe(1);
  });

  it('should compute correct percentages', () => {
    const spec: DashboardCardSpec = {
      type: 'status-summary',
      title: 'Status',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources, loading: false, error: null });

    const breakdown = component['statusBreakdown']();
    const readyItem = breakdown.find((b) => b.status === 'Ready');
    expect(readyItem?.percentage).toBe(40); // 2/5 = 40%
  });

  it('should show total count', () => {
    const spec: DashboardCardSpec = {
      type: 'status-summary',
      title: 'Status',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources, loading: false, error: null });
    expect(component['totalCount']()).toBe(5);
  });

  it('should handle empty resources', () => {
    const spec: DashboardCardSpec = {
      type: 'status-summary',
      title: 'Status',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources: [], loading: false, error: null });
    expect(component['statusBreakdown']()).toEqual([]);
    expect(component['totalCount']()).toBe(0);
  });

  it('should filter out zero-count buckets', () => {
    const allReady: Resource[] = [
      { metadata: { name: 'r1' }, status: { conditions: [{ type: 'Ready', status: 'True' }] } },
    ];
    const spec: DashboardCardSpec = {
      type: 'status-summary',
      title: 'Status',
      resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
    };
    createComponent(spec, { resources: allReady, loading: false, error: null });

    const breakdown = component['statusBreakdown']();
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].status).toBe('Ready');
  });
});
