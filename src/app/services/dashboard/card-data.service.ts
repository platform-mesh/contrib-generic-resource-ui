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
    return this.findItems(data, 5);
  }

  /** Recursively walk the response tree to find the first `items` array. */
  private findItems(obj: Record<string, any>, depth: number): any[] {
    if (depth <= 0 || !obj || typeof obj !== 'object') return [];
    if (Array.isArray(obj['items'])) return obj['items'];
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const found = this.findItems(value as Record<string, any>, depth - 1);
        if (found.length > 0) return found;
      }
    }
    return [];
  }
}
