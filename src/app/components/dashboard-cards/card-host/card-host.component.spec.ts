import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { CardHostComponent } from './card-host.component';
import { CardDataService } from 'services/dashboard/card-data.service';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { DashboardCardSpec, DashboardCardType, ResourceNodeContext } from 'models/index';

describe('CardHostComponent', () => {
  let component: CardHostComponent;
  let fixture: ComponentFixture<CardHostComponent>;

  const testContext: ResourceNodeContext = {
    token: 'test',
    resourceDefinition: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', singular: 'test', scope: 'Cluster' },
    portalContext: { crdGatewayApiUrl: 'http://localhost/graphql' },
  };

  const mockCardDataService = {
    fetchCardData: jest.fn().mockReturnValue(of({ resources: [], loading: false, error: null })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardHostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CardDataService, useValue: mockCardDataService },
        { provide: 'ENV', useValue: { mockGraphql: true } },
        ReadyStatusDetectorService,
      ],
    }).compileComponents();
  });

  const cardTypes: DashboardCardType[] = ['count-card', 'list', 'status-summary', 'status-table', 'bar-chart'];

  cardTypes.forEach((type) => {
    it(`should render without error for type "${type}"`, () => {
      const spec: DashboardCardSpec = {
        type,
        title: `Test ${type}`,
        resource: { group: 'test', version: 'v1', kind: 'Test', plural: 'tests', scope: 'Cluster' },
      };

      fixture = TestBed.createComponent(CardHostComponent);
      fixture.componentRef.setInput('spec', spec);
      fixture.componentRef.setInput('context', testContext);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });
  });
});
