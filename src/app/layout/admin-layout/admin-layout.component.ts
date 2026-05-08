import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';
import { ChatbotComponent } from '../../shared/components/chatbot/chatbot.component';
import { ThemeService } from '../../core/services';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, ToastContainerComponent, ChatbotComponent],
  template: `
    <div class="layout" [class.dark]="theme.isDark()">
      <app-sidebar [collapsed]="sidebarCollapsed()" (toggleSidebar)="sidebarCollapsed.update(v => !v)" />
      <div class="layout__main" [class.collapsed]="sidebarCollapsed()">
        <app-header (toggleSidebar)="sidebarCollapsed.update(v => !v)" />
        <main class="layout__content">
          <router-outlet />
        </main>
      </div>
      
      <!-- Global Stationary Forklift -->
      <div class="global-forklift" [class.collapsed]="sidebarCollapsed()">
        <svg viewBox="0 0 100 60" class="forklift-svg">
          <!-- Forklift Body -->
          <g class="forklift-body">
            <path fill="var(--accent)" d="M10,45 L30,45 L30,25 L50,25 L50,45 L80,45 L80,50 L10,50 Z" />
            <path fill="#fff" d="M85,15 L85,50 L90,50 L90,15 Z" />
            <path fill="#fff" d="M80,25 L95,25 L95,28 L80,28 Z" />
            <rect x="35" y="30" width="10" height="10" fill="rgba(255,255,255,0.2)" />
          </g>
          <!-- Wheels -->
          <circle class="forklift-wheel" cx="20" cy="50" r="6" fill="#1e293b" />
          <circle class="forklift-wheel" cx="70" cy="50" r="6" fill="#1e293b" />
          <!-- Inner wheel details for rotation visibility -->
          <circle class="forklift-wheel-inner" cx="20" cy="50" r="2" fill="#94a3b8" />
          <circle class="forklift-wheel-inner" cx="70" cy="50" r="2" fill="#94a3b8" />
        </svg>
      </div>

      <app-toast-container />
      <app-chatbot />
    </div>
  `,
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  theme = inject(ThemeService);
  sidebarCollapsed = signal(false);
}
