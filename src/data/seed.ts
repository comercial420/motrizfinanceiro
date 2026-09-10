import type { Funcionario } from '@/types';
import { useStore } from '@/lib/store';

// --- Public Loader ---

export function loadSeedData(): boolean {
  const store = useStore.getState();

  // Only populate if store is completely empty
  if (store.motos.length > 0 || store.clientes.length > 0 || store.funcionarios.length > 0) {
    return false;
  }

  // Apenas os sócios/funcionários base — sem dados fictícios
  const funcionarios: Funcionario[] = [
    {
      id: 'func-joao',
      nome: 'João',
      ativo: true,
      funcao: 'Comercial',
      salario: 0,
      percentualEmpresa: 10,
      percentualComissaoContratos: 0,
      percentualComissaoManutencao: 0,
      origemComissao: 'Nenhum',
      ehSocio: true,
      observacoes: 'Sócio - 10% da empresa',
    },
    {
      id: 'func-murilo',
      nome: 'Murilo',
      ativo: true,
      funcao: 'Sócio',
      salario: 0,
      percentualEmpresa: 90,
      percentualComissaoContratos: 0,
      percentualComissaoManutencao: 0,
      origemComissao: 'Nenhum',
      ehSocio: true,
      observacoes: 'Sócio majoritário - 90% da empresa',
    },
  ];

  for (const func of funcionarios) store.addFuncionario(func);

  return true;
}

// Export empty seed data
export const seedData = {
  motos: [],
  clientes: [],
  contratos: [],
  lancamentos: [],
};