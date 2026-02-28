import { Injectable } from '@angular/core';
import { DashboardPreferences } from 'models/index';

const STORAGE_PREFIX = 'dashboard-prefs:';

const EMPTY_PREFS: DashboardPreferences = {
  hiddenCards: [],
  cardOrder: [],
  pinnedCards: [],
};

@Injectable({
  providedIn: 'root',
})
export class DashboardPreferencesService {
  getPreferences(workspace: string): DashboardPreferences {
    const raw = localStorage.getItem(this.key(workspace));
    if (!raw) {
      return { ...EMPTY_PREFS, hiddenCards: [], cardOrder: [], pinnedCards: [] };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        hiddenCards: Array.isArray(parsed.hiddenCards) ? parsed.hiddenCards : [],
        cardOrder: Array.isArray(parsed.cardOrder) ? parsed.cardOrder : [],
        pinnedCards: Array.isArray(parsed.pinnedCards) ? parsed.pinnedCards : [],
      };
    } catch {
      return { ...EMPTY_PREFS, hiddenCards: [], cardOrder: [], pinnedCards: [] };
    }
  }

  savePreferences(workspace: string, prefs: DashboardPreferences): void {
    localStorage.setItem(this.key(workspace), JSON.stringify(prefs));
  }

  hideCard(workspace: string, cardId: string): void {
    const prefs = this.getPreferences(workspace);
    if (!prefs.hiddenCards.includes(cardId)) {
      prefs.hiddenCards.push(cardId);
    }
    this.savePreferences(workspace, prefs);
  }

  showCard(workspace: string, cardId: string): void {
    const prefs = this.getPreferences(workspace);
    prefs.hiddenCards = prefs.hiddenCards.filter((id) => id !== cardId);
    this.savePreferences(workspace, prefs);
  }

  pinCard(workspace: string, cardId: string): void {
    const prefs = this.getPreferences(workspace);
    if (!prefs.pinnedCards.includes(cardId)) {
      prefs.pinnedCards.push(cardId);
    }
    this.savePreferences(workspace, prefs);
  }

  unpinCard(workspace: string, cardId: string): void {
    const prefs = this.getPreferences(workspace);
    prefs.pinnedCards = prefs.pinnedCards.filter((id) => id !== cardId);
    this.savePreferences(workspace, prefs);
  }

  reorderCards(workspace: string, cardIds: string[]): void {
    const prefs = this.getPreferences(workspace);
    prefs.cardOrder = cardIds;
    this.savePreferences(workspace, prefs);
  }

  private key(workspace: string): string {
    return `${STORAGE_PREFIX}${workspace}`;
  }
}
