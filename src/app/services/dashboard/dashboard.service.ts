import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, map, of, startWith } from 'rxjs';
import { DashboardCard, ResourceNodeContext } from 'models/index';
import { ApolloFactory } from 'services/resource/apollo-factory';
import { gql } from '@apollo/client/core';
import { MOCK_DASHBOARD_CARDS } from './mock-dashboard-cards';

const DASHBOARD_CARDS_QUERY = gql`
  query ListDashboardCards {
    ui_platform_mesh_io {
      v1alpha1 {
        DashboardCards {
          items {
            metadata {
              name
              uid
              labels
            }
            spec {
              type
              title
              description
              priority
              category
              resource {
                group
                version
                kind
                plural
                scope
              }
              dataQuery
              subscriptionQuery
              config
            }
          }
        }
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apolloFactory = inject(ApolloFactory);
  private env = inject<{ mockGraphql?: boolean }>('ENV' as any);

  fetchCards(context: ResourceNodeContext): Observable<DashboardCard[]> {
    if (this.env.mockGraphql) {
      return this.fetchMock();
    }
    return this.fetchLive(context);
  }

  private fetchMock(): Observable<DashboardCard[]> {
    return of(MOCK_DASHBOARD_CARDS).pipe(delay(300));
  }

  private fetchLive(context: ResourceNodeContext): Observable<DashboardCard[]> {
    const apollo = this.apolloFactory.apollo(context);
    return apollo
      .query<Record<string, any>>({
        query: DASHBOARD_CARDS_QUERY,
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => this.extractCards(result.data)),
        catchError((err) => {
          console.error('[DashboardService] Failed to fetch cards:', err);
          return of([]);
        }),
      );
  }

  private extractCards(data: Record<string, any>): DashboardCard[] {
    return data?.['ui_platform_mesh_io']?.['v1alpha1']?.['DashboardCards']?.['items'] ?? [];
  }
}
