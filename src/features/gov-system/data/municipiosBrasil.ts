import type { Municipio } from '../types';

// Fallback data for top municipalities by state
// Real data will come from IBGE API

export const MUNICIPIOS_POR_UF: Record<string, Municipio[]> = {
  AC: [
    { id: 1200401, codigoIbge: 1200401, nome: 'Rio Branco', ufSigla: 'AC', ufId: 12, populacao: 413418, idhm: 0.727, pibPerCapita: 22890, rendaMedia: 1850, esperancaVida: 73.2, mortInfantil: 15.8, leitosPor1000: 2.1, medicosPor1000: 1.8, ideb: 5.2, txAlfabetizacao: 89.5, aguaEncanada: 78.5, esgotoAdequado: 45.2, coletaLixo: 92.3 },
    { id: 1200104, codigoIbge: 1200104, nome: 'Cruzeiro do Sul', ufSigla: 'AC', ufId: 12, populacao: 89072, idhm: 0.664, pibPerCapita: 14560, rendaMedia: 1280, esperancaVida: 71.5, mortInfantil: 18.2, leitosPor1000: 1.8, medicosPor1000: 0.9, ideb: 4.8, txAlfabetizacao: 82.3, aguaEncanada: 65.4, esgotoAdequado: 28.5, coletaLixo: 78.6 },
  ],
  AL: [
    { id: 2704302, codigoIbge: 2704302, nome: 'Maceió', ufSigla: 'AL', ufId: 27, populacao: 1025360, idhm: 0.721, pibPerCapita: 21450, rendaMedia: 1720, esperancaVida: 72.8, mortInfantil: 16.5, leitosPor1000: 2.8, medicosPor1000: 2.2, ideb: 5.0, txAlfabetizacao: 88.2, aguaEncanada: 85.6, esgotoAdequado: 52.3, coletaLixo: 95.1 },
    { id: 2700300, codigoIbge: 2700300, nome: 'Arapiraca', ufSigla: 'AL', ufId: 27, populacao: 234185, idhm: 0.649, pibPerCapita: 15890, rendaMedia: 1450, esperancaVida: 71.2, mortInfantil: 19.8, leitosPor1000: 2.1, medicosPor1000: 1.2, ideb: 4.6, txAlfabetizacao: 78.5, aguaEncanada: 72.3, esgotoAdequado: 35.6, coletaLixo: 88.9 },
  ],
  AM: [
    { id: 1302603, codigoIbge: 1302603, nome: 'Manaus', ufSigla: 'AM', ufId: 13, populacao: 2255903, idhm: 0.737, pibPerCapita: 36780, rendaMedia: 2180, esperancaVida: 73.8, mortInfantil: 14.2, leitosPor1000: 2.5, medicosPor1000: 2.4, ideb: 5.3, txAlfabetizacao: 92.1, aguaEncanada: 78.9, esgotoAdequado: 42.5, coletaLixo: 94.2 },
    { id: 1303304, codigoIbge: 1303304, nome: 'Parintins', ufSigla: 'AM', ufId: 13, populacao: 116439, idhm: 0.658, pibPerCapita: 12560, rendaMedia: 1120, esperancaVida: 70.5, mortInfantil: 21.3, leitosPor1000: 1.5, medicosPor1000: 0.7, ideb: 4.5, txAlfabetizacao: 78.9, aguaEncanada: 52.3, esgotoAdequado: 18.5, coletaLixo: 72.3 },
  ],
  BA: [
    { id: 2927408, codigoIbge: 2927408, nome: 'Salvador', ufSigla: 'BA', ufId: 29, populacao: 2900319, idhm: 0.759, pibPerCapita: 24890, rendaMedia: 2280, esperancaVida: 74.5, mortInfantil: 13.8, leitosPor1000: 3.2, medicosPor1000: 3.1, ideb: 5.4, txAlfabetizacao: 93.5, aguaEncanada: 92.3, esgotoAdequado: 78.5, coletaLixo: 97.8 },
    { id: 2910800, codigoIbge: 2910800, nome: 'Feira de Santana', ufSigla: 'BA', ufId: 29, populacao: 619609, idhm: 0.712, pibPerCapita: 18560, rendaMedia: 1680, esperancaVida: 72.8, mortInfantil: 16.2, leitosPor1000: 2.4, medicosPor1000: 1.8, ideb: 4.9, txAlfabetizacao: 88.9, aguaEncanada: 85.6, esgotoAdequado: 58.2, coletaLixo: 92.5 },
    { id: 2933307, codigoIbge: 2933307, nome: 'Vitória da Conquista', ufSigla: 'BA', ufId: 29, populacao: 343643, idhm: 0.678, pibPerCapita: 16780, rendaMedia: 1520, esperancaVida: 71.9, mortInfantil: 17.5, leitosPor1000: 2.2, medicosPor1000: 1.5, ideb: 4.7, txAlfabetizacao: 85.2, aguaEncanada: 82.3, esgotoAdequado: 48.9, coletaLixo: 89.5 },
  ],
  CE: [
    { id: 2304400, codigoIbge: 2304400, nome: 'Fortaleza', ufSigla: 'CE', ufId: 23, populacao: 2703391, idhm: 0.754, pibPerCapita: 25670, rendaMedia: 2150, esperancaVida: 74.2, mortInfantil: 14.5, leitosPor1000: 3.1, medicosPor1000: 2.8, ideb: 5.5, txAlfabetizacao: 92.8, aguaEncanada: 88.9, esgotoAdequado: 68.5, coletaLixo: 96.5 },
    { id: 2303709, codigoIbge: 2303709, nome: 'Caucaia', ufSigla: 'CE', ufId: 23, populacao: 365212, idhm: 0.682, pibPerCapita: 12890, rendaMedia: 1280, esperancaVida: 71.5, mortInfantil: 18.9, leitosPor1000: 1.8, medicosPor1000: 0.9, ideb: 4.5, txAlfabetizacao: 82.5, aguaEncanada: 72.3, esgotoAdequado: 32.5, coletaLixo: 85.6 },
    { id: 2305902, codigoIbge: 2305902, nome: 'Juazeiro do Norte', ufSigla: 'CE', ufId: 23, populacao: 278264, idhm: 0.694, pibPerCapita: 14560, rendaMedia: 1380, esperancaVida: 72.1, mortInfantil: 17.2, leitosPor1000: 2.2, medicosPor1000: 1.4, ideb: 5.0, txAlfabetizacao: 85.6, aguaEncanada: 78.9, esgotoAdequado: 42.3, coletaLixo: 89.2 },
  ],
  DF: [
    { id: 5300108, codigoIbge: 5300108, nome: 'Brasília', ufSigla: 'DF', ufId: 53, populacao: 3094325, idhm: 0.824, pibPerCapita: 85930, rendaMedia: 4580, esperancaVida: 78.2, mortInfantil: 9.8, leitosPor1000: 3.8, medicosPor1000: 4.5, ideb: 6.2, txAlfabetizacao: 96.5, aguaEncanada: 98.2, esgotoAdequado: 92.5, coletaLixo: 99.2 },
  ],
  ES: [
    { id: 3205309, codigoIbge: 3205309, nome: 'Vitória', ufSigla: 'ES', ufId: 32, populacao: 365855, idhm: 0.845, pibPerCapita: 78560, rendaMedia: 3890, esperancaVida: 77.5, mortInfantil: 10.2, leitosPor1000: 3.5, medicosPor1000: 4.2, ideb: 6.1, txAlfabetizacao: 96.2, aguaEncanada: 99.1, esgotoAdequado: 95.2, coletaLixo: 99.5 },
    { id: 3205200, codigoIbge: 3205200, nome: 'Vila Velha', ufSigla: 'ES', ufId: 32, populacao: 501325, idhm: 0.800, pibPerCapita: 32890, rendaMedia: 2890, esperancaVida: 76.2, mortInfantil: 11.5, leitosPor1000: 2.8, medicosPor1000: 2.5, ideb: 5.8, txAlfabetizacao: 95.1, aguaEncanada: 97.5, esgotoAdequado: 88.9, coletaLixo: 98.5 },
    { id: 3205002, codigoIbge: 3205002, nome: 'Serra', ufSigla: 'ES', ufId: 32, populacao: 527240, idhm: 0.739, pibPerCapita: 38560, rendaMedia: 2180, esperancaVida: 74.5, mortInfantil: 13.2, leitosPor1000: 2.2, medicosPor1000: 1.5, ideb: 5.4, txAlfabetizacao: 92.3, aguaEncanada: 95.2, esgotoAdequado: 78.5, coletaLixo: 96.8 },
  ],
  GO: [
    { id: 5208707, codigoIbge: 5208707, nome: 'Goiânia', ufSigla: 'GO', ufId: 52, populacao: 1555626, idhm: 0.799, pibPerCapita: 35890, rendaMedia: 2850, esperancaVida: 76.8, mortInfantil: 11.2, leitosPor1000: 3.2, medicosPor1000: 3.5, ideb: 5.9, txAlfabetizacao: 95.2, aguaEncanada: 96.5, esgotoAdequado: 85.2, coletaLixo: 98.2 },
    { id: 5201405, codigoIbge: 5201405, nome: 'Aparecida de Goiânia', ufSigla: 'GO', ufId: 52, populacao: 590146, idhm: 0.718, pibPerCapita: 22560, rendaMedia: 1780, esperancaVida: 74.2, mortInfantil: 14.5, leitosPor1000: 2.1, medicosPor1000: 1.2, ideb: 5.2, txAlfabetizacao: 91.5, aguaEncanada: 92.3, esgotoAdequado: 65.8, coletaLixo: 95.5 },
    { id: 5200050, codigoIbge: 5200050, nome: 'Anápolis', ufSigla: 'GO', ufId: 52, populacao: 391772, idhm: 0.737, pibPerCapita: 28560, rendaMedia: 2120, esperancaVida: 75.2, mortInfantil: 12.8, leitosPor1000: 2.5, medicosPor1000: 2.1, ideb: 5.5, txAlfabetizacao: 93.2, aguaEncanada: 94.5, esgotoAdequado: 72.5, coletaLixo: 96.8 },
  ],
  MA: [
    { id: 2111300, codigoIbge: 2111300, nome: 'São Luís', ufSigla: 'MA', ufId: 21, populacao: 1115932, idhm: 0.768, pibPerCapita: 28560, rendaMedia: 2180, esperancaVida: 74.8, mortInfantil: 14.2, leitosPor1000: 2.8, medicosPor1000: 2.5, ideb: 5.2, txAlfabetizacao: 91.5, aguaEncanada: 82.5, esgotoAdequado: 45.2, coletaLixo: 92.5 },
    { id: 2105302, codigoIbge: 2105302, nome: 'Imperatriz', ufSigla: 'MA', ufId: 21, populacao: 259337, idhm: 0.731, pibPerCapita: 18560, rendaMedia: 1580, esperancaVida: 72.5, mortInfantil: 16.8, leitosPor1000: 2.2, medicosPor1000: 1.5, ideb: 4.8, txAlfabetizacao: 86.5, aguaEncanada: 75.2, esgotoAdequado: 28.5, coletaLixo: 85.6 },
  ],
  MG: [
    { id: 3106200, codigoIbge: 3106200, nome: 'Belo Horizonte', ufSigla: 'MG', ufId: 31, populacao: 2530701, idhm: 0.810, pibPerCapita: 42560, rendaMedia: 3250, esperancaVida: 77.2, mortInfantil: 10.5, leitosPor1000: 3.5, medicosPor1000: 4.2, ideb: 6.0, txAlfabetizacao: 96.5, aguaEncanada: 99.2, esgotoAdequado: 92.5, coletaLixo: 99.5 },
    { id: 3170206, codigoIbge: 3170206, nome: 'Uberlândia', ufSigla: 'MG', ufId: 31, populacao: 706597, idhm: 0.789, pibPerCapita: 45890, rendaMedia: 2890, esperancaVida: 76.5, mortInfantil: 11.2, leitosPor1000: 3.1, medicosPor1000: 3.2, ideb: 5.9, txAlfabetizacao: 95.8, aguaEncanada: 98.5, esgotoAdequado: 88.5, coletaLixo: 99.2 },
    { id: 3118601, codigoIbge: 3118601, nome: 'Contagem', ufSigla: 'MG', ufId: 31, populacao: 668949, idhm: 0.756, pibPerCapita: 52890, rendaMedia: 2280, esperancaVida: 75.2, mortInfantil: 12.5, leitosPor1000: 2.5, medicosPor1000: 1.8, ideb: 5.5, txAlfabetizacao: 94.2, aguaEncanada: 97.5, esgotoAdequado: 82.5, coletaLixo: 98.5 },
    { id: 3136702, codigoIbge: 3136702, nome: 'Juiz de Fora', ufSigla: 'MG', ufId: 31, populacao: 577532, idhm: 0.778, pibPerCapita: 32560, rendaMedia: 2580, esperancaVida: 76.2, mortInfantil: 11.8, leitosPor1000: 3.2, medicosPor1000: 3.5, ideb: 5.8, txAlfabetizacao: 95.5, aguaEncanada: 98.2, esgotoAdequado: 85.2, coletaLixo: 98.8 },
  ],
  MS: [
    { id: 5002704, codigoIbge: 5002704, nome: 'Campo Grande', ufSigla: 'MS', ufId: 50, populacao: 916001, idhm: 0.784, pibPerCapita: 35890, rendaMedia: 2680, esperancaVida: 76.2, mortInfantil: 12.5, leitosPor1000: 2.8, medicosPor1000: 2.8, ideb: 5.7, txAlfabetizacao: 95.2, aguaEncanada: 96.5, esgotoAdequado: 65.2, coletaLixo: 97.5 },
    { id: 5003702, codigoIbge: 5003702, nome: 'Dourados', ufSigla: 'MS', ufId: 50, populacao: 225495, idhm: 0.747, pibPerCapita: 32560, rendaMedia: 2180, esperancaVida: 74.8, mortInfantil: 14.2, leitosPor1000: 2.5, medicosPor1000: 2.1, ideb: 5.4, txAlfabetizacao: 93.5, aguaEncanada: 94.2, esgotoAdequado: 52.5, coletaLixo: 95.2 },
  ],
  MT: [
    { id: 5103403, codigoIbge: 5103403, nome: 'Cuiabá', ufSigla: 'MT', ufId: 51, populacao: 623614, idhm: 0.785, pibPerCapita: 38560, rendaMedia: 2780, esperancaVida: 75.8, mortInfantil: 12.8, leitosPor1000: 2.8, medicosPor1000: 2.8, ideb: 5.6, txAlfabetizacao: 94.8, aguaEncanada: 95.2, esgotoAdequado: 58.5, coletaLixo: 96.8 },
    { id: 5108402, codigoIbge: 5108402, nome: 'Várzea Grande', ufSigla: 'MT', ufId: 51, populacao: 287526, idhm: 0.734, pibPerCapita: 25890, rendaMedia: 1980, esperancaVida: 73.5, mortInfantil: 15.2, leitosPor1000: 2.1, medicosPor1000: 1.2, ideb: 5.1, txAlfabetizacao: 91.5, aguaEncanada: 92.5, esgotoAdequado: 42.5, coletaLixo: 94.5 },
    { id: 5106752, codigoIbge: 5106752, nome: 'Rondonópolis', ufSigla: 'MT', ufId: 51, populacao: 239634, idhm: 0.755, pibPerCapita: 52890, rendaMedia: 2380, esperancaVida: 74.8, mortInfantil: 13.5, leitosPor1000: 2.5, medicosPor1000: 1.8, ideb: 5.4, txAlfabetizacao: 93.2, aguaEncanada: 94.8, esgotoAdequado: 55.2, coletaLixo: 96.2 },
  ],
  PA: [
    { id: 1501402, codigoIbge: 1501402, nome: 'Belém', ufSigla: 'PA', ufId: 15, populacao: 1506420, idhm: 0.746, pibPerCapita: 22560, rendaMedia: 2050, esperancaVida: 73.5, mortInfantil: 15.2, leitosPor1000: 2.8, medicosPor1000: 2.5, ideb: 5.1, txAlfabetizacao: 91.2, aguaEncanada: 78.5, esgotoAdequado: 35.2, coletaLixo: 92.5 },
    { id: 1500800, codigoIbge: 1500800, nome: 'Ananindeua', ufSigla: 'PA', ufId: 15, populacao: 540410, idhm: 0.718, pibPerCapita: 14560, rendaMedia: 1450, esperancaVida: 71.8, mortInfantil: 17.5, leitosPor1000: 1.8, medicosPor1000: 0.9, ideb: 4.6, txAlfabetizacao: 86.5, aguaEncanada: 65.2, esgotoAdequado: 18.5, coletaLixo: 82.5 },
    { id: 1506807, codigoIbge: 1506807, nome: 'Santarém', ufSigla: 'PA', ufId: 15, populacao: 310536, idhm: 0.691, pibPerCapita: 15890, rendaMedia: 1280, esperancaVida: 70.5, mortInfantil: 19.2, leitosPor1000: 1.8, medicosPor1000: 1.1, ideb: 4.5, txAlfabetizacao: 82.5, aguaEncanada: 55.2, esgotoAdequado: 12.5, coletaLixo: 75.6 },
  ],
  PB: [
    { id: 2507507, codigoIbge: 2507507, nome: 'João Pessoa', ufSigla: 'PB', ufId: 25, populacao: 825796, idhm: 0.763, pibPerCapita: 25890, rendaMedia: 2180, esperancaVida: 74.5, mortInfantil: 14.8, leitosPor1000: 3.1, medicosPor1000: 2.8, ideb: 5.4, txAlfabetizacao: 92.5, aguaEncanada: 92.5, esgotoAdequado: 68.5, coletaLixo: 96.5 },
    { id: 2504009, codigoIbge: 2504009, nome: 'Campina Grande', ufSigla: 'PB', ufId: 25, populacao: 413830, idhm: 0.720, pibPerCapita: 18560, rendaMedia: 1680, esperancaVida: 72.8, mortInfantil: 16.5, leitosPor1000: 2.8, medicosPor1000: 2.2, ideb: 5.1, txAlfabetizacao: 88.5, aguaEncanada: 85.6, esgotoAdequado: 52.5, coletaLixo: 92.5 },
  ],
  PE: [
    { id: 2611606, codigoIbge: 2611606, nome: 'Recife', ufSigla: 'PE', ufId: 26, populacao: 1661017, idhm: 0.772, pibPerCapita: 32560, rendaMedia: 2580, esperancaVida: 75.2, mortInfantil: 13.5, leitosPor1000: 3.5, medicosPor1000: 3.8, ideb: 5.5, txAlfabetizacao: 93.5, aguaEncanada: 92.5, esgotoAdequado: 72.5, coletaLixo: 97.5 },
    { id: 2607901, codigoIbge: 2607901, nome: 'Jaboatão dos Guararapes', ufSigla: 'PE', ufId: 26, populacao: 711330, idhm: 0.717, pibPerCapita: 18560, rendaMedia: 1580, esperancaVida: 72.5, mortInfantil: 16.8, leitosPor1000: 2.2, medicosPor1000: 1.2, ideb: 4.8, txAlfabetizacao: 88.2, aguaEncanada: 82.5, esgotoAdequado: 45.2, coletaLixo: 92.5 },
    { id: 2609600, codigoIbge: 2609600, nome: 'Olinda', ufSigla: 'PE', ufId: 26, populacao: 393115, idhm: 0.735, pibPerCapita: 15890, rendaMedia: 1680, esperancaVida: 73.5, mortInfantil: 15.5, leitosPor1000: 2.5, medicosPor1000: 1.8, ideb: 5.0, txAlfabetizacao: 90.5, aguaEncanada: 88.5, esgotoAdequado: 52.5, coletaLixo: 94.5 },
  ],
  PI: [
    { id: 2211001, codigoIbge: 2211001, nome: 'Teresina', ufSigla: 'PI', ufId: 22, populacao: 871126, idhm: 0.751, pibPerCapita: 22560, rendaMedia: 1980, esperancaVida: 73.8, mortInfantil: 15.2, leitosPor1000: 2.8, medicosPor1000: 2.5, ideb: 5.2, txAlfabetizacao: 90.5, aguaEncanada: 88.5, esgotoAdequado: 28.5, coletaLixo: 92.5 },
    { id: 2207702, codigoIbge: 2207702, nome: 'Parnaíba', ufSigla: 'PI', ufId: 22, populacao: 152653, idhm: 0.687, pibPerCapita: 14560, rendaMedia: 1380, esperancaVida: 71.5, mortInfantil: 18.5, leitosPor1000: 2.1, medicosPor1000: 1.2, ideb: 4.7, txAlfabetizacao: 85.2, aguaEncanada: 78.5, esgotoAdequado: 18.5, coletaLixo: 85.6 },
  ],
  PR: [
    { id: 4106902, codigoIbge: 4106902, nome: 'Curitiba', ufSigla: 'PR', ufId: 41, populacao: 1963726, idhm: 0.823, pibPerCapita: 52890, rendaMedia: 3580, esperancaVida: 77.8, mortInfantil: 9.8, leitosPor1000: 3.5, medicosPor1000: 4.2, ideb: 6.2, txAlfabetizacao: 97.2, aguaEncanada: 99.5, esgotoAdequado: 95.2, coletaLixo: 99.8 },
    { id: 4113700, codigoIbge: 4113700, nome: 'Londrina', ufSigla: 'PR', ufId: 41, populacao: 580870, idhm: 0.778, pibPerCapita: 38560, rendaMedia: 2780, esperancaVida: 76.2, mortInfantil: 11.5, leitosPor1000: 3.1, medicosPor1000: 3.2, ideb: 5.9, txAlfabetizacao: 95.8, aguaEncanada: 98.5, esgotoAdequado: 88.5, coletaLixo: 99.2 },
    { id: 4115200, codigoIbge: 4115200, nome: 'Maringá', ufSigla: 'PR', ufId: 41, populacao: 436472, idhm: 0.808, pibPerCapita: 42560, rendaMedia: 3120, esperancaVida: 77.2, mortInfantil: 10.2, leitosPor1000: 3.2, medicosPor1000: 3.8, ideb: 6.1, txAlfabetizacao: 96.5, aguaEncanada: 99.2, esgotoAdequado: 92.5, coletaLixo: 99.5 },
    { id: 4119905, codigoIbge: 4119905, nome: 'Ponta Grossa', ufSigla: 'PR', ufId: 41, populacao: 358838, idhm: 0.763, pibPerCapita: 35890, rendaMedia: 2380, esperancaVida: 75.5, mortInfantil: 12.5, leitosPor1000: 2.8, medicosPor1000: 2.5, ideb: 5.7, txAlfabetizacao: 95.2, aguaEncanada: 97.5, esgotoAdequado: 82.5, coletaLixo: 98.5 },
  ],
  RJ: [
    { id: 3304557, codigoIbge: 3304557, nome: 'Rio de Janeiro', ufSigla: 'RJ', ufId: 33, populacao: 6775561, idhm: 0.799, pibPerCapita: 52890, rendaMedia: 3280, esperancaVida: 76.8, mortInfantil: 11.2, leitosPor1000: 3.5, medicosPor1000: 4.5, ideb: 5.8, txAlfabetizacao: 96.5, aguaEncanada: 98.5, esgotoAdequado: 88.5, coletaLixo: 99.2 },
    { id: 3303500, codigoIbge: 3303500, nome: 'Niterói', ufSigla: 'RJ', ufId: 33, populacao: 516981, idhm: 0.837, pibPerCapita: 45890, rendaMedia: 3980, esperancaVida: 78.2, mortInfantil: 9.5, leitosPor1000: 3.8, medicosPor1000: 5.2, ideb: 6.3, txAlfabetizacao: 97.5, aguaEncanada: 99.5, esgotoAdequado: 95.2, coletaLixo: 99.8 },
    { id: 3304904, codigoIbge: 3304904, nome: 'São Gonçalo', ufSigla: 'RJ', ufId: 33, populacao: 1098357, idhm: 0.739, pibPerCapita: 18560, rendaMedia: 1680, esperancaVida: 73.5, mortInfantil: 14.8, leitosPor1000: 2.1, medicosPor1000: 1.2, ideb: 4.9, txAlfabetizacao: 92.5, aguaEncanada: 92.5, esgotoAdequado: 62.5, coletaLixo: 96.5 },
    { id: 3301702, codigoIbge: 3301702, nome: 'Duque de Caxias', ufSigla: 'RJ', ufId: 33, populacao: 929449, idhm: 0.711, pibPerCapita: 35890, rendaMedia: 1580, esperancaVida: 72.5, mortInfantil: 16.2, leitosPor1000: 1.8, medicosPor1000: 0.9, ideb: 4.6, txAlfabetizacao: 90.5, aguaEncanada: 88.5, esgotoAdequado: 52.5, coletaLixo: 94.5 },
  ],
  RN: [
    { id: 2408102, codigoIbge: 2408102, nome: 'Natal', ufSigla: 'RN', ufId: 24, populacao: 896708, idhm: 0.763, pibPerCapita: 25890, rendaMedia: 2180, esperancaVida: 74.5, mortInfantil: 14.2, leitosPor1000: 3.1, medicosPor1000: 2.8, ideb: 5.4, txAlfabetizacao: 92.5, aguaEncanada: 92.5, esgotoAdequado: 55.2, coletaLixo: 96.5 },
    { id: 2407104, codigoIbge: 2407104, nome: 'Mossoró', ufSigla: 'RN', ufId: 24, populacao: 300618, idhm: 0.720, pibPerCapita: 22560, rendaMedia: 1780, esperancaVida: 72.8, mortInfantil: 16.5, leitosPor1000: 2.5, medicosPor1000: 1.8, ideb: 5.0, txAlfabetizacao: 88.5, aguaEncanada: 85.6, esgotoAdequado: 38.5, coletaLixo: 92.5 },
  ],
  RO: [
    { id: 1100205, codigoIbge: 1100205, nome: 'Porto Velho', ufSigla: 'RO', ufId: 11, populacao: 548952, idhm: 0.736, pibPerCapita: 32560, rendaMedia: 2280, esperancaVida: 73.5, mortInfantil: 15.8, leitosPor1000: 2.5, medicosPor1000: 1.8, ideb: 5.1, txAlfabetizacao: 91.5, aguaEncanada: 72.5, esgotoAdequado: 28.5, coletaLixo: 88.5 },
    { id: 1100122, codigoIbge: 1100122, nome: 'Ji-Paraná', ufSigla: 'RO', ufId: 11, populacao: 132667, idhm: 0.714, pibPerCapita: 28560, rendaMedia: 1980, esperancaVida: 72.5, mortInfantil: 17.2, leitosPor1000: 2.2, medicosPor1000: 1.2, ideb: 5.0, txAlfabetizacao: 89.5, aguaEncanada: 68.5, esgotoAdequado: 22.5, coletaLixo: 85.6 },
  ],
  RR: [
    { id: 1400100, codigoIbge: 1400100, nome: 'Boa Vista', ufSigla: 'RR', ufId: 14, populacao: 436591, idhm: 0.752, pibPerCapita: 28560, rendaMedia: 2180, esperancaVida: 73.8, mortInfantil: 15.2, leitosPor1000: 2.5, medicosPor1000: 2.1, ideb: 5.2, txAlfabetizacao: 92.5, aguaEncanada: 88.5, esgotoAdequado: 35.2, coletaLixo: 92.5 },
  ],
  RS: [
    { id: 4314902, codigoIbge: 4314902, nome: 'Porto Alegre', ufSigla: 'RS', ufId: 43, populacao: 1492530, idhm: 0.805, pibPerCapita: 52890, rendaMedia: 3580, esperancaVida: 77.5, mortInfantil: 10.2, leitosPor1000: 3.8, medicosPor1000: 4.8, ideb: 6.1, txAlfabetizacao: 97.2, aguaEncanada: 99.5, esgotoAdequado: 92.5, coletaLixo: 99.5 },
    { id: 4303905, codigoIbge: 4303905, nome: 'Caxias do Sul', ufSigla: 'RS', ufId: 43, populacao: 517451, idhm: 0.782, pibPerCapita: 58560, rendaMedia: 3180, esperancaVida: 76.8, mortInfantil: 10.8, leitosPor1000: 3.2, medicosPor1000: 3.2, ideb: 6.0, txAlfabetizacao: 96.5, aguaEncanada: 99.2, esgotoAdequado: 88.5, coletaLixo: 99.2 },
    { id: 4318705, codigoIbge: 4318705, nome: 'Santa Maria', ufSigla: 'RS', ufId: 43, populacao: 285159, idhm: 0.784, pibPerCapita: 28560, rendaMedia: 2580, esperancaVida: 76.2, mortInfantil: 11.5, leitosPor1000: 3.5, medicosPor1000: 3.8, ideb: 5.9, txAlfabetizacao: 96.2, aguaEncanada: 98.5, esgotoAdequado: 85.2, coletaLixo: 98.8 },
    { id: 4309209, codigoIbge: 4309209, nome: 'Gravataí', ufSigla: 'RS', ufId: 43, populacao: 283620, idhm: 0.736, pibPerCapita: 42560, rendaMedia: 2180, esperancaVida: 74.5, mortInfantil: 13.2, leitosPor1000: 2.2, medicosPor1000: 1.5, ideb: 5.5, txAlfabetizacao: 94.2, aguaEncanada: 96.5, esgotoAdequado: 72.5, coletaLixo: 97.5 },
  ],
  SC: [
    { id: 4205407, codigoIbge: 4205407, nome: 'Florianópolis', ufSigla: 'SC', ufId: 42, populacao: 516524, idhm: 0.847, pibPerCapita: 48560, rendaMedia: 3880, esperancaVida: 78.5, mortInfantil: 9.2, leitosPor1000: 3.5, medicosPor1000: 4.8, ideb: 6.4, txAlfabetizacao: 97.8, aguaEncanada: 99.5, esgotoAdequado: 92.5, coletaLixo: 99.8 },
    { id: 4209102, codigoIbge: 4209102, nome: 'Joinville', ufSigla: 'SC', ufId: 42, populacao: 604708, idhm: 0.809, pibPerCapita: 58560, rendaMedia: 3280, esperancaVida: 77.2, mortInfantil: 10.5, leitosPor1000: 3.2, medicosPor1000: 3.2, ideb: 6.1, txAlfabetizacao: 97.2, aguaEncanada: 99.2, esgotoAdequado: 72.5, coletaLixo: 99.5 },
    { id: 4202404, codigoIbge: 4202404, nome: 'Blumenau', ufSigla: 'SC', ufId: 42, populacao: 365100, idhm: 0.806, pibPerCapita: 52890, rendaMedia: 3180, esperancaVida: 77.5, mortInfantil: 10.2, leitosPor1000: 3.2, medicosPor1000: 3.5, ideb: 6.2, txAlfabetizacao: 97.5, aguaEncanada: 99.2, esgotoAdequado: 85.2, coletaLixo: 99.5 },
    { id: 4204608, codigoIbge: 4204608, nome: 'Criciúma', ufSigla: 'SC', ufId: 42, populacao: 217311, idhm: 0.788, pibPerCapita: 38560, rendaMedia: 2780, esperancaVida: 76.5, mortInfantil: 11.2, leitosPor1000: 2.8, medicosPor1000: 2.5, ideb: 5.9, txAlfabetizacao: 96.2, aguaEncanada: 98.5, esgotoAdequado: 78.5, coletaLixo: 98.8 },
  ],
  SE: [
    { id: 2800308, codigoIbge: 2800308, nome: 'Aracaju', ufSigla: 'SE', ufId: 28, populacao: 671661, idhm: 0.770, pibPerCapita: 28560, rendaMedia: 2280, esperancaVida: 74.8, mortInfantil: 14.5, leitosPor1000: 3.1, medicosPor1000: 2.8, ideb: 5.3, txAlfabetizacao: 92.5, aguaEncanada: 92.5, esgotoAdequado: 52.5, coletaLixo: 96.5 },
  ],
  SP: [
    { id: 3550308, codigoIbge: 3550308, nome: 'São Paulo', ufSigla: 'SP', ufId: 35, populacao: 12396372, idhm: 0.805, pibPerCapita: 65890, rendaMedia: 3680, esperancaVida: 77.8, mortInfantil: 10.5, leitosPor1000: 3.5, medicosPor1000: 4.5, ideb: 6.0, txAlfabetizacao: 96.8, aguaEncanada: 99.5, esgotoAdequado: 92.5, coletaLixo: 99.8 },
    { id: 3509502, codigoIbge: 3509502, nome: 'Campinas', ufSigla: 'SP', ufId: 35, populacao: 1223237, idhm: 0.805, pibPerCapita: 58560, rendaMedia: 3580, esperancaVida: 77.5, mortInfantil: 10.2, leitosPor1000: 3.5, medicosPor1000: 4.2, ideb: 6.1, txAlfabetizacao: 97.2, aguaEncanada: 99.5, esgotoAdequado: 95.2, coletaLixo: 99.8 },
    { id: 3518800, codigoIbge: 3518800, nome: 'Guarulhos', ufSigla: 'SP', ufId: 35, populacao: 1404694, idhm: 0.763, pibPerCapita: 42560, rendaMedia: 2280, esperancaVida: 75.2, mortInfantil: 12.5, leitosPor1000: 2.5, medicosPor1000: 1.8, ideb: 5.5, txAlfabetizacao: 94.5, aguaEncanada: 97.5, esgotoAdequado: 82.5, coletaLixo: 98.5 },
    { id: 3547809, codigoIbge: 3547809, nome: 'Santo André', ufSigla: 'SP', ufId: 35, populacao: 721368, idhm: 0.815, pibPerCapita: 45890, rendaMedia: 3180, esperancaVida: 77.2, mortInfantil: 10.8, leitosPor1000: 3.2, medicosPor1000: 3.5, ideb: 6.0, txAlfabetizacao: 96.8, aguaEncanada: 99.2, esgotoAdequado: 92.5, coletaLixo: 99.5 },
    { id: 3548708, codigoIbge: 3548708, nome: 'São Bernardo do Campo', ufSigla: 'SP', ufId: 35, populacao: 849874, idhm: 0.805, pibPerCapita: 58560, rendaMedia: 3280, esperancaVida: 77.5, mortInfantil: 10.5, leitosPor1000: 3.1, medicosPor1000: 3.2, ideb: 5.9, txAlfabetizacao: 96.5, aguaEncanada: 99.2, esgotoAdequado: 92.5, coletaLixo: 99.5 },
    { id: 3534401, codigoIbge: 3534401, nome: 'Osasco', ufSigla: 'SP', ufId: 35, populacao: 701386, idhm: 0.776, pibPerCapita: 72560, rendaMedia: 2680, esperancaVida: 76.2, mortInfantil: 11.8, leitosPor1000: 2.8, medicosPor1000: 2.5, ideb: 5.7, txAlfabetizacao: 95.5, aguaEncanada: 98.5, esgotoAdequado: 88.5, coletaLixo: 99.2 },
    { id: 3543402, codigoIbge: 3543402, nome: 'Ribeirão Preto', ufSigla: 'SP', ufId: 35, populacao: 720116, idhm: 0.800, pibPerCapita: 48560, rendaMedia: 3280, esperancaVida: 77.2, mortInfantil: 10.5, leitosPor1000: 3.5, medicosPor1000: 4.2, ideb: 6.1, txAlfabetizacao: 97.2, aguaEncanada: 99.5, esgotoAdequado: 98.5, coletaLixo: 99.8 },
    { id: 3549805, codigoIbge: 3549805, nome: 'São José dos Campos', ufSigla: 'SP', ufId: 35, populacao: 737310, idhm: 0.807, pibPerCapita: 62560, rendaMedia: 3380, esperancaVida: 77.5, mortInfantil: 10.2, leitosPor1000: 3.2, medicosPor1000: 3.5, ideb: 6.1, txAlfabetizacao: 97.2, aguaEncanada: 99.5, esgotoAdequado: 95.2, coletaLixo: 99.8 },
    { id: 3552205, codigoIbge: 3552205, nome: 'Sorocaba', ufSigla: 'SP', ufId: 35, populacao: 695328, idhm: 0.798, pibPerCapita: 45890, rendaMedia: 3080, esperancaVida: 76.8, mortInfantil: 11.2, leitosPor1000: 3.1, medicosPor1000: 3.2, ideb: 6.0, txAlfabetizacao: 96.8, aguaEncanada: 99.2, esgotoAdequado: 92.5, coletaLixo: 99.5 },
  ],
  TO: [
    { id: 1721000, codigoIbge: 1721000, nome: 'Palmas', ufSigla: 'TO', ufId: 17, populacao: 313349, idhm: 0.788, pibPerCapita: 35890, rendaMedia: 2580, esperancaVida: 75.2, mortInfantil: 13.2, leitosPor1000: 2.8, medicosPor1000: 2.5, ideb: 5.6, txAlfabetizacao: 95.2, aguaEncanada: 92.5, esgotoAdequado: 55.2, coletaLixo: 95.5 },
    { id: 1702109, codigoIbge: 1702109, nome: 'Araguaína', ufSigla: 'TO', ufId: 17, populacao: 183381, idhm: 0.752, pibPerCapita: 25890, rendaMedia: 1980, esperancaVida: 73.5, mortInfantil: 15.5, leitosPor1000: 2.5, medicosPor1000: 1.8, ideb: 5.2, txAlfabetizacao: 91.5, aguaEncanada: 85.6, esgotoAdequado: 35.2, coletaLixo: 92.5 },
  ],
  AP: [
    { id: 1600303, codigoIbge: 1600303, nome: 'Macapá', ufSigla: 'AP', ufId: 16, populacao: 522357, idhm: 0.733, pibPerCapita: 22560, rendaMedia: 1980, esperancaVida: 73.2, mortInfantil: 15.8, leitosPor1000: 2.5, medicosPor1000: 1.8, ideb: 4.9, txAlfabetizacao: 90.5, aguaEncanada: 72.5, esgotoAdequado: 18.5, coletaLixo: 88.5 },
    { id: 1600600, codigoIbge: 1600600, nome: 'Santana', ufSigla: 'AP', ufId: 16, populacao: 123096, idhm: 0.692, pibPerCapita: 14560, rendaMedia: 1380, esperancaVida: 71.5, mortInfantil: 18.5, leitosPor1000: 1.8, medicosPor1000: 0.8, ideb: 4.5, txAlfabetizacao: 85.2, aguaEncanada: 58.5, esgotoAdequado: 12.5, coletaLixo: 78.5 },
  ],
};

// Get all municipalities for a state
export function getMunicipiosPorUF(ufSigla: string): Municipio[] {
  return MUNICIPIOS_POR_UF[ufSigla] || [];
}

// Get a single municipality by code
export function getMunicipioByCode(codigoIbge: number): Municipio | undefined {
  for (const ufs of Object.values(MUNICIPIOS_POR_UF)) {
    const found = ufs.find(m => m.codigoIbge === codigoIbge);
    if (found) return found;
  }
  return undefined;
}

// Get municipalities with similar characteristics
export function getMunicipiosSimilares(municipio: Municipio, quantidade = 10): Municipio[] {
  const todos: Municipio[] = [];
  Object.values(MUNICIPIOS_POR_UF).forEach(ufs => {
    ufs.forEach(m => {
      if (m.codigoIbge !== municipio.codigoIbge) {
        todos.push(m);
      }
    });
  });

  // Calculate similarity score
  return todos
    .map(m => {
      const popScore = 1 - Math.abs(Math.log10(m.populacao) - Math.log10(municipio.populacao)) / 3;
      const idhmScore = 1 - Math.abs(m.idhm - municipio.idhm) * 10;
      const score = popScore * 0.4 + idhmScore * 0.6;
      return { municipio: m, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, quantidade)
    .map(item => item.municipio);
}
