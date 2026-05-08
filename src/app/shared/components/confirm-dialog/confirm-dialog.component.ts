import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (visible) {
      <div class="overlay" (click)="cancel.emit()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog__icon"><span class="material-icons">warning</span></div>
          <h3 class="dialog__title">{{ title }}</h3>
          <p class="dialog__msg">{{ message }}</p>
          <div class="dialog__actions">
            <button class="btn btn--ghost" (click)="cancel.emit()">Annuler</button>
            <button class="btn btn--danger" (click)="confirm.emit()">Confirmer</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .dialog { background: var(--bg-card); border-radius: 16px; padding: 32px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .dialog__icon .material-icons { font-size: 48px; color: #ef4444; }
    .dialog__title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 12px 0 8px; }
    .dialog__msg { color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; }
    .dialog__actions { display: flex; gap: 12px; justify-content: center; }
  `]
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirmer la suppression';
  @Input() message = 'Cette action est irréversible.';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
