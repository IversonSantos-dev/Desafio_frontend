import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Loader2, RotateCcw, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrder } from '@/features/orders/hooks/useOrders'

export const Route = createFileRoute('/_auth/order-confirmation/$orderId')({
  component: OrderConfirmationComponent,
})

function OrderConfirmationComponent() {
  const { orderId } = Route.useParams()
  const navigate = useNavigate()
  const { data: order, isLoading, isError, refetch } = useOrder(orderId)

  if (isLoading) {
    return (
      <div className="container max-w-xl space-y-4 py-12 font-mono">
        <Skeleton className="mx-auto h-12 w-12 rounded-full bg-[#241612]" />
        <Skeleton className="mx-auto h-8 w-64 bg-[#241612]" />
        <Skeleton className="h-64 w-full rounded-2xl bg-[#241612]" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center py-12 text-center font-mono">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">Pedido Não Encontrado</h1>
        <p className="mt-1 text-xs text-[#9E8C7E]">
          Não foi possível localizar o pedido com o identificador #{orderId}.
        </p>
        <Link to="/" className="mt-6">
          <Button className="bg-[#D28A4C] font-bold text-[#140D0A]">Voltar ao Início</Button>
        </Link>
      </div>
    )
  }

  const isConfirmed = order.status === 'confirmed'
  const isPending = order.status === 'pending'
  const isRejected = order.status === 'rejected'

  const formattedDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const shortTxHash = order.transactionHash
    ? `${order.transactionHash.slice(0, 6)}...${order.transactionHash.slice(-4)}`
    : '0xA91F...E82C'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 font-mono text-white backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-[480px] rounded-3xl border border-[#35201A] bg-[#1C120D] p-6 shadow-2xl sm:p-8">
        {/* Botão Fechar X no canto superior direito */}
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          aria-label="Fechar confirmação"
          className="absolute right-5 top-5 text-[#8C7A6B] transition-colors hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {isConfirmed && (
          <div className="space-y-6">
            {/* Ícone THANK YOU Envelope do Figma */}
            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <img
                  src="/images/thank_you_icon.png"
                  alt="Thank You"
                  className="h-16 w-16 object-contain"
                />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white">
                Pedido Confirmado!
              </h1>
              <p className="text-xs text-[#9E8C7E]">
                Seus NFTs agora estão na sua carteira
              </p>
            </div>

            {/* Linha com os 4 Dados Técnicos com Borda (Figma) */}
            <div className="grid grid-cols-4 border-y border-[#35201A] py-3 text-center text-[10px] text-[#9E8C7E]">
              <div className="border-r border-[#35201A] pr-1">
                <span className="block text-[#8C7A6B]">Hash da Transação</span>
                <span className="block truncate font-bold text-white" title={order.transactionHash || shortTxHash}>
                  {shortTxHash}
                </span>
              </div>
              <div className="border-r border-[#35201A] px-1">
                <span className="block text-[#8C7A6B]">Data</span>
                <span className="block font-bold text-white">{formattedDate}</span>
              </div>
              <div className="border-r border-[#35201A] px-1">
                <span className="block text-[#8C7A6B]">Total</span>
                <span className="block font-bold text-[#D28A4C]">{order.totalETH} ETH</span>
              </div>
              <div className="pl-1">
                <span className="block text-[#8C7A6B]">Carteira</span>
                <span className="block truncate font-bold text-white">MetaMask</span>
              </div>
            </div>

            {/* Detalhes da transação (Recibo da Transação) */}
            <div className="space-y-3">
              <span className="block text-xs font-bold text-white">
                Recibo da Transação — Detalhes
              </span>

              {/* Cabeçalho da Tabela */}
              <div className="flex justify-between border-b border-[#241612] pb-1.5 text-[11px] text-[#8C7A6B]">
                <span>NFTs</span>
                <div className="flex gap-8">
                  <span>Edições</span>
                  <span>Subtotal</span>
                </div>
              </div>

              {/* Linhas de Itens */}
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-10 w-10 shrink-0 rounded-lg border border-[#35201A] object-cover"
                      />
                      <div className="min-w-0">
                        <span className="block max-w-[170px] truncate font-bold text-white">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#8C7A6B]">ID do token: #0042</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-6">
                      <span className="text-[11px] text-[#8C7A6B]">(x {item.quantity})</span>
                      <span className="text-xs font-bold text-[#D28A4C]">
                        {(parseFloat(item.unitPriceETH) * item.quantity).toFixed(2)} ETH
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totais do Recibo */}
              <div className="space-y-1.5 border-t border-[#241612] pt-3 text-xs text-[#9E8C7E]">
                <div className="flex justify-between">
                  <span>Taxa de rede</span>
                  <span className="font-bold text-white">{order.networkFeeETH} ETH</span>
                </div>
                <div className="flex items-baseline justify-between pt-1 text-sm font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-base text-[#D28A4C]">{order.totalETH} ETH</span>
                </div>
              </div>

              {/* Mensagem de Confirmação */}
              <p className="pt-2 text-center text-[11px] leading-relaxed text-[#8C7A6B]">
                Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira
                conectada e registrada na rede.
              </p>
              <span className="sr-only">Snapshot congelado.</span>

              {/* Botão Ver no Etherscan */}
              <div className="flex justify-center pt-2">
                <a
                  href={`https://etherscan.io/tx/${order.transactionHash || '0x123'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#D28A4C] px-8 py-3 text-xs font-bold text-[#140F0C] shadow-lg shadow-[#D28A4C]/20 transition-all hover:bg-[#c37a3c]"
                >
                  Ver no Etherscan
                </a>
              </div>
            </div>
          </div>
        )}

        {isPending && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-white">Transação Pendente...</h2>
            <p className="text-xs text-[#9E8C7E]">
              Aguardando confirmação dos blocos na rede. Atualizará automaticamente via Socket.IO.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="gap-1 border-[#35201A] text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Verificar status
            </Button>
          </div>
        )}

        {isRejected && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive">
              <XCircle className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-white">Transação Recusada</h2>
            <p className="text-xs text-[#9E8C7E]">
              {order.rejectionReason || 'Falha na validação na rede de blockchain simulada.'}
            </p>
            <Link to="/checkout" className="inline-block pt-2">
              <Button className="bg-[#D28A4C] text-xs font-bold text-[#140D0A]">
                Tentar Novamente
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
