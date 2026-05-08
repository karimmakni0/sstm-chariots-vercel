import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'companies', loadComponent: () => import('./features/companies/company-list/company-list.component').then(m => m.CompanyListComponent) },
      { path: 'companies/new', loadComponent: () => import('./features/companies/company-form/company-form.component').then(m => m.CompanyFormComponent) },
      { path: 'companies/:id/edit', loadComponent: () => import('./features/companies/company-form/company-form.component').then(m => m.CompanyFormComponent) },
      { path: 'companies/:id', loadComponent: () => import('./features/companies/company-detail/company-detail.component').then(m => m.CompanyDetailComponent) },
      { path: 'invoices', loadComponent: () => import('./features/invoices/invoice.component').then(m => m.InvoiceComponent) },
      { path: 'lavage', loadComponent: () => import('./features/lavages/lavage.component').then(m => m.LavageComponent) },
      { path: 'trash', loadComponent: () => import('./features/trash/trash.component').then(m => m.TrashComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
