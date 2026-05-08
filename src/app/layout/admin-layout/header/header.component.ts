import { Component, Output, EventEmitter, inject } from '@angular/core';
import { ThemeService } from '../../../core/services';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="header">
      <button class="header__menu-btn" (click)="toggleSidebar.emit()">
        <span class="material-icons">menu</span>
      </button>
      <div class="header__title">S.S.T.M — Gestion Chariots Élévateurs</div>
      <div class="header__actions">
        <button class="header__theme-btn" (click)="theme.toggle()" [title]="theme.isDark() ? 'Mode clair' : 'Mode sombre'">
          <span class="material-icons">{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</span>
        </button>
        <div class="header__avatar">AD</div>
      </div>
    </header>
  `,
  styles: [`
    .header { display: flex; align-items: center; gap: 16px; padding: 0 32px; height: 72px; background: rgba(var(--bg-card), 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 50; transition: var(--transition); }
    [data-theme="light"] .header { background: rgba(255, 255, 255, 0.85); }
    [data-theme="dark"] .header { background: rgba(30, 41, 59, 0.85); }
    .header__menu-btn { background: none; border: 1px solid var(--border); cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; padding: 10px; border-radius: var(--radius); transition: var(--transition); }
    .header__menu-btn:hover { background: var(--bg-secondary); color: var(--accent); border-color: var(--accent); }
    .header__title { font-size: 16px; font-weight: 700; color: var(--text-primary); flex: 1; letter-spacing: -0.2px; text-transform: uppercase; opacity: 0.8; }
    .header__actions { display: flex; align-items: center; gap: 16px; }
    .header__theme-btn { background: none; border: 1px solid var(--border); cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; padding: 10px; border-radius: var(--radius); transition: var(--transition); }
    .header__theme-btn:hover { background: var(--bg-secondary); color: var(--accent); border-color: var(--accent); transform: rotate(15deg); }
    .header__avatar { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; box-shadow: 0 4px 10px rgba(249, 115, 22, 0.25); border: 2px solid #fff; }
    [data-theme="dark"] .header__avatar { border-color: var(--bg-card); }
  `]
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  theme = inject(ThemeService);
}
