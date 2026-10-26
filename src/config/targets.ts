import type { TargetConfig } from '../monitoring/types';

export const TARGETS: TargetConfig[] = [
  {
    id: 'qa-playbook',
    name: 'QA Playbook',
    url: 'https://maikonfcosta.github.io/qa-playbook/',
    expectedTitle: /QA Playbook/i,
    vitalSelector: 'h1',
    slaLatencyMs: 3000,
  },
  {
    id: 'champions-hq',
    name: 'Champions HQ',
    url: 'https://champions-hq.vercel.app',
    expectedTitle: /Champions HQ/i,
    vitalSelector: 'h1',
    slaLatencyMs: 3000,
  },
  {
    id: 'farm-hand-tool',
    name: 'Farm Hand Tracker',
    url: 'https://farm-hand-tool.vercel.app',
    expectedTitle: /Farm Hand Tracker/i,
    vitalSelector: 'h1',
    slaLatencyMs: 3000,
  },
  {
    id: 'rotine',
    name: 'Rotine',
    url: 'https://rotine.com.br',
    expectedTitle: /Rotine/i,
    vitalSelector: 'h1',
    slaLatencyMs: 3000,
  },
];
