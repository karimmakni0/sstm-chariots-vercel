import { Injectable, signal } from '@angular/core';
import { Company, DEFAULT_PRICES } from '../models';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private companies = signal<Company[]>([]);
  readonly defaultPrices = DEFAULT_PRICES;

  constructor() { this.load(); }

  private async load() {
    try {
      const res = await fetch(`${API}/companies`);
      this.companies.set(await res.json());
    } catch { /* API offline – stays empty */ }
  }

  getAll() { return this.companies; }

  getById(id: string) { return this.companies().find(c => c.id === id); }

  async add(data: Omit<Company, 'id'>) {
    const res = await fetch(`${API}/companies`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const { id } = await res.json();
    const company: Company = { ...data, id: String(id) };
    this.companies.update(list => [...list, company]);
    return company;
  }

  async update(id: string, data: Omit<Company, 'id'>) {
    await fetch(`${API}/companies/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    this.companies.update(list => list.map(c => c.id === id ? { ...c, ...data } : c));
  }

  async delete(id: string) {
    await fetch(`${API}/companies/${id}`, { method: 'DELETE' });
    this.companies.update(list => list.filter(c => c.id !== id));
  }
}
