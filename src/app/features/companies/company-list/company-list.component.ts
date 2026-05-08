import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DecimalPipe } from '@angular/common';
import { CompanyService, ToastService } from '../../../core/services';
import { Company } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [RouterLink, NgClass, DecimalPipe, ConfirmDialogComponent, PaginationComponent],
  template: `
    <div class="page">
      <div class="page__header">
        <div>
          <h1 class="page__title">Entreprises</h1>
          <span class="page__subtitle">{{ filtered().length }} entreprise(s)</span>
        </div>
        <a routerLink="/companies/new" class="btn btn--primary">
          <span class="material-icons">add</span> Ajouter
        </a>
      </div>

      <!-- Summary cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <span class="material-icons summary-card__icon summary-card__icon--blue">business</span>
          <div><div class="summary-card__val">{{ globalStats().total }}</div><div class="summary-card__label">Entreprises</div></div>
        </div>
        <div class="summary-card">
          <span class="material-icons summary-card__icon summary-card__icon--orange">schedule</span>
          <div><div class="summary-card__val">{{ globalStats().hours }}h</div><div class="summary-card__label">Heures totales</div></div>
        </div>
        <div class="summary-card">
          <span class="material-icons summary-card__icon summary-card__icon--green">check_circle</span>
          <div><div class="summary-card__val">{{ globalStats().paid | number:'1.0-0' }} DT</div><div class="summary-card__label">Montant payé</div></div>
        </div>
        <div class="summary-card">
          <span class="material-icons summary-card__icon summary-card__icon--red">cancel</span>
          <div><div class="summary-card__val">{{ globalStats().unpaid | number:'1.0-0' }} DT</div><div class="summary-card__label">Montant impayé</div></div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input type="text" placeholder="Rechercher par nom..." [value]="search()"
            (input)="search.set($any($event.target).value); page.set(1)" />
          @if (search()) {
            <button class="clear-btn" (click)="search.set(''); page.set(1)"><span class="material-icons">close</span></button>
          }
        </div>
        <select [value]="paymentFilter()" (change)="paymentFilter.set($any($event.target).value); page.set(1)">
          <option value="">Tous les paiements</option>
          <option value="PAID">Payé</option>
          <option value="UNPAID">Impayé</option>
        </select>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Chariots</th>
                <th>Heures totales</th>
                <th>Montant total</th>
                <th>Paiement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (c of paginated(); track c.id) {
                <tr class="table-row">
                  <td><a [routerLink]="['/companies', c.id]" class="link">{{ c.name }}</a></td>
                  <td>{{ c.usages.length }}</td>
                  <td>{{ totalHours(c) }}h</td>
                  <td><strong>{{ totalAmount(c) | number:'1.0-0' }} DT</strong></td>
                  <td>
                    <div class="payment-cell">
                      <span class="badge" [ngClass]="c.paymentStatus === 'PAID' ? 'badge--paid' : 'badge--unpaid'">
                        {{ c.paymentStatus === 'PAID' ? '✓ Payé' : '✗ Impayé' }}
                      </span>
                      <button class="status-toggle-btn" (click)="togglePaymentStatus(c)" title="Changer le statut">
                        <span class="material-icons">sync</span>
                      </button>
                    </div>
                  </td>
                  <td>
                    <div class="actions">
                      <a [routerLink]="['/companies', c.id]" class="icon-btn" title="Détails"><span class="material-icons">visibility</span></a>
                      <a [routerLink]="['/companies', c.id, 'edit']" class="icon-btn" title="Modifier"><span class="material-icons">edit</span></a>
                      <a [routerLink]="['/invoices']" [queryParams]="{companyId: c.id}" class="icon-btn" title="Facture"><span class="material-icons">description</span></a>
                      <button class="icon-btn icon-btn--danger" (click)="deleteId.set(c.id)" title="Supprimer"><span class="material-icons">delete</span></button>
                    </div>
                  </td>
                </tr>
              }
              @empty {
                <tr><td colspan="6" class="empty">Aucune entreprise trouvée</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination [currentPage]="page()" [totalPages]="totalPages()" (pageChange)="page.set($event)" />
      </div>
    </div>

    <app-confirm-dialog [visible]="deleteId() !== null" (confirm)="doDelete()" (cancel)="deleteId.set(null)" />
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 28px; padding-bottom: 32px; }
    .page__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
    .page__title { font-size: 32px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.5px; }
    .page__subtitle { color: var(--text-secondary); font-size: 15px; font-weight: 500; }
    /* Summary */
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .summary-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; transition: var(--transition); box-shadow: var(--shadow-sm); }
    .summary-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); border-color: var(--accent-soft); }
    .summary-card__icon { font-size: 28px; border-radius: 12px; padding: 8px; color: #fff; }
    .summary-card__icon--blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .summary-card__icon--orange { background: linear-gradient(135deg, var(--accent), var(--accent-hover)); }
    .summary-card__icon--green { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .summary-card__icon--red { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .summary-card__val { font-size: 22px; font-weight: 800; color: var(--text-primary); line-height: 1.2; }
    .summary-card__label { font-size: 12px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    /* Filters */
    .filters { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .search-box { display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 10px 16px; flex: 1; min-width: 280px; transition: var(--transition); }
    .search-box:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .search-box .material-icons { color: var(--text-secondary); font-size: 20px; }
    .search-box input { border: none; background: none; outline: none; color: var(--text-primary); font-size: 14px; width: 100%; font-weight: 500; }
    .clear-btn { background: var(--bg-secondary); border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; padding: 4px; border-radius: 50%; transition: var(--transition); }
    .clear-btn:hover { background: var(--border); color: var(--text-primary); }
    select { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 10px 16px; color: var(--text-primary); font-size: 14px; font-weight: 500; cursor: pointer; transition: var(--transition); outline: none; min-width: 180px; }
    select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    /* Table */
    .card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border); overflow: hidden; box-shadow: var(--shadow-sm); }
    .table-wrap { overflow-x: auto; }
    .table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .table th { text-align: left; padding: 16px 20px; color: var(--text-secondary); font-weight: 700; border-bottom: 2px solid var(--bg-secondary); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; background: var(--bg-secondary); }
    .table td { padding: 18px 20px; color: var(--text-primary); border-bottom: 1px solid var(--bg-secondary); vertical-align: middle; }
    .table-row { transition: var(--transition); }
    .table-row:hover td { background: var(--bg-secondary); }
    .table tr:last-child td { border-bottom: none; }
    .link { color: var(--accent); text-decoration: none; font-weight: 700; transition: var(--transition); }
    .link:hover { color: var(--accent-hover); text-decoration: underline; }
    /* Payment column */
    .payment-cell { display: flex; align-items: center; gap: 12px; }
    .badge { display: inline-flex; padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; user-select: none; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge--paid { background: rgba(34,197,94,0.12); color: #16a34a; }
    .badge--unpaid { background: rgba(239,68,68,0.12); color: #dc2626; }
    .status-toggle-btn { background: var(--bg-secondary); border: 1px solid var(--border); padding: 6px; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; transition: var(--transition); border-radius: 8px; }
    .status-toggle-btn:hover { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); transform: rotate(180deg); }
    .status-toggle-btn .material-icons { font-size: 18px; }
    /* Actions */
    .actions { display: flex; gap: 8px; }
    .icon-btn { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 8px; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; text-decoration: none; transition: var(--transition); }
    .icon-btn:hover { background: var(--bg-secondary); color: var(--text-primary); transform: translateY(-2px); box-shadow: var(--shadow-sm); border-color: var(--text-secondary); }
    .icon-btn--danger:hover { background: #fef2f2; color: #ef4444; border-color: #ef4444; }
    .icon-btn .material-icons { font-size: 18px; }
    .empty { text-align: center; color: var(--text-secondary); padding: 64px 20px; font-weight: 500; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; text-decoration: none; transition: var(--transition); box-shadow: var(--shadow-sm); }
    .btn--primary { background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff; }
    .btn--primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3); }
    .btn .material-icons { font-size: 20px; }
  `]
})
export class CompanyListComponent {
  private companyService = inject(CompanyService);
  private toastService = inject(ToastService);

  search = signal('');
  paymentFilter = signal('');
  page = signal(1);
  pageSize = 8;
  deleteId = signal<string | null>(null);

  globalStats = computed(() => {
    const all = this.companyService.getAll()();
    return {
      total: all.length,
      hours: all.flatMap(c => c.usages).reduce((s, u) => s + u.hoursWorked, 0),
      paid: all.filter(c => c.paymentStatus === 'PAID').reduce((s, c) => s + c.usages.reduce((a, u) => a + u.totalPrice, 0), 0),
      unpaid: all.filter(c => c.paymentStatus === 'UNPAID').reduce((s, c) => s + c.usages.reduce((a, u) => a + u.totalPrice, 0), 0),
    };
  });

  filtered = computed(() => {
    const s = this.search().toLowerCase();
    const p = this.paymentFilter();
    return this.companyService.getAll()().filter(c =>
      (!s || c.name.toLowerCase().includes(s)) &&
      (!p || c.paymentStatus === p)
    );
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  paginated = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  totalHours(c: Company): number { return c.usages.reduce((s, u) => s + u.hoursWorked, 0); }
  totalAmount(c: Company): number { return c.usages.reduce((s, u) => s + u.totalPrice, 0); }

  async togglePaymentStatus(c: Company) {
    const newStatus = c.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    const { id, ...data } = c;
    try {
      await this.companyService.update(id, { ...data, paymentStatus: newStatus });
      this.toastService.show(`Statut mis à jour : ${newStatus === 'PAID' ? 'Payé' : 'Impayé'}`, 'success');
    } catch {
      this.toastService.show('Erreur lors de la mise à jour', 'error');
    }
  }

  doDelete(): void {
    this.companyService.delete(this.deleteId()!);
    this.toastService.show('Élément déplacé vers la corbeille', 'success');
    this.deleteId.set(null);
  }
}
