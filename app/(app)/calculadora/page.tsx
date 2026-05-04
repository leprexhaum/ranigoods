'use client'

import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Megaphone, ShoppingCart, Settings2, Info,
} from 'lucide-react'
import clsx from 'clsx'
import { formatEUR, formatBRL, eurToBrlStr, eurToBrlCents, EUR_TO_BRL_RATE } from '@/lib/utils/currency'

type Moeda = 'EUR' | 'BRL'

// ─── CurrencyInput ────────────────────────────────────────────────────────────

function CurrencyInput({
  label, hint, value, onChange, moeda, onMoeda, placeholder = '0,00',
}: {
  label: string; hint?: string
  value: string; onChange: (v: string) => void
  moeda: Moeda;  onMoeda: (m: Moeda) => void
  placeholder?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-ep-secondary text-xs font-medium">{label}</label>
        <div className="flex items-center rounded-md border border-ep-border-default overflow-hidden">
          {(['EUR', 'BRL'] as Moeda[]).map(m => (
            <button
              key={m}
              onClick={() => onMoeda(m)}
              className={clsx(
                'px-2 py-0.5 text-xs font-semibold transition-colors',
                moeda === m
                  ? 'bg-ep-accent text-ep-base'
                  : 'bg-ep-raised text-ep-muted hover:text-ep-primary',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted text-sm font-medium select-none">
          {moeda === 'EUR' ? '€' : 'R$'}
        </span>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^\d,\.]/g, ''))}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2.5 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm font-semibold placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
        />
      </div>
      {hint && <p className="text-ep-muted text-xs mt-1">{hint}</p>}
    </div>
  )
}

// ─── TaxField ─────────────────────────────────────────────────────────────────

function TaxField({
  label, value, onChange, suffix = '%', hint,
}: { label: string; value: string; onChange: (v: string) => void; suffix?: string; hint?: string }) {
  return (
    <div>
      <label className="text-ep-secondary text-xs block mb-1">{label}</label>
      <div className="relative">
        <input
          type="number" step="0.1" min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pr-8 pl-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm focus:outline-none focus:border-ep-accent"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ep-muted text-xs">{suffix}</span>
      </div>
      {hint && <p className="text-ep-muted text-xs mt-0.5">{hint}</p>}
    </div>
  )
}

// ─── ResultRow ────────────────────────────────────────────────────────────────

function ResultRow({
  label, eurCents, variant = 'default', bold, sub,
}: {
  label: string; eurCents: number
  variant?: 'default' | 'deduct' | 'accent' | 'danger' | 'muted'
  bold?: boolean; sub?: string
}) {
  const colorMap = {
    default: 'text-ep-primary',
    deduct:  'text-ep-danger',
    accent:  'text-ep-accent',
    danger:  'text-ep-danger',
    muted:   'text-ep-muted',
  }
  const sign = variant === 'deduct' ? '- ' : ''
  const absEur = Math.abs(eurCents)

  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className={clsx('text-sm', bold ? 'font-semibold' : 'font-normal', colorMap[variant])}>{label}</p>
        {sub && <p className="text-ep-muted text-xs">{sub}</p>}
      </div>
      <div className="flex-shrink-0 text-right">
        <p className={clsx('text-sm font-semibold tabular-nums', colorMap[variant])}>
          {sign}{formatEUR(absEur)}
        </p>
        <p className="text-ep-muted text-xs tabular-nums">
          {sign}≈ {eurToBrlStr(absEur)}
        </p>
      </div>
    </div>
  )
}

// ─── MetricBadge ──────────────────────────────────────────────────────────────

function MetricBadge({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-ep-raised border border-ep-border-default rounded-lg p-3 text-center">
      <p className="text-ep-muted text-xs mb-1">{label}</p>
      <p className={clsx(
        'text-lg font-bold tabular-nums',
        positive === true  ? 'text-ep-success' :
        positive === false ? 'text-ep-danger'  : 'text-ep-accent',
      )}>
        {value}
      </p>
      {sub && <p className="text-ep-muted text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseVal(str: string): number {
  return parseFloat(str.replace(',', '.')) || 0
}

function toEurCents(str: string, moeda: Moeda): number {
  const val = parseVal(str) * 100  // to cents in given currency
  if (moeda === 'EUR') return Math.round(val)
  return Math.round(val / EUR_TO_BRL_RATE)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalculadoraPage() {
  // Inputs
  const [numVendas,       setNumVendas]       = useState('')
  const [totalVendas,     setTotalVendas]     = useState('')
  const [totalVendasM,    setTotalVendasM]    = useState<Moeda>('EUR')
  const [gastoAnuncios,   setGastoAnuncios]   = useState('')
  const [gastoAnunciosM,  setGastoAnunciosM]  = useState<Moeda>('EUR')
  const [showTaxas,       setShowTaxas]       = useState(false)

  // Taxas configuráveis
  const [stripeP,   setStripeP]   = useState('3')      // % sobre bruto
  const [stripeF,   setStripeF]   = useState('2')      // € fixo por pedido
  const [taxaPJ,    setTaxaPJ]    = useState('15')     // % após Stripe
  const [taxaSwap,  setTaxaSwap]  = useState('3')      // % após Stripe
  const [taxaGW,    setTaxaGW]    = useState('3')      // % após Stripe

  // ─── Cálculo principal ──────────────────────────────────────────────────────

  const calc = useMemo(() => {
    const vendas        = parseInt(numVendas) || 0
    const receitaEUR    = toEurCents(totalVendas,   totalVendasM)
    const adspendEUR    = toEurCents(gastoAnuncios, gastoAnunciosM)

    if (receitaEUR <= 0) return null

    const sp  = parseVal(stripeP)  / 100
    const sf  = parseVal(stripeF)  * 100       // EUR cents per order
    const pj  = parseVal(taxaPJ)   / 100
    const sw  = parseVal(taxaSwap) / 100
    const gw  = parseVal(taxaGW)   / 100

    // Stripe
    const stripePercFee = Math.round(receitaEUR * sp)
    const stripeFixFee  = vendas > 0 ? Math.round(vendas * sf) : Math.round(receitaEUR * 0.01)  // fallback se sem nº vendas
    const stripeTotalFee= stripePercFee + stripeFixFee
    const posStripe     = receitaEUR - stripeTotalFee

    // Taxas pós-Stripe (aplicadas sobre posStripe)
    const pjFee   = Math.round(posStripe * pj)
    const swapFee = Math.round(posStripe * sw)
    const gwFee   = Math.round(posStripe * gw)
    const outrasTotal = pjFee + swapFee + gwFee

    const receitaLiquida = posStripe - outrasTotal
    const lucro          = receitaLiquida - adspendEUR

    const roas   = adspendEUR > 0 ? receitaEUR / adspendEUR : null
    const roi    = adspendEUR > 0 ? (lucro / adspendEUR) * 100 : null
    const margem = receitaEUR > 0 ? (lucro / receitaEUR) * 100 : null
    const totalTaxas = stripeTotalFee + outrasTotal

    return {
      receitaEUR,
      stripeTotalFee, stripePercFee, stripeFixFee,
      posStripe,
      pjFee, swapFee, gwFee, outrasTotal,
      receitaLiquida,
      adspendEUR,
      lucro,
      roas, roi, margem,
      totalTaxas,
      taxaEfetiva: receitaEUR > 0 ? (totalTaxas / receitaEUR) * 100 : 0,
      lucroVenda:  vendas > 0 ? Math.round(lucro / vendas) : null,
    }
  }, [numVendas, totalVendas, totalVendasM, gastoAnuncios, gastoAnunciosM,
      stripeP, stripeF, taxaPJ, taxaSwap, taxaGW])

  const isLucro   = calc && calc.lucro >= 0
  const hasAdspend = calc && calc.adspendEUR > 0

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Calculadora de Lucro</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            Simule receita, taxas, lucro, ROAS e ROI — em EUR e BRL
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary text-xs self-start sm:self-auto">
          Câmbio: <span className="text-ep-accent font-semibold">1 € = R$ {EUR_TO_BRL_RATE.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6 items-start">

        {/* ── Coluna esquerda: Inputs ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Vendas */}
          <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 space-y-4">
            <div className="flex items-center gap-2 mb-0.5">
              <ShoppingCart size={14} className="text-ep-accent" />
              <h3 className="text-ep-primary font-semibold text-sm">Vendas</h3>
            </div>

            <div>
              <label className="text-ep-secondary text-xs font-medium block mb-1.5">Número de vendas</label>
              <input
                type="number" min="0" step="1"
                value={numVendas}
                onChange={e => setNumVendas(e.target.value)}
                placeholder="Ex: 150"
                className="w-full px-3 py-2.5 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm font-semibold placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
              />
              <p className="text-ep-muted text-xs mt-1">Usado para calcular a taxa fixa do Stripe</p>
            </div>

            <CurrencyInput
              label="Receita total bruta"
              value={totalVendas}
              onChange={setTotalVendas}
              moeda={totalVendasM}
              onMoeda={setTotalVendasM}
              hint={
                totalVendas && totalVendasM === 'EUR'
                  ? `≈ ${eurToBrlStr(toEurCents(totalVendas, 'EUR'))}`
                  : totalVendas && totalVendasM === 'BRL'
                  ? `≈ ${formatEUR(toEurCents(totalVendas, 'BRL'))}`
                  : undefined
              }
            />
          </div>

          {/* Anúncios */}
          <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 space-y-4">
            <div className="flex items-center gap-2 mb-0.5">
              <Megaphone size={14} className="text-ep-warning" />
              <h3 className="text-ep-primary font-semibold text-sm">Gastos com Anúncios</h3>
            </div>

            <CurrencyInput
              label="Total investido em ads"
              value={gastoAnuncios}
              onChange={setGastoAnuncios}
              moeda={gastoAnunciosM}
              onMoeda={setGastoAnunciosM}
              hint={
                gastoAnuncios && gastoAnunciosM === 'EUR'
                  ? `≈ ${eurToBrlStr(toEurCents(gastoAnuncios, 'EUR'))}`
                  : gastoAnuncios && gastoAnunciosM === 'BRL'
                  ? `≈ ${formatEUR(toEurCents(gastoAnuncios, 'BRL'))}`
                  : undefined
              }
            />
          </div>

          {/* Taxas configuráveis */}
          <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
            <button
              onClick={() => setShowTaxas(s => !s)}
              className="w-full flex items-center justify-between px-4 md:px-5 py-3.5 hover:bg-ep-raised/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 size={13} className="text-ep-muted" />
                <span className="text-ep-primary text-sm font-semibold">Configurar Taxas</span>
              </div>
              {showTaxas ? <ChevronUp size={14} className="text-ep-muted" /> : <ChevronDown size={14} className="text-ep-muted" />}
            </button>

            {showTaxas && (
              <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-4 border-t border-ep-border-subtle pt-4">

                {/* Stripe */}
                <div>
                  <p className="text-ep-accent text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ep-accent inline-block" />
                    Stripe (sobre receita bruta)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <TaxField label="Taxa percentual" value={stripeP} onChange={setStripeP} hint="Sobre receita total" />
                    <TaxField label="Taxa fixa / pedido" value={stripeF} onChange={setStripeF} suffix="€" hint="Por nº de vendas" />
                  </div>
                </div>

                {/* Pós-Stripe */}
                <div>
                  <p className="text-ep-info text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ep-info inline-block" />
                    Pós-Stripe (sobre receita após Stripe)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <TaxField label="IRC / PJ" value={taxaPJ} onChange={setTaxaPJ} hint="Imposto s/ lucro" />
                    <TaxField label="Swap"     value={taxaSwap} onChange={setTaxaSwap} />
                    <TaxField label="Gateway"  value={taxaGW} onChange={setTaxaGW} />
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-ep-raised rounded-md">
                  <Info size={12} className="text-ep-muted flex-shrink-0 mt-0.5" />
                  <p className="text-ep-muted text-xs leading-relaxed">
                    IRC é o imposto sobre o rendimento de pessoas coletivas em Portugal (taxa base 21%, mas PME com &lt; €50k de matéria tributável paga 17%). Ajuste conforme a sua situação.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna direita: Resultados ── */}
        <div className="xl:col-span-3 space-y-4">

          {!calc ? (
            <div className="flex items-center justify-center h-48 bg-ep-surface border border-ep-border-subtle rounded-lg">
              <p className="text-ep-muted text-sm">Insira a receita total para calcular</p>
            </div>
          ) : (
            <>
              {/* Métricas principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricBadge
                  label="Lucro"
                  value={formatEUR(Math.abs(calc.lucro))}
                  sub={`≈ ${eurToBrlStr(Math.abs(calc.lucro))}`}
                  positive={calc.lucro >= 0}
                />
                {calc.roas !== null && (
                  <MetricBadge
                    label="ROAS"
                    value={`${calc.roas.toFixed(2)}×`}
                    sub={calc.roas >= 1 ? 'Retorno positivo' : 'Abaixo do breakeven'}
                    positive={calc.roas >= 1}
                  />
                )}
                {calc.roi !== null && (
                  <MetricBadge
                    label="ROI"
                    value={`${calc.roi >= 0 ? '+' : ''}${calc.roi.toFixed(1)}%`}
                    sub="Sobre ads"
                    positive={calc.roi >= 0}
                  />
                )}
                {calc.margem !== null && (
                  <MetricBadge
                    label="Margem"
                    value={`${calc.margem.toFixed(1)}%`}
                    sub="Do bruto"
                    positive={calc.margem >= 10}
                  />
                )}
              </div>

              {/* Breakdown detalhado */}
              <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5">
                <h3 className="text-ep-primary font-semibold text-sm mb-3">Breakdown Detalhado</h3>

                <div className="divide-y divide-ep-border-subtle">
                  <ResultRow
                    label="Receita bruta"
                    eurCents={calc.receitaEUR}
                    bold
                    sub={numVendas ? `${numVendas} venda${parseInt(numVendas) !== 1 ? 's' : ''}` : undefined}
                  />

                  {/* Stripe */}
                  <div className="py-1">
                    <ResultRow
                      label={`Taxa Stripe (${stripeP}% + €${stripeF}/pedido)`}
                      eurCents={calc.stripeTotalFee}
                      variant="deduct"
                      sub={`${formatEUR(calc.stripePercFee)} % + ${formatEUR(calc.stripeFixFee)} fixo`}
                    />
                  </div>

                  <ResultRow
                    label="Receita pós-Stripe"
                    eurCents={calc.posStripe}
                    bold
                    variant="default"
                  />

                  {/* Taxas pós-Stripe */}
                  <div className="py-1 space-y-0.5">
                    <ResultRow label={`IRC / PJ (${taxaPJ}%)`}  eurCents={calc.pjFee}   variant="deduct" />
                    <ResultRow label={`Swap (${taxaSwap}%)`}     eurCents={calc.swapFee} variant="deduct" />
                    <ResultRow label={`Gateway (${taxaGW}%)`}    eurCents={calc.gwFee}   variant="deduct" />
                  </div>

                  <ResultRow
                    label="Receita líquida"
                    eurCents={calc.receitaLiquida}
                    bold
                  />

                  {calc.adspendEUR > 0 && (
                    <ResultRow
                      label="Gastos com anúncios"
                      eurCents={calc.adspendEUR}
                      variant="deduct"
                    />
                  )}

                  {/* Total taxas info */}
                  <div className="pt-1 pb-0.5">
                    <div className="flex justify-between items-center py-1.5">
                      <p className="text-ep-muted text-xs">Total de taxas</p>
                      <p className="text-ep-danger text-xs font-medium">{formatEUR(calc.totalTaxas)} ({calc.taxaEfetiva.toFixed(1)}%)</p>
                    </div>
                  </div>

                  {/* Lucro final */}
                  <div className={clsx(
                    'pt-3 mt-1 rounded-lg p-3',
                    isLucro ? 'bg-ep-success/5 border border-ep-success/20' : 'bg-ep-danger/5 border border-ep-danger/20',
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isLucro
                          ? <TrendingUp  size={16} className="text-ep-success flex-shrink-0" />
                          : <TrendingDown size={16} className="text-ep-danger  flex-shrink-0" />
                        }
                        <p className={clsx('text-sm font-bold', isLucro ? 'text-ep-success' : 'text-ep-danger')}>
                          {isLucro ? 'Lucro' : 'Prejuízo'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={clsx(
                          'font-bold tabular-nums',
                          isLucro ? 'text-ep-success' : 'text-ep-danger',
                        )} style={{ fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}>
                          {isLucro ? '' : '-'}{formatEUR(Math.abs(calc.lucro))}
                        </p>
                        <p className="text-ep-muted text-xs mt-0.5">
                          ≈ {isLucro ? '' : '-'}{eurToBrlStr(Math.abs(calc.lucro))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas adicionais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ROAS / ROI detalhado */}
                {hasAdspend && calc.roas !== null && (
                  <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4">
                    <h4 className="text-ep-primary font-semibold text-sm mb-3">Performance de Ads</h4>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-ep-secondary text-xs">Investido</span>
                        <div className="text-right">
                          <p className="text-ep-primary text-xs font-semibold">{formatEUR(calc.adspendEUR)}</p>
                          <p className="text-ep-muted text-xs">≈ {eurToBrlStr(calc.adspendEUR)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ep-secondary text-xs">ROAS</span>
                        <span className={clsx('text-sm font-bold', calc.roas >= 1 ? 'text-ep-success' : 'text-ep-danger')}>
                          {calc.roas.toFixed(2)}×
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ep-secondary text-xs">ROI</span>
                        <span className={clsx('text-sm font-bold', calc.roi! >= 0 ? 'text-ep-success' : 'text-ep-danger')}>
                          {calc.roi! >= 0 ? '+' : ''}{calc.roi!.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ep-secondary text-xs">Retorno por €1 investido</span>
                        <span className="text-ep-accent text-xs font-semibold">
                          {formatEUR(Math.round((calc.lucro / calc.adspendEUR) * 100))} de lucro
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Por venda */}
                {calc.lucroVenda !== null && (
                  <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4">
                    <h4 className="text-ep-primary font-semibold text-sm mb-3">Por Venda</h4>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-ep-secondary text-xs">Ticket médio bruto</span>
                        <div className="text-right">
                          <p className="text-ep-primary text-xs font-semibold">
                            {formatEUR(Math.round(calc.receitaEUR / parseInt(numVendas)))}
                          </p>
                          <p className="text-ep-muted text-xs">
                            ≈ {eurToBrlStr(Math.round(calc.receitaEUR / parseInt(numVendas)))}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ep-secondary text-xs">Taxas por venda</span>
                        <p className="text-ep-danger text-xs font-semibold">
                          - {formatEUR(Math.round(calc.totalTaxas / parseInt(numVendas)))}
                        </p>
                      </div>
                      {hasAdspend && (
                        <div className="flex justify-between items-center">
                          <span className="text-ep-secondary text-xs">Custo de ads por venda</span>
                          <p className="text-ep-warning text-xs font-semibold">
                            - {formatEUR(Math.round(calc.adspendEUR / parseInt(numVendas)))}
                          </p>
                        </div>
                      )}
                      <div className="flex justify-between items-center border-t border-ep-border-subtle pt-2">
                        <span className="text-ep-primary text-xs font-semibold">Lucro por venda</span>
                        <div className="text-right">
                          <p className={clsx('text-xs font-bold', calc.lucroVenda >= 0 ? 'text-ep-success' : 'text-ep-danger')}>
                            {formatEUR(Math.abs(calc.lucroVenda))}
                          </p>
                          <p className="text-ep-muted text-xs">≈ {eurToBrlStr(Math.abs(calc.lucroVenda))}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Barra visual de distribuição */}
              <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5">
                <h4 className="text-ep-primary font-semibold text-sm mb-3">Distribuição da Receita</h4>
                <div className="h-3 rounded-full overflow-hidden flex">
                  {/* Lucro */}
                  {calc.receitaEUR > 0 && (
                    <>
                      <div
                        className="bg-ep-success transition-all"
                        style={{ width: `${Math.max(0, (calc.lucro / calc.receitaEUR) * 100)}%` }}
                        title={`Lucro: ${((calc.lucro / calc.receitaEUR) * 100).toFixed(1)}%`}
                      />
                      {calc.adspendEUR > 0 && (
                        <div
                          className="bg-ep-warning transition-all"
                          style={{ width: `${(calc.adspendEUR / calc.receitaEUR) * 100}%` }}
                          title={`Ads: ${((calc.adspendEUR / calc.receitaEUR) * 100).toFixed(1)}%`}
                        />
                      )}
                      <div
                        className="bg-ep-info/60 transition-all"
                        style={{ width: `${(calc.pjFee / calc.receitaEUR) * 100}%` }}
                        title="IRC/PJ"
                      />
                      <div
                        className="bg-ep-danger/60 transition-all flex-1"
                        style={{ minWidth: 0 }}
                        title="Demais taxas"
                      />
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ep-muted">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-ep-success inline-block" />Lucro</span>
                  {calc.adspendEUR > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-ep-warning inline-block" />Ads</span>}
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-ep-info/60 inline-block" />IRC/PJ</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-ep-danger/60 inline-block" />Stripe+Taxas</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
