import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { CardData, DashboardCardSpec, ResourceNodeContext } from 'models/index';
import { ApolloFactory } from 'services/resource/apollo-factory';
import { MockGraphqlService } from './mock-graphql.service';
import { gql } from '@apollo/client/core';

@Injectable({
  providedIn: 'root',
})
export class CardDataService {
  private apolloFactory = inject(ApolloFactory);
  private mockGraphql = inject(MockGraphqlService);
  private env = inject<{ mockGraphql?: boolean }>('ENV' as any);

  fetchCardData(spec: DashboardCardSpec, context: ResourceNodeContext): Observable<CardData> {
    if (this.env.mockGraphql && spec.resource) {
      return this.fetchMock(spec);
    }
    return this.fetchLive(spec, context);
  }

  private fetchMock(spec: DashboardCardSpec): Observable<CardData> {
    return this.mockGraphql.queryResources(spec.resource!).pipe(
      map((resources) => ({
        resources,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      })),
      startWith({ resources: [], loading: true, error: null }),
      catchError((err) =>
        of({ resources: [], loading: false, error: String(err), lastUpdated: new Date() }),
      ),
    );
  }

  private fetchLive(spec: DashboardCardSpec, context: ResourceNodeContext): Observable<CardData> {
    if (!spec.dataQuery) {
      return of({ resources: [], loading: false, error: 'No dataQuery configured' });
    }

    const apollo = this.apolloFactory.apollo(context);
    return apollo
      .query<Record<string, any>>({ query: gql`${spec.dataQuery}` })
      .pipe(
        map((result) => ({
          resources: this.extractItems(result.data),
          loading: false,
          error: null,
          lastUpdated: new Date(),
        })),
        startWith({ resources: [], loading: true, error: null }),
        catchError((err) =>
          of({ resources: [], loading: false, error: String(err), lastUpdated: new Date() }),
        ),
      );
  }

  private extractItems(data: Record<string, any>): any[] {
    if (!data) return [];
    // Walk the response tree to find the first items array
    for (const value of Object.values(data)) {
      if (value && typeof value === 'object') {
        if (Array.isArray(value.items)) {
          return value.items;
        }
        // One level deeper
        for (const nested of Object.values(value)) {
          if (nested && typeof nested === 'object' && Array.isArray((nested as any).items)) {
            return (nested as any).items;
          }
        }
      }
    }
    return [];
  }
}
