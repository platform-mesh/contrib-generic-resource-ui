import { firstValueFrom } from 'rxjs';
import { MockGraphqlService } from './mock-graphql.service';
import { CardResourceDefinition } from 'models/index';
import { MOCK_RESOURCE_MAP } from './mock-fixtures';

describe('MockGraphqlService', () => {
  let service: MockGraphqlService;

  beforeEach(() => {
    service = new MockGraphqlService();
  });

  const shootResource: CardResourceDefinition = {
    group: 'core.gardener.cloud',
    version: 'v1beta1',
    kind: 'Shoot',
    plural: 'shoots',
    scope: 'Namespaced',
  };

  const unknownResource: CardResourceDefinition = {
    group: 'example.io',
    version: 'v1',
    kind: 'Unknown',
    plural: 'unknowns',
    scope: 'Cluster',
  };

  describe('queryResources', () => {
    it('should return matching mock resources', async () => {
      const result = await firstValueFrom(service.queryResources(shootResource));
      expect(result).toEqual(MOCK_RESOURCE_MAP['shoots']);
      expect(result.length).toBe(5);
    });

    it('should return empty array for unknown resource', async () => {
      const result = await firstValueFrom(service.queryResources(unknownResource));
      expect(result).toEqual([]);
    });

    it('should match plural case-insensitively', async () => {
      const upper: CardResourceDefinition = { ...shootResource, plural: 'Shoots' };
      const result = await firstValueFrom(service.queryResources(upper));
      expect(result.length).toBe(5);
    });
  });

  describe('subscribeResources', () => {
    it('should emit resources immediately', async () => {
      const result = await firstValueFrom(service.subscribeResources(shootResource));
      expect(result.length).toBe(5);
    });
  });
});
