import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ChariotLabelPipe } from '../../shared/pipes/chariot-label.pipe';
import { CompanyService } from '../../core/services';
import { ChariotType } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ChariotLabelPipe],
  template: `
    <div class="page">

      <!-- Hero banner -->
      <div class="hero">
        <img class="hero__img" src="assets/banner.jpg" alt="Chariot élévateur" />
        <div class="hero__overlay">
          <h1 class="hero__title">S.S.T.M</h1>
          <p class="hero__sub">Location de chariots élévateurs · Manutention industrielle</p>
        </div>
      </div>

      <!-- Fleet thumbnails -->
      <div class="fleet-grid">
        @for (f of fleet; track f.type) {
          <div class="fleet-card">
            <div class="fleet-card__img-wrap">
              <img class="fleet-card__img" [src]="f.img" [alt]="f.label" loading="lazy" />
            </div>
            <div class="fleet-card__body">
              <span class="fleet-card__badge">{{ f.type }}</span>
              <span class="fleet-card__label">{{ f.label }}</span>
            </div>
          </div>
        }
      </div>

      <div class="page__header">
        <h1 class="page__title">Tableau de bord</h1>
        <span class="page__subtitle">Vue d'ensemble de l'activité</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--blue"><span class="material-icons">business</span></div>
          <div class="kpi-card__content">
            <div class="kpi-card__value">{{ stats().totalCompanies }}</div>
            <div class="kpi-card__label">Entreprises</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--green"><span class="material-icons">check_circle</span></div>
          <div class="kpi-card__content">
            <div class="kpi-card__value">
              {{ stats().paidRevenue | number:'1.0-0' }}
              <span class="kpi-card__unit">DT</span>
            </div>
            <div class="kpi-card__label">Montant payé</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--red"><span class="material-icons">cancel</span></div>
          <div class="kpi-card__content">
            <div class="kpi-card__value">
              {{ stats().unpaidRevenue | number:'1.0-0' }}
              <span class="kpi-card__unit">DT</span>
            </div>
            <div class="kpi-card__label">Montant impayé</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--orange"><span class="material-icons">schedule</span></div>
          <div class="kpi-card__content">
            <div class="kpi-card__value">
              {{ stats().totalHours }}
              <span class="kpi-card__unit">h</span>
            </div>
            <div class="kpi-card__label">Heures travaillées</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--purple"><span class="material-icons">payments</span></div>
          <div class="kpi-card__content">
            <div class="kpi-card__value">
              {{ stats().totalRevenue | number:'1.0-0' }}
              <span class="kpi-card__unit">DT</span>
            </div>
            <div class="kpi-card__label">Chiffre d'affaires</div>
          </div>
        </div>
      </div>

      <div class="section-grid">
        <div class="card">
          <h2 class="card__title">Revenus par type de chariot</h2>
          <div class="bars">
            @for (item of stats().revenueByType; track item.type) {
              <div class="bar-row">
                <div class="bar-row__label badge badge--accent">
                  <span class="material-icons" style="font-size: 16px; margin-right: 4px;">{{ getIcon(item.type) }}</span>
                  {{ item.type | chariotLabel }}
                </div>
                <div class="bar-row__track"><div class="bar-row__fill" [style.width.%]="item.pct"></div></div>
                <span class="bar-row__val">{{ item.revenue | number:'1.0-0' }} DT</span>
              </div>
            }
          </div>
        </div>

        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Top entreprises</h2>
            <a routerLink="/companies" class="btn btn--ghost btn--sm">Voir tout</a>
          </div>
          <div class="company-list">
            @for (c of stats().topCompanies; track c.id) {
              <div class="company-row">
                <div class="company-row__info">
                  <a [routerLink]="['/companies', c.id]" class="company-row__name">{{ c.name }}</a>
                  <span class="company-row__sub">{{ c.usages }} chariot(s) · {{ c.hours }}h</span>
                </div>
                <strong class="company-row__amount">{{ c.amount | number:'1.0-0' }} DT</strong>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 32px; padding-bottom: 32px; }
    /* ── Hero ── */
    @keyframes fadeIn { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
    .hero { position: relative; border-radius: 24px; overflow: hidden; height: 280px; box-shadow: var(--shadow-lg); }
    .hero__img { width: 100%; height: 100%; object-fit: cover; object-position: center center; display: block; filter: brightness(0.8) contrast(1.1); animation: fadeIn 0.8s cubic-bezier(0, 0, 0.2, 1) both; }
    .hero__overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.4) 60%, transparent 100%); display: flex; flex-direction: column; justify-content: center; padding: 48px; gap: 12px; }
    .hero__title { margin: 0; font-size: 42px; font-weight: 900; color: #fff; letter-spacing: -1px; text-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .hero__sub { margin: 0; font-size: 16px; color: rgba(255,255,255,0.8); font-weight: 500; max-width: 400px; line-height: 1.5; }
    /* ── Fleet grid ── */
    .fleet-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: -60px; position: relative; z-index: 10; padding: 0 20px; }
    @media (max-width: 1024px) { .fleet-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-top: 0; padding: 0; } }
    .fleet-card { border-radius: 20px; overflow: hidden; border: 1px solid var(--border); background: var(--bg-card); box-shadow: var(--shadow); transition: var(--transition); height: 100%; }
    .fleet-card:hover { transform: translateY(-8px); border-color: rgba(255, 140, 40, 0.4); box-shadow: 0 0 0 1px rgba(255,140,40,0.25), 0 12px 30px rgba(255,140,40,0.12); }
    .fleet-card__img-wrap { overflow: hidden; height: 170px; position: relative; }
    .fleet-card__img { width: 100%; height: 100%; object-fit: cover; object-position: center center; display: block; transition: transform 0.25s ease; padding: 0; }
    .fleet-card:hover .fleet-card__img { transform: scale(1.03); }
    .fleet-card__body { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--bg-card); }
    .fleet-card__badge { background: var(--accent-soft); color: var(--accent); font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 8px; flex-shrink: 0; text-transform: uppercase; }
    .fleet-card__label { font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .page__header { display: flex; flex-direction: column; gap: 4px; }
    .page__title { font-size: 28px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.5px; }
    .page__subtitle { color: var(--text-secondary); font-size: 15px; font-weight: 500; }
    /* KPI Cards */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
    .kpi-card { background: var(--bg-card); border-radius: 20px; padding: 24px; display: flex; align-items: center; gap: 18px; border: 1px solid var(--border); transition: var(--transition); box-shadow: var(--shadow-sm); min-height: 120px; }
    .kpi-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); border-color: var(--accent-soft); }
    .kpi-card__icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: var(--transition); }
    .kpi-card:hover .kpi-card__icon { transform: scale(1.1) rotate(-5deg); }
    .kpi-card__icon .material-icons { font-size: 28px; color: #fff; }
    .kpi-card__icon--blue { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
    .kpi-card__icon--green { background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 4px 12px rgba(22, 163, 74, 0.2); }
    .kpi-card__icon--orange { background: linear-gradient(135deg, var(--accent), var(--accent-hover)); box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2); }
    .kpi-card__icon--purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2); }
    .kpi-card__icon--red { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); }
    .kpi-card__content { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
    .kpi-card__value { font-size: clamp(24px, 2.5vw, 32px); font-weight: 800; color: var(--text-primary); line-height: 1; white-space: nowrap; display: flex; align-items: baseline; gap: 4px; }
    .kpi-card__unit { font-size: 0.5em; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
    .kpi-card__label { font-size: 12px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.3; margin-top: 8px; }
    /* Sections */
    .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 900px) { .section-grid { grid-template-columns: 1fr; } }
    .card { background: var(--bg-card); border-radius: 20px; padding: 28px; border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
    .card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .card__title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .bars { display: flex; flex-direction: column; gap: 16px; }
    .bar-row { display: flex; align-items: center; gap: 16px; min-height: 32px; }
    .bar-row__label { width: 120px; flex-shrink: 0; display: flex; align-items: center; font-size: 13px; font-weight: 700; height: 32px; justify-content: flex-start; padding: 0 12px; }
    .bar-row__track { flex: 1; height: 8px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden; position: relative; }
    .bar-row__fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-hover)); border-radius: 4px; transition: width 1s cubic-bezier(0, 0, 0.2, 1); }
    .bar-row__val { font-size: 14px; font-weight: 800; color: var(--text-primary); width: 100px; text-align: right; flex-shrink: 0; font-variant-numeric: tabular-nums; }
    .company-list { display: flex; flex-direction: column; gap: 14px; }
    .company-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: var(--bg-secondary); border-radius: 14px; transition: var(--transition); border: 1px solid transparent; }
    .company-row:hover { background: var(--bg-card); border-color: var(--accent-soft); transform: translateX(4px); box-shadow: var(--shadow-sm); }
    .company-row__info { display: flex; flex-direction: column; gap: 2px; }
    .company-row__name { color: var(--accent); text-decoration: none; font-weight: 700; font-size: 15px; }
    .company-row__name:hover { color: var(--accent-hover); text-decoration: underline; }
    .company-row__sub { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
    .company-row__amount { font-size: 16px; font-weight: 800; color: var(--text-primary); }
    .badge { display: inline-flex; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; }
    .badge--accent { background: var(--accent-soft); color: var(--accent); }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; transition: var(--transition); }
    .btn--ghost { background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border); }
    .btn--ghost:hover { background: var(--bg-card); color: var(--accent); border-color: var(--accent); }
    .btn--sm { padding: 6px 14px; font-size: 12px; }
  `]
})
export class DashboardComponent {
  private companyService = inject(CompanyService);

  readonly fleet = [
    { type: '3T',  label: 'Chariot 3 tonnes',  img: 'img/3T.jpg'  },
    { type: '5T',  label: 'Chariot 5 tonnes',  img: 'img/5T.jpg'  },
    { type: '7T',  label: 'Chariot 7 tonnes',  img: 'img/7T.jpg'  },
    { type: '16T', label: 'Chariot 16 tonnes', img: 'img/16T.jpg' },
    { type: 'TP',  label: 'Transpalette',      img: 'img/transpalette.jpg' },
    { type: 'CM',  label: 'Camion',            img: 'img/camion.jpg' },
  ];

  totalHours(c: any): number { return c.usages.reduce((s: any, u: any) => s + u.hoursWorked, 0); }
  totalAmount(c: any): number { return c.usages.reduce((s: any, u: any) => s + u.totalPrice, 0); }

  getIcon(type: string) {
    const map: any = { 
      '3T': 'widgets', 
      '5T': 'agriculture', 
      '7T': 'local_shipping', 
      '16T': 'precision_manufacturing',
      'TP': 'inventory',
      'CM': 'local_shipping'
    };
    return map[type] ?? 'help';
  }

  stats = computed(() => {
    const companies = this.companyService.getAll()();
    const allUsages = companies.flatMap(c => c.usages);
    const totalRevenue = allUsages.reduce((s, u) => s + u.totalPrice, 0);
    const types: ChariotType[] = ['3T', '5T', '7T', '16T', 'TP', 'CM'];
    const maxRev = Math.max(...types.map(t => allUsages.filter(u => u.chariotType === t).reduce((s, u) => s + u.totalPrice, 0)), 1);
    return {
      totalCompanies: companies.length,
      activeCompanies: companies.filter(c => c.paymentStatus === 'PAID').length,
      totalHours: allUsages.reduce((s, u) => s + u.hoursWorked, 0),
      totalRevenue,
      paidRevenue: companies.filter(c => c.paymentStatus === 'PAID').reduce((s, c) => s + c.usages.reduce((a, u) => a + u.totalPrice, 0), 0),
      unpaidRevenue: companies.filter(c => c.paymentStatus === 'UNPAID').reduce((s, c) => s + c.usages.reduce((a, u) => a + u.totalPrice, 0), 0),
      revenueByType: types.map(t => {
        const revenue = allUsages.filter(u => u.chariotType === t).reduce((s, u) => s + u.totalPrice, 0);
        return { type: t, revenue, pct: (revenue / maxRev) * 100 };
      }),
      topCompanies: [...companies]
        .map(c => ({ id: c.id, name: c.name, usages: c.usages.length, hours: c.usages.reduce((s, u) => s + u.hoursWorked, 0), amount: c.usages.reduce((s, u) => s + u.totalPrice, 0) }))
        .sort((a, b) => b.amount - a.amount).slice(0, 5),
    };
  });
}
