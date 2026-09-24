import React, { useState, useEffect } from 'react';
import '../styles/global.css';
import { ankiService } from '../services/ankiConnect';
import { processRetentionMetrics, processReviewActivity } from '../utils/ankiDataProcessor';
import RetentionChart from '../components/Dashboard/RetentionChart';
import ReviewActivityChart from '../components/Dashboard/ReviewActivityChart';

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState('');
  
  const [metrics, setMetrics] = useState({
    dueToday: 0,
    advanced: null,
    activity: null,
    loading: false
  });

  useEffect(() => {
    async function initializeDashboard() {
      setLoading(true);
      const isOnline = await ankiService.checkConnection();
      setIsConnected(isOnline);

      if (isOnline) {
        const deckNames = await ankiService.getDeckNames();
        setDecks(deckNames);
      }
      setLoading(false);
    }
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (!selectedDeck) return;

    async function fetchAdvancedMetrics() {
      setMetrics(prev => ({ ...prev, loading: true }));
      try {
        const [dueCardsIds, allCardIds, rawActivityData] = await Promise.all([
          ankiService.getCardsToReview(selectedDeck),
          ankiService.invokeAnki('findCards', { query: `deck:"${selectedDeck}"` }),
          ankiService.getReviewActivity()
        ]);

        const activityChartData = processReviewActivity(rawActivityData);
        let processedData = null;
        
        if (allCardIds.length > 0) {
            const cardsInfo = await ankiService.getCardsInfo(allCardIds);
            processedData = processRetentionMetrics(cardsInfo);
        }

        setMetrics({
          dueToday: dueCardsIds.length,
          advanced: processedData,
          activity: activityChartData,
          loading: false
        });
      } catch (err) {
        console.error("Erro ao buscar métricas", err);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    }

    fetchAdvancedMetrics();
  }, [selectedDeck]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <header className="mb-8 flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Anki Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Métricas de Desempenho e Retenção</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">AnkiConnect:</span>
          {isConnected ? (
            <span className="flex items-center text-green-600 bg-green-100 px-3 py-1 rounded-full text-xs font-bold">
              Online
            </span>
          ) : (
            <span className="flex items-center text-red-600 bg-red-100 px-3 py-1 rounded-full text-xs font-bold">
              Offline
            </span>
          )}
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Conectando...</div>
      ) : !isConnected ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-md shadow-sm">
          <h2 className="text-red-800 font-bold text-lg mb-2">Sem conexão com o Anki</h2>
          <p className="text-red-700">Verifique se o Anki e o AnkiConnect estão abertos na porta 8765 e o CORS configurado.</p>
        </div>
      ) : (
        <main>
          <section className="mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Baralho</label>
            <select 
              className="w-full md:w-1/3 border-gray-300 rounded-md p-2 bg-gray-50 outline-none focus:border-blue-500 focus:ring-blue-500 shadow-sm"
              value={selectedDeck}
              onChange={(e) => setSelectedDeck(e.target.value)}
            >
              <option value="">-- Escolha um baralho --</option>
              {decks.map(deck => (
                <option key={deck} value={deck}>{deck}</option>
              ))}
            </select>
          </section>

          {selectedDeck && metrics.loading ? (
            <div className="text-blue-500 animate-pulse mt-8">Analisando histórico de todos os cartões...</div>
          ) : selectedDeck && metrics.advanced && (
            <div className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-l-blue-500">
                  <p className="text-gray-500 text-xs font-bold uppercase">Revisões Pendentes</p>
                  <p className="text-3xl font-black text-gray-800 mt-2">{metrics.dueToday}</p>
                </div>
                <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-l-emerald-500">
                  <p className="text-gray-500 text-xs font-bold uppercase">Retenção Global</p>
                  <p className="text-3xl font-black text-gray-800 mt-2">{metrics.advanced.globalRetention}%</p>
                </div>
                <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-l-green-400">
                  <p className="text-gray-500 text-xs font-bold uppercase">Total Acertos (Reps)</p>
                  <p className="text-3xl font-black text-gray-800 mt-2">{metrics.advanced.totalHits}</p>
                </div>
                <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-l-red-500">
                  <p className="text-gray-500 text-xs font-bold uppercase">Total Erros (Lapses)</p>
                  <p className="text-3xl font-black text-gray-800 mt-2">{metrics.advanced.totalLapses}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <RetentionChart data={metrics.advanced.chartData} />
                {metrics.activity && <ReviewActivityChart data={metrics.activity} />}
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
