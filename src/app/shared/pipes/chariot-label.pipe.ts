import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'chariotLabel', standalone: true })
export class ChariotLabelPipe implements PipeTransform {
  transform(type: string): string {
    const labels: Record<string, string> = {
      '3T': '3T',
      '5T': '5T',
      '7T': '7T',
      '16T': '16T',
      'TP': 'Transpalette',
      'CM': 'Camion'
    };
    return labels[type] || type;
  }
}
