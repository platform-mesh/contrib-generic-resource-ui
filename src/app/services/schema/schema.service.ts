import { INTROSPECT_TYPE_QUERY } from './introspection.queries';
import { Injectable, inject } from '@angular/core';
import { IntrospectionResult, IntrospectionType, ResourceNodeContext } from 'models/index';
import { Observable, map } from 'rxjs';
import { ApolloFactory } from 'services/resource/apollo-factory';

@Injectable({
  providedIn: 'root',
})
export class SchemaService {
  private apolloFactory = inject(ApolloFactory);

  introspectType(
    typeName: string,
    context: ResourceNodeContext,
    readFromParentKcpPath = false
  ): Observable<IntrospectionType | null> {
    return this.apolloFactory
      .apollo(context, readFromParentKcpPath)
      .query<IntrospectionResult>({
        query: INTROSPECT_TYPE_QUERY,
        variables: { typeName },
        fetchPolicy: 'cache-first',
      })
      .pipe(map((result) => result.data?.__type ?? null));
  }

  introspectMultipleTypes(
    typeNames: string[],
    context: ResourceNodeContext
  ): Observable<Map<string, IntrospectionType | null>> {
    const queries = typeNames.map((typeName) =>
      this.introspectType(typeName, context)
    );

    return new Observable((subscriber) => {
      const results = new Map<string, IntrospectionType | null>();
      let completed = 0;

      queries.forEach((query, index) => {
        query.subscribe({
          next: (result) => {
            results.set(typeNames[index], result);
            completed++;
            if (completed === queries.length) {
              subscriber.next(results);
              subscriber.complete();
            }
          },
          error: (err) => subscriber.error(err),
        });
      });
    });
  }
}
