// MODELOS DE MOTO PERMITIDOS PARA LOCAÇÃO
export type RentalModel = 'M3K' | 'Z3K' | 'U3K' | 'U5K' | 'Tóquio';

// MODELOS DE ESTOQUE PARADO (NÃO GERAM RECEITA RECORRENTE)
export type StockOnlyModel = 'S8K' | 'R8K' | 'Vespa';

export type MotoModel = RentalModel | StockOnlyModel;

export type MotoCor = 'Azul' | 'Preto' | 'Cinza' | 'Amarelo' | 'Vermelho' | 'Verde' | 'Branco' | 'Marrom' | 'Bege';

export interface MotoPreparacao {
  suporteInstalado?: boolean;
  bau?: boolean;
  giroflex?: boolean;
  mataCachorro?: boolean;
  plotagem?: boolean; // Logotipo e artes das empresas de segurança
}

export type MotoPecaFaltante =
  | 'Bateria'
  | 'Motor'
  | 'Carenagem Lateral Direita'
  | 'Carenagem Lateral Esquerda'
  | 'Pneus'
  | 'Módulo'
  | 'Módulo de Ignição'
  | 'Módulo de Controle'
  | 'Painel de Controle'
  | 'Farol'
  | 'Manete de Aceleração'
  | 'Manete de Controle'
  | 'Freios'
  | 'Pastilha de Freio'
  | 'Paralama'
  | 'Banco'
  | 'Retrovisores';

export type MotoLocalizacao = 'Galpão' | 'Cliente' | 'Técnico' | 'Fazenda Boa Vista' | 'Loja';

export interface Moto {
  id: string; // UUID
  chassi: string; // UNIQUE, Identificador Físico Real
  modelo: MotoModel;
  status: 'Disponível para Operar' | 'Em Contrato' | 'Em Test Ride' | 'Em Manutenção' | 'Aguardando Peça' | 'Aguardando Conserto';
  cor?: MotoCor;
  localizacao?: MotoLocalizacao; // Onde a moto está fisicamente
  localOperacaoId?: string; // ID do LocalOperacao do cliente onde a moto está atuando
  valorContabil?: number; // Para estoque parado
  observacoes?: string;
  preparacao?: MotoPreparacao; // Checklist para motos em contrato
  pecasFaltantes?: MotoPecaFaltante[]; // Lista de peças que faltam (para Aguardando Peça/Conserto)
}

export interface LocalOperacao {
  id: string;
  nome: string; // Nome do condomínio/local
  endereco: string;
  observacoes?: string;
}

export interface Cliente {
  id: string;
  nome: string; // Nome da empresa
  cnpj?: string;
  contato?: string; // Número de contato
  responsavel?: string; // Responsável pelo contato
  locaisOperacao?: LocalOperacao[]; // Condomínios/locais onde as motos atuam
}

export type CarregadorTipo = '5A' | '10A';

export interface MotoContratoValor {
  motoId: string;
  valorMensal: number; // Valor individual desta moto no contrato
}

export interface LocacaoExtra {
  id: string;
  tipo: 'Peça Estoque';
  pecaEstoqueId?: string; // ID da peça no estoque
  quantidadeAlugada?: number; // Quantidade de unidades alugadas (padrão 1)
  valorUnitario?: number; // Valor por unidade alugada/mês
  valorMensal: number; // Total = quantidadeAlugada * valorUnitario
  observacoes?: string;
  localOperacaoId?: string; // ID do LocalOperacao onde o item extra está
}

export interface Contrato {
  id: string;
  clienteId: string;
  numeroContrato: string;
  dataInicio: Date;
  dataTermino?: Date;
  diaVencimento: number; // Dia do mês para faturamento
  valorMensalTotal: number;
  motosVinculadas: string[]; // Array de IDs de Moto
  valoresPorMoto?: MotoContratoValor[]; // Valor individual de cada moto no contrato
  locacoesExtras?: LocacaoExtra[]; // Baterias e carregadores extras alugados
  regraComissaoSocio?: number; // % sobre receita deste contrato
  regraComissaoTecnico?: number; // % ou valor fixo por moto ativa
  status: 'Ativo' | 'Encerrado' | 'Suspenso';
}

export interface TestRide {
  id: string;
  clienteId: string; // ID do cliente (pode ser novo ou existente)
  motosVinculadas: string[]; // Array de IDs de Moto em test ride
  dataInicio: Date;
  dataPrevisaoRetorno?: Date; // Previsão de quando a moto volta
  localOperacaoId?: string; // Local onde a moto está durante o test ride
  observacoes?: string;
  status: 'Ativo' | 'Finalizado';
  statusRetornoMoto?: Moto['status']; // Status que a moto voltará ao finalizar
}

// --- HISTÓRICO DE VENDAS DE MOTO ---
export interface HistoricoVendaMoto {
  id: string;
  motoId: string;
  chassi: string;
  modelo: string;
  cor?: string;
  valorContabil: number;
  valorVenda: number;
  impostoPercentual: number;
  impostoValor: number;
  comissaoPercentual: number;
  comissaoValor: number;
  lucroLiquido: number;
  dataVenda: Date;
  statusPagamento: 'Recebido' | 'Previsto' | 'Pendente';
  funcionarioResponsavelId: string;
  compradorNome: string;
  compradorCpf: string;
  compradorCelular: string;
  observacoes?: string;
  lancamentoComissaoId?: string;

  // PARCELAMENTO
  ehParcelada?: boolean;
  numeroParcelas?: number;
  valorParcela?: number;
  parcelasRecebidasCount?: number;
}

export interface PecaEstoque {
  id: string;
  nome: string;
  categoria: string; // Ex: Elétrica, Mecânica, Carroceria, Acessório
  quantidade: number;
  quantidadeMinima?: number; // Alerta quando abaixo disso
  custoUnitario?: number;
  fornecedor?: string;
  observacoes?: string;
}

// --- FUNCIONÁRIOS / SÓCIOS ---
export type FuncaoFuncionario = 'Comercial' | 'Administrativo' | 'Operacional' | 'Marketing' | 'Técnico' | 'Sócio' | 'Outros';

export type OrigemComissao = 'Contratos de Locação' | 'Vendas de Motos' | 'Ambos' | 'Nenhum';

export interface Funcionario {
  id: string;
  nome: string;
  ativo: boolean;
  funcao: FuncaoFuncionario;
  salario: number; // Salário fixo mensal ou pró-labore
  percentualEmpresa: number; // % de participação na empresa (0 se não é sócio)
  percentualComissaoContratos: number; // % de comissão sobre aluguéis pós-imposto (0 se não recebe)
  percentualComissaoManutencao: number; // % de comissão sobre lucro líquido de manutenções de mau uso (0 se não recebe)
  origemComissao: OrigemComissao; // De onde vem a base de cálculo da comissão
  ehSocio: boolean; // Flag rápida para identificar sócios
  observacoes?: string;
  contratosVinculados?: string[]; // IDs dos contratos que este funcionário atende (salário/comissão seguem vigência)
  comissaoPorContrato?: Record<string, number>; // Mapa contratoId → % de comissão deste sócio neste contrato
}

// TIPOS DE VISITA TÉCNICA
export type TipoVisitaTecnico =
  | 'Contrato Ativo'      // Visita em moto de contrato ativo (pode gerar cobrança se mau uso)
  | 'Test Ride'           // Visita para test ride (custo nosso, não cobra cliente)
  | 'Inesperada'          // Visita inesperada/auxílio (custo nosso, não cobra cliente)
  | 'Manutenção Preventiva' // Manutenção programada
  | 'Manutenção Corretiva'; // Conserto não previsto

// CATEGORIAS DE CUSTO DE VISITA
export type CategoriaCustoVisita =
  | 'Mão de Obra'         // Valor do serviço do técnico
  | 'Gasolina/Transporte' // Combustível e deslocamento
  | 'Peças'               // Peças substituídas
  | 'Ferramentas'         // Ferramentas especiais
  | 'Outros';             // Outros custos relacionados

export interface LancamentoFinanceiro {
  id: string;
  tipo: 'Recebemos' | 'Pagamos';
  valor: number;
  data: Date;
  descricao: string;
  classificacao: string; // Ex: Aluguel, Energia, Comissão, Importação
  categoria: 'Fixo' | 'Variável' | 'Extraordinário' | 'CAPEX';
  centroCusto: 'Operacional' | 'Comercial' | 'Administrativo' | 'Financeiro' | 'Marketing';
  formaPagamento: 'PIX' | 'Boleto' | 'Cartão' | 'Transferência' | 'Dinheiro' | 'Outros';
  status: 'Pago' | 'Recebido' | 'Pendente' | 'Previsto';

  // VÍNCULOS CRÍTICOS
  contratoId?: string; // Se for receita de locação ou comissão vinculada
  motoChassi?: string; // Rastreabilidade até o ativo físico
  funcionarioResponsavelId?: string; // ID do funcionário responsável (para vendas/comissões)
  ehComissaoSocio?: boolean;
  ehComissaoTecnico?: boolean;
  ehInvestimento?: boolean; // CAPEX não entra no resultado operacional

  // CAMPOS PARA LANÇAMENTOS FIXOS RECORRENTES
  ehRecorrente?: boolean; // Se true, este lançamento é um template que se replica mensalmente
  recorrenciaFim?: Date; // Data final da recorrência (para contratos com prazo definido)
  grupoRecorrenciaId?: string; // ID que agrupa todas as instâncias de uma mesma recorrência
  nomeEmpresa?: string; // Nome da empresa (para receitas de aluguel/contrato)

  // DATA DE VENCIMENTO/PAGAMENTO (para fixos)
  dataVencimento?: Date; // Último dia para pagar/receber (diferente da data do lançamento)

  // CAMPOS PARA CUSTOS DE VISITA TÉCNICA
  ehVisitaTecnico?: boolean; // Flag para identificar lançamentos de visita técnica
  tipoVisita?: TipoVisitaTecnico; // Tipo da visita (Contrato Ativo, Test Ride, Inesperada, etc.)
  categoriaCustoVisita?: CategoriaCustoVisita; // Categoria do custo (Mão de Obra, Gasolina, Peças, etc.)
  ehMauUso?: boolean; // Se foi identificado mau uso pelo cliente (permite cobrar)
  valorCobrarCliente?: number; // Valor a cobrar do cliente em caso de mau uso
  tecnicoResponsavel?: string; // Nome do técnico que realizou a visita
  observacoesVisita?: string; // Observações específicas da visita

  // CAMPOS PARA COBRANÇA DE MAU USO (lançamento "Recebemos" vinculado)
  ehCobrancaMauUso?: boolean; // Flag: este lançamento é uma cobrança de mau uso
  visitaMauUsoId?: string; // ID do lançamento de visita técnica que originou esta cobrança
  custoItensMauUso?: number; // Custo total dos itens/peças usados na manutenção
  lucroMauUso?: number; // Lucro líquido calculado: valorCobrado - imposto - custoItens - comissãoTécnico

  // CAMPOS PARA PEÇAS USADAS NA VISITA (baixa automática do estoque)
  pecasUsadas?: Array<{ pecaId: string; nome: string; quantidade: number; custoUnitario: number; subtotal: number }>;

  // VÍNCULO COM PARCELAMENTO DE VENDA
  vendaId?: string;           // ID do HistoricoVendaMoto que originou esta parcela
  parcelaNumero?: number;     // Número desta parcela (1..N)
  totalParcelas?: number;     // Total de parcelas da venda (para exibir "3/6")
}

// --- APORTES E REPAGAMENTO AOS SÓCIOS ---
export type MotivoAporte =
  | 'Compra de Motos'
  | 'Compra de Equipamentos'
  | 'Preparação de Motos'
  | 'Bater Contas Faltantes'
  | 'Compra de Peças'
  | 'Outros';

export interface AporteSocio {
  id: string;
  socioId: string;           // ID do Funcionario (ehSocio = true)
  valor: number;             // Valor total do aporte
  data: Date;
  descricao: string;
  motivo: MotivoAporte;      // Motivo específico do aporte
  tipo: 'Inicial' | 'Operacional' | 'Expansao';
  percentualSocietarioNaData: number;
  ativo: boolean;            // Se ainda há saldo a devolver
}

export interface ParcelaRepagamento {
  id: string;
  aporteId: string;
  socioId: string;
  numero: number;
  valorOriginal: number;     // Valor original da parcela
  valorPago: number;         // Quanto já foi pago (pode ser > original se amortizou)
  dataPrevista: Date;
  dataPagamento?: Date;
  status: 'Pendente' | 'Pago' | 'Amortizado';
  lancamentoId?: string;
  observacoes?: string;
}

// Type Guards
const RENTAL_MODELS: RentalModel[] = ['M3K', 'Z3K', 'U3K', 'U5K', 'Tóquio'];
const STOCK_ONLY_MODELS: StockOnlyModel[] = ['S8K', 'R8K', 'Vespa'];

export function isRentalModel(model: MotoModel): model is RentalModel {
  return RENTAL_MODELS.includes(model as RentalModel);
}

export function isStockOnlyModel(model: MotoModel): model is StockOnlyModel {
  return STOCK_ONLY_MODELS.includes(model as StockOnlyModel);
}