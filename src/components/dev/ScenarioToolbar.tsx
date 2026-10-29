import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Database,
  Radio,
  RotateCcw,
  Sliders,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { decimalAdd } from '@/lib/decimal'
import { mockDb } from '@/mocks/db'
import { broadcastNFTUpdated, broadcastOrderUpdated } from '@/mocks/socket'

function getInitialScenario() {
  const current = mockDb.getScenario()
  if (typeof window === 'undefined') return current
  const params = new URLSearchParams(window.location.search)
  const latency = params.get('mock_latency')
  const scenarioParam = params.get('mock_scenario')

  const updates: Partial<typeof current> = {}
  if (latency) {
    const latMs = parseInt(latency, 10)
    if (!isNaN(latMs)) updates.latencyMs = latMs
  }
  if (scenarioParam === 'offline') updates.simulateOffline = true
  if (scenarioParam === 'error_500') updates.forceStatus = 500
  if (scenarioParam === 'expired_401') updates.forceStatus = 401

  if (Object.keys(updates).length > 0) {
    mockDb.updateScenario(updates)
    return mockDb.getScenario()
  }
  return current
}

export function ScenarioToolbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scenario, setScenario] = useState(getInitialScenario)
  const [selectedNftId, setSelectedNftId] = useState('nft_1')

  const handleLatencyChange = (ms: number) => {
    mockDb.updateScenario({ latencyMs: ms })
    setScenario({ ...mockDb.getScenario() })
    toast.info(`Latência alterada para ${ms}ms`)
  }

  const toggleOffline = () => {
    const next = !scenario.simulateOffline
    mockDb.updateScenario({ simulateOffline: next })
    setScenario({ ...mockDb.getScenario() })
    toast[next ? 'warning' : 'success'](
      next ? 'Simulação Offline ativada' : 'Conexão restabelecida',
    )
  }

  const toggleForce500 = () => {
    const next = scenario.forceStatus === 500 ? null : 500
    mockDb.updateScenario({ forceStatus: next })
    setScenario({ ...mockDb.getScenario() })
    toast[next ? 'error' : 'info'](next ? 'Forçando erro HTTP 500' : 'Erro HTTP 500 desativado')
  }

  const toggleForce401 = () => {
    const next = scenario.forceStatus === 401 ? null : 401
    mockDb.updateScenario({ forceStatus: next })
    setScenario({ ...mockDb.getScenario() })
    toast[next ? 'error' : 'info'](next ? 'Forçando sessão expirada (401)' : 'Sessão restaurada')
  }

  const toggleForceOrderFail = () => {
    const next = !scenario.forceOrderFail
    mockDb.updateScenario({ forceOrderFail: next })
    setScenario({ ...mockDb.getScenario() })
    toast[next ? 'warning' : 'info'](next ? 'Pedidos serão recusados' : 'Criação de pedidos normal')
  }

  const handleSimulatePriceChange = () => {
    const nft = mockDb.getNFTById(selectedNftId)
    if (!nft) return
    const newPrice = decimalAdd(nft.price, '0.25')
    broadcastNFTUpdated(nft.id, { price: newPrice })
    toast.warning(`[Socket.IO] Preço de "${nft.title}" alterado para ${newPrice} ETH`)
  }

  const handleSimulateStockChange = () => {
    const nft = mockDb.getNFTById(selectedNftId)
    if (!nft) return
    const newStock = Math.max(0, nft.availableEditions - 1)
    broadcastNFTUpdated(nft.id, { availableEditions: newStock })
    toast.warning(`[Socket.IO] Estoque de "${nft.title}" atualizado para ${newStock} edições`)
  }

  const handleSimulateOrderConfirm = () => {
    const lastOrder = mockDb.getState().orders[mockDb.getState().orders.length - 1]
    if (!lastOrder) {
      toast.error('Nenhum pedido recente registrado')
      return
    }
    broadcastOrderUpdated(lastOrder.id, 'confirmed')
    toast.success(`[Socket.IO] Pedido ${lastOrder.id} confirmado com sucesso`)
  }

  const handleSimulateOrderReject = () => {
    const lastOrder = mockDb.getState().orders[mockDb.getState().orders.length - 1]
    if (!lastOrder) {
      toast.error('Nenhum pedido recente registrado')
      return
    }
    broadcastOrderUpdated(lastOrder.id, 'rejected', 'Saldo insuficiente de gás na carteira')
    toast.error(`[Socket.IO] Pedido ${lastOrder.id} recusado pela rede`)
  }

  const handleResetDb = () => {
    mockDb.reset()
    toast.success('Banco de dados simulado restaurado com sucesso!')
    setTimeout(() => window.location.reload(), 400)
  }

  return (
    <aside
      aria-label="Painel de controle de cenários e testes"
      className="fixed bottom-4 left-4 z-50"
    >
      {/* Botão Gatilho */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-purple-500/40 bg-card/90 px-3.5 py-2 text-xs font-semibold text-foreground shadow-xl backdrop-blur-md transition-transform hover:scale-105 hover:border-purple-500"
        >
          <Sliders className="h-4 w-4 text-purple-400" />
          <span>Cenários MSW</span>
          {(scenario.simulateOffline || scenario.forceStatus || scenario.latencyMs > 500) && (
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          )}
        </button>
      )}

      {/* Painel Retrátil */}
      {isOpen && (
        <div className="w-80 rounded-2xl border border-border bg-card/95 p-4 text-xs shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Sliders className="h-4 w-4 text-primary" />
              <span>Controle de Cenários (MSW)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {/* Latência de Rede */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 font-semibold text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-blue-400" />
                Latência de Rede ({scenario.latencyMs}ms)
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[0, 150, 600, 2000].map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => handleLatencyChange(ms)}
                    className={`rounded-lg py-1 text-[11px] font-medium transition-colors ${
                      scenario.latencyMs === ms
                        ? 'bg-primary font-bold text-primary-foreground'
                        : 'bg-muted/60 text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {ms === 0 ? '0ms' : `${ms}ms`}
                  </button>
                ))}
              </div>
            </div>

            {/* Injeção de Falhas */}
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 font-semibold text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                Injeção de Falhas
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={toggleOffline}
                  className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    scenario.simulateOffline
                      ? 'bg-destructive font-bold text-destructive-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {scenario.simulateOffline ? (
                    <WifiOff className="h-3 w-3" />
                  ) : (
                    <Wifi className="h-3 w-3" />
                  )}
                  {scenario.simulateOffline ? 'Offline Ativo' : 'Simular Offline'}
                </button>

                <button
                  type="button"
                  onClick={toggleForce500}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    scenario.forceStatus === 500
                      ? 'bg-destructive font-bold text-destructive-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {scenario.forceStatus === 500 ? 'Erro 500 Ativo' : 'Forçar HTTP 500'}
                </button>

                <button
                  type="button"
                  onClick={toggleForce401}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    scenario.forceStatus === 401
                      ? 'bg-amber-500 font-bold text-black'
                      : 'bg-muted/60 text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {scenario.forceStatus === 401 ? '401 Ativo' : 'Expirar Sessão (401)'}
                </button>

                <button
                  type="button"
                  onClick={toggleForceOrderFail}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    scenario.forceOrderFail
                      ? 'bg-destructive font-bold text-destructive-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {scenario.forceOrderFail ? 'Recusar Pedidos' : 'Falha em Pedidos'}
                </button>
              </div>
            </div>

            {/* Eventos Socket.IO em Tempo Real */}
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 font-semibold text-muted-foreground">
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
                Tempo Real (Socket.IO)
              </span>
              <div className="space-y-1.5">
                <select
                  aria-label="Selecionar NFT para evento Socket"
                  value={selectedNftId}
                  onChange={(e) => setSelectedNftId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/60 px-2 py-1 text-[11px] text-foreground"
                >
                  <option value="nft_1">Cyber Samurai #001</option>
                  <option value="nft_2">Ethereal Nebula #42</option>
                  <option value="nft_3">Neon Phantom #108</option>
                  <option value="nft_4">Chrono Weaver #007</option>
                </select>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleSimulatePriceChange}
                    className="flex items-center justify-center gap-1 rounded-lg bg-muted/60 py-1 text-[11px] hover:bg-accent"
                  >
                    <Zap className="h-3 w-3 text-amber-400" />
                    +0.25 ETH
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateStockChange}
                    className="flex items-center justify-center gap-1 rounded-lg bg-muted/60 py-1 text-[11px] hover:bg-accent"
                  >
                    <Zap className="h-3 w-3 text-red-400" />
                    -1 Estoque
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleSimulateOrderConfirm}
                    className="rounded-lg bg-emerald-500/10 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20"
                  >
                    Confirmar Pedido
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateOrderReject}
                    className="rounded-lg bg-destructive/10 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/20"
                  >
                    Recusar Pedido
                  </button>
                </div>
              </div>
            </div>

            {/* Reset do Banco de Dados */}
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={handleResetDb}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 py-2 text-xs font-semibold text-foreground hover:bg-accent"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <Database className="h-3.5 w-3.5 text-purple-400" />
                Restaurar Banco de Dados
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
