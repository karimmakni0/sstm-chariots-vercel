import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">
      <div class="sidebar__brand">
        <img class="sidebar__logo" src="assets/logo.jpg" alt="S.S.T.M logo" />
        @if (!collapsed) { <span class="sidebar__title">S.S.T.M</span> }
      </div>
      <nav class="sidebar__nav">
        @for (item of navItems; track item.route) {
          <a class="sidebar__link" [routerLink]="item.route" routerLinkActive="active">
            <span class="material-icons">{{ item.icon }}</span>
            @if (!collapsed) { <span>{{ item.label }}</span> }
          </a>
        }
      </nav>
      <button class="sidebar__toggle" (click)="toggleSidebar.emit()">
        <span class="material-icons">{{ collapsed ? 'chevron_right' : 'chevron_left' }}</span>
      </button>
    </aside>
  `,
  styles: [`
    .sidebar { position: fixed; top: 0; left: 0; height: 100vh; width: 260px; background: var(--sidebar-bg); display: flex; flex-direction: column; transition: var(--transition); z-index: 100; overflow: hidden; box-shadow: 4px 0 24px rgba(0,0,0,0.15); border-right: 1px solid rgba(255,255,255,0.05); }
    .sidebar.collapsed { width: 72px; }
    .sidebar__brand { display: flex; align-items: center; gap: 12px; padding: 24px 16px; margin-bottom: 8px; }
    .sidebar__logo { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 2px solid var(--accent); }
    .sidebar__title { font-size: 20px; font-weight: 800; color: #fff; white-space: nowrap; letter-spacing: 1px; }
    .sidebar__nav { flex: 1; padding: 0 12px; display: flex; flex-direction: column; gap: 6px; }
    .sidebar__link { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: var(--radius); color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px; font-weight: 500; transition: var(--transition); white-space: nowrap; }
    .sidebar__link:hover { background: var(--sidebar-hover); color: #fff; }
    .sidebar__link.active { background: var(--accent); color: #fff; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.35); }
    .sidebar__link .material-icons { font-size: 22px; flex-shrink: 0; }
    .sidebar__toggle { margin: 16px 12px; padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius); cursor: pointer; color: rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; transition: var(--transition); }
    .sidebar__toggle:hover { background: rgba(255,255,255,0.08); color: #fff; }
  `]
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  navItems = [
    { label: 'Tableau de bord', icon: 'dashboard', route: '/dashboard' },
    { label: 'Entreprises', icon: 'business', route: '/companies' },
    { label: 'Factures', icon: 'description', route: '/invoices' },
    { label: 'Lavage', icon: 'local_car_wash', route: '/lavage' },
    { label: 'Corbeille', icon: 'delete', route: '/trash' },
  ];
}
