export const processRetentionMetrics = (cardsInfo) => {
  let totalReps = 0;
  let totalLapses = 0;

  const retentionBrackets = { '0-50%': 0, '51-70%': 0, '71-85%': 0, '86-100%': 0 };

  cardsInfo.forEach(card => {
    if (card.reps > 0) {
      totalReps += card.reps;
      totalLapses += card.lapses;
      const hits = card.reps - card.lapses;
      const retention = (hits / card.reps) * 100;
      if (retention <= 50) retentionBrackets['0-50%']++;
      else if (retention <= 70) retentionBrackets['51-70%']++;
      else if (retention <= 85) retentionBrackets['71-85%']++;
      else retentionBrackets['86-100%']++;
    }
  });

  const totalHits = totalReps - totalLapses;
  const globalRetention = totalReps > 0 ? ((totalHits / totalReps) * 100).toFixed(1) : 0;

  const chartData = [
    { name: 'Crítico (0-50%)', cartoes: retentionBrackets['0-50%'], fill: '#ef4444' },
    { name: 'Atenção (51-70%)', cartoes: retentionBrackets['51-70%'], fill: '#f59e0b' },
    { name: 'Bom (71-85%)', cartoes: retentionBrackets['71-85%'], fill: '#3b82f6' },
    { name: 'Excelente (86-100%)', cartoes: retentionBrackets['86-100%'], fill: '#10b981' },
  ];

  return { totalReps, totalLapses, totalHits, globalRetention, chartData };
};

export const processReviewActivity = (rawData) => {
  const dataMap = {};
  rawData.forEach(([dateStr, count]) => {
    dataMap[dateStr] = count;
  });

  const chartData = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const displayDate = `${day}/${month}`;
    
    chartData.push({
      dataVisual: displayDate,
      dataCompleta: dateStr,
      revisoes: dataMap[dateStr] || 0
    });
  }
  return chartData;
};
