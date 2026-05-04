export interface DashboardStats {
  receitaTotal: number
  totalPagamentos: number
  vendas: number
  falhas: number
  taxaConversao: number
  ticketMedio: number
}

export interface DailySale {
  date: string
  isoDate: string
  receita: number
  vendas: number
  falhas: number
}

export interface DashboardResponse {
  stats: DashboardStats
  sales: DailySale[]
}
