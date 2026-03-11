import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/resource-list-view/resource-list-view.component').then(
        (m) => m.ResourceListViewComponent
      ),
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./components/resource-list-view/resource-list-view.component').then(
        (m) => m.ResourceListViewComponent
      ),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/create-resource-page/create-resource-page.component').then(
        (m) => m.CreateResourcePageComponent
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: ':namespace/:name',
    loadComponent: () =>
      import('./components/resource-detail-view/resource-detail-view.component').then(
        (m) => m.ResourceDetailViewComponent
      ),
  },
  {
    path: ':name',
    loadComponent: () =>
      import('./components/resource-detail-view/resource-detail-view.component').then(
        (m) => m.ResourceDetailViewComponent
      ),
  },
];
