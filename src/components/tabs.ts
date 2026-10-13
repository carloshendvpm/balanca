import type { SFSymbol } from 'sf-symbols-typescript';

export const TABS: { name: string; href: '/' | '/weigh' | '/history' | '/goals' | '/settings'; label: string; sf: SFSymbol }[] = [
  { name: 'index', href: '/', label: 'Início', sf: 'house.fill' },
  { name: 'weigh', href: '/weigh', label: 'Pesar', sf: 'scalemass.fill' },
  { name: 'history', href: '/history', label: 'Histórico', sf: 'chart.xyaxis.line' },
  { name: 'goals', href: '/goals', label: 'Metas', sf: 'flag.checkered' },
  { name: 'settings', href: '/settings', label: 'Ajustes', sf: 'gearshape.fill' },
];
