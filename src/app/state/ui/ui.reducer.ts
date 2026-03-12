import {
  clearFilters,
  clearNotification,
  closeDeleteConfirmation,
  closeModal,
  closeYamlPanel,
  openCreateModal,
  openDeleteConfirmation,
  openEditModal,
  openYamlPanel,
  setLabelFilter,
  setPagination,
  setSearchFilter,
  setSortColumn,
  showNotification,
  toggleYamlPanel,
} from './ui.actions';
import { createReducer, on } from '@ngrx/store';

export interface UiState {
  searchTerm: string;
  labelSelector: string;
  modalOpen: boolean;
  modalMode: 'create' | 'edit' | null;
  editingResourceName: string | null;
  deleteConfirmationOpen: boolean;
  deletingResourceName: string | null;
  deletingResourceNamespace: string | null;
  yamlPanelOpen: boolean;
  pagination: {
    page: number;
    pageSize: number;
  };
  sort: {
    column: string | null;
    direction: 'asc' | 'desc';
  };
  notification: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null;
}

export const initialState: UiState = {
  searchTerm: '',
  labelSelector: '',
  modalOpen: false,
  modalMode: null,
  editingResourceName: null,
  deleteConfirmationOpen: false,
  deletingResourceName: null,
  deletingResourceNamespace: null,
  yamlPanelOpen: false,
  pagination: {
    page: 1,
    pageSize: 20,
  },
  sort: {
    column: null,
    direction: 'asc',
  },
  notification: null,
};

export const uiReducer = createReducer(
  initialState,
  on(setSearchFilter, (state, { searchTerm }): UiState => ({
    ...state,
    searchTerm,
  })),
  on(setLabelFilter, (state, { labelSelector }): UiState => ({
    ...state,
    labelSelector,
  })),
  on(clearFilters, (state): UiState => ({
    ...state,
    searchTerm: '',
    labelSelector: '',
  })),
  on(openCreateModal, (state): UiState => ({
    ...state,
    modalOpen: true,
    modalMode: 'create',
    editingResourceName: null,
  })),
  on(openEditModal, (state, { resourceName }): UiState => ({
    ...state,
    modalOpen: true,
    modalMode: 'edit',
    editingResourceName: resourceName,
  })),
  on(closeModal, (state): UiState => ({
    ...state,
    modalOpen: false,
    modalMode: null,
    editingResourceName: null,
  })),
  on(openDeleteConfirmation, (state, { resourceName, resourceNamespace }): UiState => ({
    ...state,
    deleteConfirmationOpen: true,
    deletingResourceName: resourceName,
    deletingResourceNamespace: resourceNamespace ?? null,
  })),
  on(closeDeleteConfirmation, (state): UiState => ({
    ...state,
    deleteConfirmationOpen: false,
    deletingResourceName: null,
    deletingResourceNamespace: null,
  })),
  on(openYamlPanel, (state): UiState => ({
    ...state,
    yamlPanelOpen: true,
  })),
  on(closeYamlPanel, (state): UiState => ({
    ...state,
    yamlPanelOpen: false,
  })),
  on(toggleYamlPanel, (state): UiState => ({
    ...state,
    yamlPanelOpen: !state.yamlPanelOpen,
  })),
  on(setPagination, (state, { page, pageSize }): UiState => ({
    ...state,
    pagination: { page, pageSize },
  })),
  on(setSortColumn, (state, { column, direction }): UiState => ({
    ...state,
    sort: { column, direction },
  })),
  on(showNotification, (state, { message, notificationType }): UiState => ({
    ...state,
    notification: { message, type: notificationType },
  })),
  on(clearNotification, (state): UiState => ({
    ...state,
    notification: null,
  }))
);
