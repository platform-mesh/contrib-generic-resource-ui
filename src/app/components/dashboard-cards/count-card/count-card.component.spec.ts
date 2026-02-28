import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { CountCardComponent } from './count-card.component';
import { CardDataService } from 'services/dashboard/card-data.service';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { CardData, DashboardCardSpec, ResourceNodeContext, Resource } from 'models/index';

describe('CountCardComponent', () => {
  let component: CountCardComponent;
  let fixture: ComponentFixture<CountCardComponent>;
  let mockCardDataService: { fetchCardData: jest.Mock };

  const testSpec: DashboardCardSpec = {
    type: 'count-card',
    title: 'Clusters',
    config: { showStatusBreakdown: true, icon: 'cloud' },
    resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
  };

  const testContext: ResourceNodeContext = {
    token: 'test',
    resourceDefinition: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', singular: 'test', scope: 'Cluster' },
    portalContext: { crdGatewayApiUrl: 'http://localhost/graphql' },
  };

  const readyResource: Resource = {
    metadata: { name: 'r1' },
    status: { conditions: [{ type: 'Ready', status: 'True' }] },
  };
  const failedResource: Resource = {
    metadata: { name: 'r2' },
    status: { phase: 'Failed' },
  };

  beforeEach(async () => {
    mockCardDataService = { fetchCardData: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [CountCardComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CardDataService, useValue: mockCardDataService },
        { provide: 'ENV', useValue: { mockGraphql: true } },
        ReadyStatusDetectorService,
      ],
    }).compileComponents();
  });

  function createComponent(data: CardData): void {
    mockCardDataService.fetchCardData.mockReturnValue(of(data));
    fixture = TestBed.createComponent(CountCardComponent);
    fixture.componentRef.setInput('spec', testSpec);
    fixture.componentRef.setInput('context', testContext);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should display total count', () => {
    createComponent({ resources: [readyResource, failedResource], loading: false, error: null });
    expect(component['totalCount']()).toBe(2);
  });

  it('should show loading state', () => {
    createComponent({ resources: [], loading: true, error: null });
    expect(component['cardData']().loading).toBe(true);
  });

  it('should show error state', () => {
    createComponent({ resources: [], loading: false, error: 'Network error' });
    expect(component['cardData']().error).toBe('Network error');
  });

  it('should compute status breakdown', () => {
    createComponent({ resources: [readyResource, failedResource], loading: false, error: null });
    const breakdown = component['statusBreakdown']();
    expect(breakdown.length).toBeGreaterThan(0);
    const readyItem = breakdown.find((b) => b.status === 'Ready');
    const notReadyItem = breakdown.find((b) => b.status === 'Not Ready');
    expect(readyItem?.count).toBe(1);
    expect(notReadyItem?.count).toBe(1);
  });

  it('should return empty breakdown for empty resources', () => {
    createComponent({ resources: [], loading: false, error: null });
    expect(component['statusBreakdown']()).toEqual([]);
  });
});
