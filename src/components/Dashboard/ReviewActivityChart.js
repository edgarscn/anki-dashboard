import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReviewActivityChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="mb-6">
        <h3 className="text-gray-700 font-bold">Atividade de Revisão (30 Dias)</h3>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorRevisoes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="dataVisual" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} minTickGap={20} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
            <Area type="monotone" dataKey="revisoes" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevisoes)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
