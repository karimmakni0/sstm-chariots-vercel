import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService } from '../../../core/services';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [ngClass]="'toast--' + toast.type">
          <span class="material-icons toast__icon">{{ icons[toast.type] }}</span>
          <span class="toast__msg">{{ toast.message }}</span>
          <button class="toast__close" (click)="toastService.remove(toast.id)">
            <span class="material-icons">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; }
    .toast { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px; min-width: 280px; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); animation: slideIn 0.3s ease; color: #fff; font-size: 14px; }
    .toast--success { background: #22c55e; }
    .toast--error { background: #ef4444; }
    .toast--warning { background: #f59e0b; }
    .toast--info { background: #3b82f6; }
    .toast__icon { font-size: 18px; }
    .toast__msg { flex: 1; }
    .toast__close { background: none; border: none; cursor: pointer; color: #fff; display: flex; align-items: center; opacity: 0.8; }
    .toast__close:hover { opacity: 1; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
  icons: Record<string, string> = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
}
