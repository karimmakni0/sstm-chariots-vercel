import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass, DecimalPipe } from '@angular/common';
import { ChariotLabelPipe } from '../../../shared/pipes/chariot-label.pipe';
import { CompanyService } from '../../../core/services';
import { Company } from '../../../core/models';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [RouterLink, NgClass, DecimalPipe, ChariotLabelPipe],
  template: `
    @if (company()) {
      <div class="page">
        <div class="page__header">
          <a routerLink="/companies" class="back-btn"><span class="material-icons">arrow_back</span></a>
          <h1 class="page__title">{{ company()!.name }}</h1>
          <span class="badge" [ngClass]="company()!.paymentStatus === 'PAID' ? 'badge--paid' : 'badge--unpaid'">{{ company()!.paymentStatus === 'PAID' ? 'Payé' : 'Impayé' }}</span>
          <div class="spacer"></div>
          <a [routerLink]="['/companies', company()!.id, 'edit']" class="btn btn--primary">
            <span class="material-icons">edit</span> Modifier
          </a>
        </div>

        <div class="kpi-row">
          <div class="kpi"><div class="kpi__val">{{ company()!.usages.length }}</div><div class="kpi__label">Chariots utilisés</div></div>
          <div class="kpi"><div class="kpi__val">{{ totalHours() }}h</div><div class="kpi__label">Heures totales</div></div>
          <div class="kpi kpi--accent"><div class="kpi__val">{{ totalAmount() | number:'1.0-0' }} DT</div><div class="kpi__label">Montant total</div></div>
        </div>

        <div class="card">
          <h2 class="card__title">Détail des utilisations</h2>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>#</th><th>Type chariot</th><th>Heures</th><th>Prix/h</th><th>Total</th><th>Paiement</th></tr>
              </thead>
              <tbody>
                @for (u of company()!.usages; track u.id; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td>
                      <span class="badge badge--accent" style="display: inline-flex; align-items: center; gap: 6px;">
                        <span class="material-icons" style="font-size: 16px;">{{ getIcon(u.chariotType) }}</span>
                        {{ u.chariotType | chariotLabel }}
                      </span>
                    </td>
                    <td>{{ u.hoursWorked }}h</td>
                    <td>{{ u.pricePerHour | number:'1.0-0' }} DT/h</td>
                    <td><strong>{{ u.totalPrice | number:'1.0-0' }} DT</strong></td>
                    <td><span class="badge" [ngClass]="u.paymentStatus === 'Paid' ? 'badge--paid' : 'badge--unpaid'">{{ u.paymentStatus === 'Paid' ? 'Payé' : 'Impayé' }}</span></td>
                  </tr>
                }
                @empty {
                  <tr><td colspan="5" class="empty">Aucune utilisation enregistrée</td></tr>
                }
              </tbody>
              @if (company()!.usages.length > 0) {
                <tfoot>
                  <tr class="total-row">
                    <td colspan="4"><strong>Total</strong></td>
                    <td><strong>{{ totalAmount() | number:'1.0-0' }} DT</strong></td>
                  </tr>
                </tfoot>
              }
            </table>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; }
    .page__header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .page__title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .spacer { flex: 1; }
    .back-btn { display: flex; align-items: center; color: var(--text-secondary); text-decoration: none; padding: 6px; border-radius: 8px; border: 1px solid var(--border); }
    .back-btn:hover { background: var(--bg-secondary); }
    .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    @media (max-width: 600px) { .kpi-row { grid-template-columns: 1fr; } }
    .kpi { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); padding: 20px; text-align: center; }
    .kpi--accent { border-color: var(--accent); }
    .kpi__val { font-size: 28px; font-weight: 800; color: var(--text-primary); }
    .kpi--accent .kpi__val { color: var(--accent); }
    .kpi__label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
    .card { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); padding: 20px; }
    .card__title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px; }
    .table-wrap { overflow-x: auto; }
    .table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .table th { text-align: left; padding: 10px 14px; color: var(--text-secondary); font-weight: 600; border-bottom: 1px solid var(--border); font-size: 12px; text-transform: uppercase; background: var(--bg-secondary); }
    .table td { padding: 13px 14px; color: var(--text-primary); border-bottom: 1px solid var(--border); }
    .table tr:last-child td { border-bottom: none; }
    .table tr:hover td { background: var(--bg-secondary); }
    .total-row td { background: var(--bg-secondary); font-size: 15px; }
    .badge { display: inline-flex; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge--active { background: rgba(34,197,94,0.15); color: #22c55e; }
    .badge--inactive { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge--accent { background: rgba(234,88,12,0.15); color: var(--accent); }
    .badge--paid { background: rgba(34,197,94,0.15); color: #22c55e; }
    .badge--unpaid { background: rgba(239,68,68,0.15); color: #ef4444; }
    .empty { text-align: center; color: var(--text-secondary); padding: 32px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; transition: all 0.2s; }
    .btn--primary { background: var(--accent); color: #fff; }
    .btn--primary:hover { opacity: 0.9; }
  `]
})
export class CompanyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private companyService = inject(CompanyService);

  company = signal<Company | undefined>(undefined);
  totalHours = computed(() => this.company()?.usages.reduce((s, u) => s + u.hoursWorked, 0) ?? 0);
  totalAmount = computed(() => this.company()?.usages.reduce((s, u) => s + u.totalPrice, 0) ?? 0);

  getIcon(type: string) {
    const map: any = { '3T': 'widgets', '5T': 'agriculture', '7T': 'local_shipping', '16T': 'precision_manufacturing' };
    return map[type] ?? 'help';
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.company.set(this.companyService.getById(id));
    if (!this.company()) this.router.navigate(['/companies']);
  }
}
