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
    const items: any[] = data?.['ui_platform_mesh_io']?.['v1alpha1']?.['DashboardCards']?.['items'] ?? [];
    return items.map((item) => ({
      ...item,
      spec: {
        ...item.spec,
        config: this.parseConfig(item.spec?.config),
      },
    }));
  }

  /**
   * Parse the config field which may arrive as a Go map[...] string
   * from the gateway instead of a proper JSON object.
   */
  private parseConfig(config: any): any {
    if (!config || typeof config !== 'string') return config;
    // Go serializes maps as "map[key1:value1 key2:value2]" or nested "map[key:map[...]]"
    // Try JSON parse first in case gateway is fixed later
    try {
      return JSON.parse(config);
    } catch {
      return this.parseGoValue(config);
    }
  }

  private parseGoValue(str: string): any {
    if (str.startsWith('map[')) return this.parseGoMap(str);
    if (str.startsWith('[') && str.endsWith(']')) return this.parseGoArray(str);
    if (str === 'true') return true;
    if (str === 'false') return false;
    const num = Number(str);
    if (str.length > 0 && !isNaN(num)) return num;
    return str;
  }

  private parseGoMap(str: string): Record<string, any> {
    if (!str.startsWith('map[')) return { _raw: str };
    const inner = str.slice(4, -1); // strip "map[" and "]"
    const result: Record<string, any> = {};
    let i = 0;
    while (i < inner.length) {
      const colonIdx = inner.indexOf(':', i);
      if (colonIdx === -1) break;
      const key = inner.slice(i, colonIdx);
      i = colonIdx + 1;
      const { value, end } = this.parseGoToken(inner, i);
      result[key] = this.parseGoValue(value);
      i = end;
      if (i < inner.length && inner[i] === ' ') i++; // skip space separator
    }
    return result;
  }

  private parseGoArray(str: string): any[] {
    const inner = str.slice(1, -1); // strip "[" and "]"
    if (inner.length === 0) return [];
    const items: any[] = [];
    let i = 0;
    while (i < inner.length) {
      const { value, end } = this.parseGoToken(inner, i);
      items.push(this.parseGoValue(value));
      i = end;
      if (i < inner.length && inner[i] === ' ') i++;
    }
    return items;
  }

  /** Extract the next token (map[...], [...], or plain value) starting at pos. */
  private parseGoToken(str: string, pos: number): { value: string; end: number } {
    if (str.startsWith('map[', pos) || str[pos] === '[') {
      // Bracketed value — find matching close
      let depth = 0;
      let j = pos;
      for (; j < str.length; j++) {
        if (str[j] === '[') depth++;
        if (str[j] === ']') { depth--; if (depth === 0) { j++; break; } }
      }
      return { value: str.slice(pos, j), end: j };
    }
    // Plain value — up to next space or end
    const spaceIdx = str.indexOf(' ', pos);
    const end = spaceIdx === -1 ? str.length : spaceIdx;
    return { value: str.slice(pos, end), end };
  }
}
