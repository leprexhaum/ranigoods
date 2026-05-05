export interface DashboardStats {
  receitaTotal:    number
  totalPagamentos: number
  vendas:          number
  falhas:          number
  pendentes:       number
  reembolsos:      number
  disputados:      number
  processando:     number
  taxaConversao:   number
  ticketMedio:     number
  // comparação com período anterior
  receitaChange:    number
  vendasChange:     number
  falhasChange:     number
  conversaoChange:  number
  ticketChange:     number
}

export interface DailySale {
  date:    string
  isoDate: string
  receita: number
  vendas:  number
  falhas:  number
}

export interface DashboardResponse {
  stats:    DashboardStats
  sales:    DailySale[]
}
