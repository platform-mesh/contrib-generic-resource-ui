import { TestBed } from '@angular/core/testing';
import { DashboardPreferencesService } from './dashboard-preferences.service';

describe('DashboardPreferencesService', () => {
  let service: DashboardPreferencesService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [DashboardPreferencesService],
    });
    service = TestBed.inject(DashboardPreferencesService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return empty preferences for unknown workspace', () => {
    const prefs = service.getPreferences('unknown');
    expect(prefs).toEqual({
      hiddenCards: [],
      cardOrder: [],
      pinnedCards: [],
    });
  });

  it('should handle corrupt localStorage data gracefully', () => {
    localStorage.setItem('dashboard-prefs:test', 'not valid json');
    const prefs = service.getPreferences('test');
    expect(prefs).toEqual({
      hiddenCards: [],
      cardOrder: [],
      pinnedCards: [],
    });
  });

  it('should persist and retrieve preferences', () => {
    const prefs = { hiddenCards: ['a'], cardOrder: ['b', 'a'], pinnedCards: ['b'] };
    service.savePreferences('ws1', prefs);
    expect(service.getPreferences('ws1')).toEqual(prefs);
  });

  it('should hide a card', () => {
    service.hideCard('ws1', 'card-1');
    expect(service.getPreferences('ws1').hiddenCards).toEqual(['card-1']);
  });

  it('should not duplicate hidden cards', () => {
    service.hideCard('ws1', 'card-1');
    service.hideCard('ws1', 'card-1');
    expect(service.getPreferences('ws1').hiddenCards).toEqual(['card-1']);
  });

  it('should show a hidden card', () => {
    service.hideCard('ws1', 'card-1');
    service.hideCard('ws1', 'card-2');
    service.showCard('ws1', 'card-1');
    expect(service.getPreferences('ws1').hiddenCards).toEqual(['card-2']);
  });

  it('should pin a card', () => {
    service.pinCard('ws1', 'card-1');
    expect(service.getPreferences('ws1').pinnedCards).toEqual(['card-1']);
  });

  it('should not duplicate pinned cards', () => {
    service.pinCard('ws1', 'card-1');
    service.pinCard('ws1', 'card-1');
    expect(service.getPreferences('ws1').pinnedCards).toEqual(['card-1']);
  });

  it('should unpin a card', () => {
    service.pinCard('ws1', 'card-1');
    service.pinCard('ws1', 'card-2');
    service.unpinCard('ws1', 'card-1');
    expect(service.getPreferences('ws1').pinnedCards).toEqual(['card-2']);
  });

  it('should reorder cards', () => {
    service.reorderCards('ws1', ['c', 'a', 'b']);
    expect(service.getPreferences('ws1').cardOrder).toEqual(['c', 'a', 'b']);
  });

  it('should isolate preferences between workspaces', () => {
    service.hideCard('ws1', 'card-1');
    service.hideCard('ws2', 'card-2');
    expect(service.getPreferences('ws1').hiddenCards).toEqual(['card-1']);
    expect(service.getPreferences('ws2').hiddenCards).toEqual(['card-2']);
  });
});
