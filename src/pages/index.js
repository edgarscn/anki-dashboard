import React, { useState, useEffect } from 'react';
import '../styles/global.css';
import { ankiService } from '../services/ankiConnect';
import { processRetentionMetrics, processReviewActivity } from '../utils/ankiDataProcessor';
import RetentionChart from '../components/Dashboard/RetentionChart';
import ReviewActivityChart from '../components/Dashboard/ReviewActivityChart';

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Opções de Filtro
  const [decks, setDecks] = useState([]);
  const [tags, setTags] = useState([]);
  
  // Estado do Filtro Ativo
  const [filters, setFilters] = useState({
    deck: '',
    tag: '',
    orderBy: 'retention_asc'
  });
  
  const [metrics, setMetrics] = useState({
    dueToday: 0,
    advanced: null,
    activity: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    async function initializeDashboard() {
      setLoading(true);
      const isOnline = await ankiService.checkConnection();
      setIsConnected(isOnline);

      if (isOnline) {
        const [deckNames, allTags] = await Promise.all([
          ankiService.getDeckNames(),
          ankiService.getTags()
        ]);
        setDecks(deckNames);
        setTags(allTags.filter(t => !t.startsWith('leech')));
      }
      setLoading(false);
    }
    initializeDashboard();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!filters.deck && !filters.tag) return;

    async function fetchAdvancedMetrics() {
      setMetrics(prev => ({ ...prev, loading: true, error: null }));
      try {
        let queryParts = [];
        if (filters.deck) queryParts.push(`deck:"${filters.deck}"`);
        if (filters.tag) queryParts.push(`tag:"${filters.tag}"`);
        const query = queryParts.join(' ');

        const [dueCardsIds, allCardIds, rawActivityData] = await Promise.all([
          ankiService.getCardsToReview(query),
          ankiService.findCards(query),
          ankiService.getReviewActivity()
        ]);

        const activityChartData = processReviewActivity(rawActivityData);
        let processedData = null;
        
        if (allCardIds.length > 0) {
            // Usa chunking para não estourar o limite de payload
            const cardsInfo = await ankiService.getCardsInfoChunked(allCardIds);
            processedData = processRetentionMetrics(cardsInfo, filters.orderBy);
        }

        setMetrics({
          dueToday: dueCardsIds.length,
          advanced: processedData,
          activity: activityChartData,
          loading: false,
          error: null
        });
      } catch (err) {
        console.error("Erro ao buscar métricas:", err);
        setMetrics(prev => ({ ...prev, loading: false, error: err.message }));
      }
    }

    fetchAdvancedMetrics();
  }, [filters.deck, filters.tag, filters.orderBy]);

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Sidebar Lateral */}
      <aside className="w-72 bg-gray-900 text-white flex flex-col shadow-xl flex-shrink-0 z-20">
        <div className="p-6 text-center border-b border-gray-800">
          <h1 className="text-2xl font-black tracking-wider text-blue-400">ANKI<span className="text-white">DASH</span></h1>
          <p className="text-xs text-gray-400 mt-1">v2.0 PRO</p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-xs uppercase font-bold text-gray-500 mb-4">Painel de Filtros</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Baralho Alvo</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filters.deck}
              onChange={(e) => handleFilterChange('deck', e.target.value)}
            >
              <option value="">-- Todos os Baralhos --</option>
              {decks.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Filtrar por Tag</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filters.tag}
              onChange={(e) => handleFilterChange('tag', e.target.value)}
            >
              <option value="">-- Todas as Tags --</option>
              {tags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Ordenar Cartões Críticos</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filters.orderBy}
              onChange={(e) => handleFilterChange('orderBy', e.target.value)}
            >
              <option value="retention_asc">Menor Retenção Primeiro</option>
              <option value="lapses_desc">Mais Erros Primeiro</option>
            </select>
          </div>
          
          <button 
            onClick={() => setFilters({deck: '', tag: '', orderBy: 'retention_asc'})}
            className="w-full mt-4 border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm py-2 rounded-md transition"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-between items-center text-xs">
          <span>Status do Motor:</span>
          {isConnected ? (
             <span className="flex items-center text-green-400 font-bold">
               <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span> Online
             </span>
          ) : (
             <span className="text-red-400 font-bold">Offline</span>
          )}
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-white p-6 shadow-sm flex justify-between items-center z-10 sticky top-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Visão Geral de Desempenho</h2>
            <p className="text-sm text-gray-500">
              {filters.deck || filters.tag ? "Análise Profunda ativada" : "Selecione um filtro na barra lateral"}
            </p>
          </div>
        </header>

        <div className="p-8 flex-1 bg-gray-50">
          {loading ? (
            <div className="flex h-full items-center justify-center text-gray-400">Verificando conexão com a API do Anki...</div>
          ) : !isConnected ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-md shadow-sm max-w-2xl mx-auto mt-10">
              <h2 className="text-red-800 font-bold text-lg mb-2">Conexão Local Perdida</h2>
              <p className="text-red-700 text-sm">O dashboard web não conseguiu conversar com o seu Anki. Isso pode ocorrer por dois motivos no Netlify:</p>
              <ol className="list-decimal ml-5 mt-4 text-red-700 text-sm space-y-2">
                <li>O aplicativo Anki está fechado na sua máquina.</li>
                <li>Restrição de Conteúdo Inseguro (HTTPS vs HTTP): Vá no cadeado na barra do seu navegador e <strong>permita conteúdo inseguro</strong> para que o site HTTPS consiga puxar dados do seu localhost.</li>
              </ol>
            </div>
          ) : metrics.loading ? (
             <div className="flex h-full flex-col items-center justify-center text-blue-500">
               <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
               <p className="font-medium animate-pulse">Varrendo banco de dados e calculando estatísticas...</p>
             </div>
          ) : metrics.error ? (
             <div className="bg-red-50 text-red-700 p-6 rounded-md shadow-sm">
               <h3 className="font-bold mb-2">Erro de Processamento</h3>
               <p>{metrics.error}</p>
             </div>
          ) : (!filters.deck && !filters.tag) ? (
             <div className="flex h-full items-center justify-center text-center">
               <div className="text-gray-400 max-w-md">
                 <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                 <p className="text-lg font-medium text-gray-600">Nenhum alvo selecionado</p>
                 <p className="text-sm mt-2">Utilize os filtros na barra lateral à esquerda para iniciar o motor analítico e renderizar os gráficos.</p>
               </div>
             </div>
          ) : !metrics.advanced ? (
             <div className="text-center py-20 text-gray-500">Nenhum cartão encontrado para estes filtros.</div>
          ) : (
            <div>
              {/* Cards Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-blue-500 transition hover:shadow-md">
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pendentes Hoje</p>
                    <p className="text-3xl font-black text-gray-800 mt-1">{metrics.dueToday}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-emerald-500 transition hover:shadow-md">
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Retenção Global</p>
                    <p className="text-3xl font-black text-gray-800 mt-1">{metrics.advanced.globalRetention}%</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-indigo-500 transition hover:shadow-md">
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total de Revisões</p>
                    <p className="text-3xl font-black text-gray-800 mt-1">{metrics.advanced.totalReps}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-red-500 transition hover:shadow-md">
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Esquecimentos</p>
                    <p className="text-3xl font-black text-gray-800 mt-1">{metrics.advanced.totalLapses}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </div>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <RetentionChart data={metrics.advanced.chartData} />
                {metrics.activity && <ReviewActivityChart data={metrics.activity} />}
              </div>

              {/* Tabela de Cartões Críticos */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">🔥 Top 10 Cartões Críticos</h3>
                    <p className="text-sm text-gray-500">Cartões que mais sugam sua energia. Hora de suspendê-los ou reescrevê-los.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="p-4 font-semibold">Conteúdo do Cartão (Frente)</th>
                        <th className="p-4 font-semibold text-center w-32">Erros</th>
                        <th className="p-4 font-semibold text-center w-32">Revisões</th>
                        <th className="p-4 font-semibold text-center w-32">Retenção</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                      {metrics.advanced.criticalCards.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-8 text-center text-gray-500">Nenhum erro registrado neste filtro. Excelente!</td>
                        </tr>
                      ) : (
                        metrics.advanced.criticalCards.map((card) => {
                          const cleanText = card.question.replace(/<[^>]+>/g, '').substring(0, 120) + '...';
                          
                          return (
                            <tr key={card.id} className="hover:bg-gray-50 transition">
                              <td className="p-4">
                                <div className="font-medium text-gray-800" dangerouslySetInnerHTML={{__html: cleanText}}></div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-md font-bold">{card.lapses}</span>
                              </td>
                              <td className="p-4 text-center text-gray-600">{card.reps}</td>
                              <td className="p-4 text-center">
                                <span className={`inline-block px-2 py-1 rounded-md font-bold ${
                                  card.retention < 60 ? 'bg-red-50 text-red-600' : 
                                  card.retention < 80 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                                }`}>
                                  {card.retention}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
