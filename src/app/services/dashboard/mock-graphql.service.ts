import { Injectable } from '@angular/core';
import { Observable, delay, interval, of, startWith, switchMap } from 'rxjs';
import { CardResourceDefinition, Resource } from 'models/index';
import { MOCK_RESOURCE_MAP } from './mock-fixtures';

@Injectable({
  providedIn: 'root',
})
export class MockGraphqlService {
  queryResources(resource: CardResourceDefinition): Observable<Resource[]> {
    const key = resource.plural.toLowerCase();
    const resources = MOCK_RESOURCE_MAP[key] ?? [];
    const delayMs = 200 + Math.floor(Math.random() * 300);
    return of(resources).pipe(delay(delayMs));
  }

  subscribeResources(resource: CardResourceDefinition): Observable<Resource[]> {
    return interval(10_000).pipe(
      startWith(0),
      switchMap(() => this.queryResources(resource)),
    );
  }
}
