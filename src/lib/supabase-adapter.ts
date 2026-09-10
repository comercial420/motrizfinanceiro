import type { Moto, Cliente, Contrato, LancamentoFinanceiro } from '@/types';
import { useStore } from './store';

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// --- Data Adapter Interface ---
// Mirrors the Zustand store API but allows swapping backend implementations.

export interface DataAdapter {
  // Motos
  getMotos: () => Moto[];
  addMoto: (moto: Moto) => void | Promise<void>;
  updateMoto: (id: string, data: Partial<Moto>) => void | Promise<void>;
  removeMoto: (id: string) => void | Promise<void>;

  // Clientes
  getClientes: () => Cliente[];
  addCliente: (cliente: Cliente) => void | Promise<void>;
  updateCliente: (id: string, data: Partial<Cliente>) => void | Promise<void>;
  removeCliente: (id: string) => void | Promise<void>;

  // Contratos
  getContratos: () => Contrato[];
  addContrato: (contrato: Contrato) => void | Promise<void>;
  updateContrato: (id: string, data: Partial<Contrato>) => void | Promise<void>;
  removeContrato: (id: string) => void | Promise<void>;

  // Lançamentos
  getLancamentos: () => LancamentoFinanceiro[];
  addLancamento: (lancamento: LancamentoFinanceiro) => void | Promise<void>;
  updateLancamento: (id: string, data: Partial<LancamentoFinanceiro>) => void | Promise<void>;
  removeLancamento: (id: string) => void | Promise<void>;
}

// --- Local Storage Adapter (Zustand) ---

class LocalDataAdapter implements DataAdapter {
  getMotos() {
    return useStore.getState().motos;
  }
  addMoto(moto: Moto) {
    useStore.getState().addMoto(moto);
  }
  updateMoto(id: string, data: Partial<Moto>) {
    useStore.getState().updateMoto(id, data);
  }
  removeMoto(id: string) {
    useStore.getState().removeMoto(id);
  }

  getClientes() {
    return useStore.getState().clientes;
  }
  addCliente(cliente: Cliente) {
    useStore.getState().addCliente(cliente);
  }
  updateCliente(id: string, data: Partial<Cliente>) {
    useStore.getState().updateCliente(id, data);
  }
  removeCliente(id: string) {
    useStore.getState().removeCliente(id);
  }

  getContratos() {
    return useStore.getState().contratos;
  }
  addContrato(contrato: Contrato) {
    useStore.getState().addContrato(contrato);
  }
  updateContrato(id: string, data: Partial<Contrato>) {
    useStore.getState().updateContrato(id, data);
  }
  removeContrato(id: string) {
    useStore.getState().removeContrato(id);
  }

  getLancamentos() {
    return useStore.getState().lancamentos;
  }
  addLancamento(lancamento: LancamentoFinanceiro) {
    useStore.getState().addLancamento(lancamento);
  }
  updateLancamento(id: string, data: Partial<LancamentoFinanceiro>) {
    useStore.getState().updateLancamento(id, data);
  }
  removeLancamento(id: string) {
    useStore.getState().removeLancamento(id);
  }
}

// --- Supabase Adapter (Placeholder) ---

class SupabaseDataAdapter implements DataAdapter {
  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not found. Falling back to local behavior or errors.');
    }
    // TODO: Initialize Supabase client here
    // this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  getMotos(): Moto[] {
    // TODO: Implement Supabase query: select * from motos
    throw new Error('Supabase adapter not yet implemented for getMotos');
  }

  async addMoto(moto: Moto): Promise<void> {
    // TODO: Implement Supabase insert: insert into motos values (...)
    void moto;
    throw new Error('Supabase adapter not yet implemented for addMoto');
  }

  async updateMoto(id: string, data: Partial<Moto>): Promise<void> {
    // TODO: Implement Supabase update: update motos set ... where id = ?
    void id;
    void data;
    throw new Error('Supabase adapter not yet implemented for updateMoto');
  }

  async removeMoto(id: string): Promise<void> {
    // TODO: Implement Supabase delete: delete from motos where id = ?
    void id;
    throw new Error('Supabase adapter not yet implemented for removeMoto');
  }

  getClientes(): Cliente[] {
    // TODO: Implement Supabase query: select * from clientes
    throw new Error('Supabase adapter not yet implemented for getClientes');
  }

  async addCliente(cliente: Cliente): Promise<void> {
    // TODO: Implement Supabase insert: insert into clientes values (...)
    void cliente;
    throw new Error('Supabase adapter not yet implemented for addCliente');
  }

  async updateCliente(id: string, data: Partial<Cliente>): Promise<void> {
    // TODO: Implement Supabase update: update clientes set ... where id = ?
    void id;
    void data;
    throw new Error('Supabase adapter not yet implemented for updateCliente');
  }

  async removeCliente(id: string): Promise<void> {
    // TODO: Implement Supabase delete: delete from clientes where id = ?
    void id;
    throw new Error('Supabase adapter not yet implemented for removeCliente');
  }

  getContratos(): Contrato[] {
    // TODO: Implement Supabase query: select * from contratos
    throw new Error('Supabase adapter not yet implemented for getContratos');
  }

  async addContrato(contrato: Contrato): Promise<void> {
    // TODO: Implement Supabase insert: insert into contratos values (...)
    void contrato;
    throw new Error('Supabase adapter not yet implemented for addContrato');
  }

  async updateContrato(id: string, data: Partial<Contrato>): Promise<void> {
    // TODO: Implement Supabase update: update contratos set ... where id = ?
    void id;
    void data;
    throw new Error('Supabase adapter not yet implemented for updateContrato');
  }

  async removeContrato(id: string): Promise<void> {
    // TODO: Implement Supabase delete: delete from contratos where id = ?
    void id;
    throw new Error('Supabase adapter not yet implemented for removeContrato');
  }

  getLancamentos(): LancamentoFinanceiro[] {
    // TODO: Implement Supabase query: select * from lancamentos_financeiros
    throw new Error('Supabase adapter not yet implemented for getLancamentos');
  }

  async addLancamento(lancamento: LancamentoFinanceiro): Promise<void> {
    // TODO: Implement Supabase insert: insert into lancamentos_financeiros values (...)
    void lancamento;
    throw new Error('Supabase adapter not yet implemented for addLancamento');
  }

  async updateLancamento(id: string, data: Partial<LancamentoFinanceiro>): Promise<void> {
    // TODO: Implement Supabase update: update lancamentos_financeiros set ... where id = ?
    void id;
    void data;
    throw new Error('Supabase adapter not yet implemented for updateLancamento');
  }

  async removeLancamento(id: string): Promise<void> {
    // TODO: Implement Supabase delete: delete from lancamentos_financeiros where id = ?
    void id;
    throw new Error('Supabase adapter not yet implemented for removeLancamento');
  }
}

// --- Factory ---

export function createDataAdapter(mode: 'local' | 'supabase'): DataAdapter {
  if (mode === 'supabase') {
    return new SupabaseDataAdapter();
  }
  return new LocalDataAdapter();
}