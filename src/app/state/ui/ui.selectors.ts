import { UiState } from './ui.reducer';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const selectUiState = createFeatureSelector<UiState>('ui');

export const selectSearchTerm = createSelector(
  selectUiState,
  (state) => state.searchTerm
);

export const selectLabelSelector = createSelector(
  selectUiState,
  (state) => state.labelSelector
);

export const selectModalOpen = createSelector(
  selectUiState,
  (state) => state.modalOpen
);

export const selectModalMode = createSelector(
  selectUiState,
  (state) => state.modalMode
);

export const selectEditingResourceName = createSelector(
  selectUiState,
  (state) => state.editingResourceName
);

export const selectDeleteConfirmationOpen = createSelector(
  selectUiState,
  (state) => state.deleteConfirmationOpen
);

export const selectDeletingResourceName = createSelector(
  selectUiState,
  (state) => state.deletingResourceName
);

export const selectDeletingResourceNamespace = createSelector(
  selectUiState,
  (state) => state.deletingResourceNamespace
);

export const selectYamlPanelOpen = createSelector(
  selectUiState,
  (state) => state.yamlPanelOpen
);

export const selectPagination = createSelector(
  selectUiState,
  (state) => state.pagination
);

export const selectSort = createSelector(
  selectUiState,
  (state) => state.sort
);

export const selectNotification = createSelector(
  selectUiState,
  (state) => state.notification
);

export const selectHasActiveFilters = createSelector(
  selectSearchTerm,
  selectLabelSelector,
  (searchTerm, labelSelector) => !!searchTerm || !!labelSelector
);
