import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (totalPages > 1) {
      <div class="pagination">
        <button class="pagination__btn" [disabled]="currentPage === 1" (click)="pageChange.emit(currentPage - 1)">
          <span class="material-icons">chevron_left</span>
        </button>
        @for (p of pages; track p) {
          <button class="pagination__btn" [class.active]="p === currentPage" (click)="pageChange.emit(p)">{{ p }}</button>
        }
        <button class="pagination__btn" [disabled]="currentPage === totalPages" (click)="pageChange.emit(currentPage + 1)">
          <span class="material-icons">chevron_right</span>
        </button>
        <span class="pagination__info">{{ currentPage }} / {{ totalPages }}</span>
      </div>
    }
  `,
  styles: [`
    .pagination { display: flex; align-items: center; gap: 4px; justify-content: center; padding: 16px 0; }
    .pagination__btn { min-width: 36px; height: 36px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s; }
    .pagination__btn:hover:not(:disabled) { background: var(--accent); color: #fff; border-color: var(--accent); }
    .pagination__btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .pagination__btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination__info { margin-left: 8px; font-size: 13px; color: var(--text-secondary); }
  `]
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
